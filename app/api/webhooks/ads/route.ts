import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdsWebhookEvent, recordAdsWebhookEvent } from "@/lib/ads-webhook-events";
import prisma from "@/lib/db";
import { getTenantAdsWebhookConfigBySecret } from "@/lib/tenant-ads-webhook-config";
import { assertTenantOwnsPhoneNumber, normalizePhoneNumber } from "@/lib/tenant-phone-numbers";
import { getTenantVoiceProvider } from "@/lib/voice-providers";

const adsWebhookSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  tenant_id: z.string().trim().min(1).optional(),
  agentId: z.string().trim().min(1).optional(),
  agent_id: z.string().trim().min(1).optional(),
  phoneNumber: z.string().trim().min(1).optional(),
  phone_number: z.string().trim().min(1).optional(),
  fromNumber: z.string().trim().min(1).optional(),
  from_number: z.string().trim().min(1).optional(),
  leadId: z.string().trim().min(1).optional(),
  lead_id: z.string().trim().min(1).optional(),
  adId: z.string().trim().min(1).optional(),
  ad_id: z.string().trim().min(1).optional(),
  adName: z.string().trim().min(1).optional(),
  ad_name: z.string().trim().min(1).optional(),
  campaignId: z.string().trim().min(1).optional(),
  campaign_id: z.string().trim().min(1).optional(),
  formId: z.string().trim().min(1).optional(),
  form_id: z.string().trim().min(1).optional(),
  pageId: z.string().trim().min(1).optional(),
  page_id: z.string().trim().min(1).optional(),
  userData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  user_data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

function hashValue(value: string) {
  return createHash("sha256").update(value).digest();
}

function secretsMatch(expected: string, received: string) {
  return timingSafeEqual(hashValue(expected), hashValue(received));
}

async function resolveWebhookAuthorization(request: NextRequest) {
  const receivedSecret = request.headers.get("x-ads-webhook-secret")?.trim();

  if (receivedSecret) {
    const tenantConfig = await getTenantAdsWebhookConfigBySecret(receivedSecret);
    if (tenantConfig) {
      return { mode: "tenant" as const, tenantConfig };
    }
  }

  const fallbackSecret = process.env.ADS_WEBHOOK_SECRET;
  if (fallbackSecret && receivedSecret && secretsMatch(fallbackSecret, receivedSecret)) {
    return { mode: "legacy" as const, tenantConfig: null };
  }

  const allowUnsigned = process.env.NODE_ENV !== "production" && !receivedSecret && !fallbackSecret;
  if (allowUnsigned) {
    console.warn("[ADS WEBHOOK] No webhook secret configured. Accepting unsigned request in non-production.");
    return { mode: "unsigned" as const, tenantConfig: null };
  }

  if (!receivedSecret && !fallbackSecret) {
    console.warn("[ADS WEBHOOK] ADS_WEBHOOK_SECRET is not set. Rejecting request.");
  }

  return null;
}

function extractCallIdentifier(response: unknown) {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const candidate = response as Record<string, unknown>;
  const possibleId =
    candidate.call_id ??
    candidate.callId ??
    candidate.execution_id ??
    candidate.executionId ??
    candidate.id;

  return typeof possibleId === "string" && possibleId.trim() ? possibleId : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await resolveWebhookAuthorization(request);
    if (!authorization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsedBody = adsWebhookSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsedBody.data;
    const payloadTenantId = payload.tenantId ?? payload.tenant_id;
    const payloadAgentId = payload.agentId ?? payload.agent_id;
    const phoneNumber = payload.phoneNumber ?? payload.phone_number;
    const payloadFromNumber = payload.fromNumber ?? payload.from_number;
    const leadId = payload.leadId ?? payload.lead_id;
    const adId = payload.adId ?? payload.ad_id;
    const adName = payload.adName ?? payload.ad_name;
    const campaignId = payload.campaignId ?? payload.campaign_id;
    const formId = payload.formId ?? payload.form_id;
    const pageId = payload.pageId ?? payload.page_id;
    const userData = payload.userData ?? payload.user_data ?? {};

    const configuredTenantId = authorization.tenantConfig?.tenant_id ?? null;
    const configuredAgentId = authorization.tenantConfig?.agent_id ?? null;
    const configuredFromNumber = authorization.tenantConfig?.from_phone_number ?? null;

    if (configuredTenantId && payloadTenantId && payloadTenantId !== configuredTenantId) {
      return NextResponse.json(
        { error: "Payload tenant does not match the configured webhook secret." },
        { status: 403 }
      );
    }

    const tenantId = configuredTenantId ?? payloadTenantId;
    const agentReference = payloadAgentId ?? configuredAgentId;
    const fromNumber = payloadFromNumber ?? configuredFromNumber;

    if (authorization.tenantConfig && authorization.tenantConfig.enabled === false) {
      return NextResponse.json(
        { error: "Lead automation is disabled for this workspace." },
        { status: 409 }
      );
    }

    if (!tenantId || !agentReference || !phoneNumber) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber plus a configured or provided tenant/agent." },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findFirst({
      where: {
        tenantId,
        OR: [{ id: agentReference }, { bolnaAgentId: agentReference }],
      },
      select: {
        id: true,
        bolnaAgentId: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found for this workspace" },
        { status: 404 }
      );
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    let normalizedFromPhoneNumber: string | undefined;

    if (fromNumber) {
      normalizedFromPhoneNumber = normalizePhoneNumber(fromNumber);
      await assertTenantOwnsPhoneNumber(tenantId, normalizedFromPhoneNumber);
    }

    if (authorization.tenantConfig && !normalizedFromPhoneNumber) {
      return NextResponse.json(
        { error: "No caller ID is configured for this workspace. Save a From Number in Lead Automation settings." },
        { status: 400 }
      );
    }

    if (leadId) {
      const existingLead = await getAdsWebhookEvent(tenantId, leadId);
      if (existingLead) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: "Lead already processed",
          call_id: existingLead.provider_call_id,
        });
      }
    }

    const voiceProvider = await getTenantVoiceProvider(tenantId);
    const providerResponse = await voiceProvider.triggerCall({
      agent_id: agent.bolnaAgentId,
      recipient_phone_number: normalizedPhoneNumber,
      from_phone_number: normalizedFromPhoneNumber,
      user_data: {
        ...userData,
        ad_id: adId ?? userData.ad_id ?? "unknown",
        creative_name: adName ?? userData.creative_name ?? "Organic",
        campaign_id: campaignId ?? userData.campaign_id,
        form_id: formId ?? userData.form_id,
        page_id: pageId ?? userData.page_id,
        lead_id: leadId ?? userData.lead_id,
      },
    });

    const providerCallId = extractCallIdentifier(providerResponse);

    if (!providerCallId) {
      throw new Error("Voice provider did not return a call identifier.");
    }

    const execution = await prisma.$transaction(async (tx) => {
      const createdExecution = await tx.callExecution.create({
        data: {
          tenantId,
          agentId: agent.id,
          bolnaExecutionId: providerCallId,
          phoneNumber: normalizedPhoneNumber,
          status: "queued",
          adId,
          creativeName: adName,
        },
      });

      await tx.callLog.create({
        data: {
          tenantId,
          callExecutionId: createdExecution.id,
          event: "ads_webhook_received",
          payload: {
            leadId: leadId ?? null,
            adId: adId ?? null,
            adName: adName ?? null,
            campaignId: campaignId ?? null,
            formId: formId ?? null,
            pageId: pageId ?? null,
            source: "custom_ads_webhook",
          },
        },
      });

      return createdExecution;
    });

    if (leadId) {
      await recordAdsWebhookEvent({
        tenantId,
        leadId,
        agentId: agent.id,
        phoneNumber: normalizedPhoneNumber,
        adId,
        providerCallId,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Lead call triggered successfully",
      executionId: execution.id,
      call_id: providerCallId,
    });
  } catch (error) {
    console.error("[ADS WEBHOOK] Error:", error);
    return NextResponse.json({ error: "Failed to process lead" }, { status: 500 });
  }
}
