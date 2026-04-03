"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { requireTenantRole } from "@/lib/authorization";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { assertTenantOwnsPhoneNumber, normalizePhoneNumber } from "@/lib/tenant-phone-numbers";
import {
  generateTenantAdsWebhookSecret,
  getTenantAdsWebhookConfig,
  upsertTenantAdsWebhookConfig,
} from "@/lib/tenant-ads-webhook-config";

function parseEnabledFlag(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return false;
  }

  return value === "true" || value === "on" || value === "1";
}

export async function saveLeadAutomationConfigAction(formData: FormData) {
  const session = await auth();
  await requireTenantRole(session, Role.ADMIN);
  const tenantId = await getCurrentTenantId(session);

  const agentIdValue = formData.get("agentId");
  const fromNumberValue = formData.get("fromNumber");
  const enabled = parseEnabledFlag(formData.get("enabled"));

  const agentId = typeof agentIdValue === "string" && agentIdValue.trim() ? agentIdValue.trim() : null;
  let fromNumber =
    typeof fromNumberValue === "string" && fromNumberValue.trim()
      ? normalizePhoneNumber(fromNumberValue.trim())
      : null;

  if (enabled && (!agentId || !fromNumber)) {
    throw new Error("Select both an agent and a caller ID before enabling lead automation.");
  }

  if (agentId) {
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, tenantId },
      select: { id: true },
    });

    if (!agent) {
      throw new Error("Selected agent does not belong to this workspace.");
    }
  }

  if (fromNumber) {
    await assertTenantOwnsPhoneNumber(tenantId, fromNumber);
  }

  const existingConfig = await getTenantAdsWebhookConfig(tenantId);
  const webhookSecret = existingConfig?.webhook_secret ?? (await generateTenantAdsWebhookSecret());

  await upsertTenantAdsWebhookConfig({
    tenantId,
    agentId,
    fromPhoneNumber: fromNumber,
    webhookSecret,
    enabled,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/lead-automation");
}

export async function regenerateLeadAutomationSecretAction() {
  const session = await auth();
  await requireTenantRole(session, Role.ADMIN);
  const tenantId = await getCurrentTenantId(session);

  const existingConfig = await getTenantAdsWebhookConfig(tenantId);
  const nextSecret = await generateTenantAdsWebhookSecret();

  await upsertTenantAdsWebhookConfig({
    tenantId,
    agentId: existingConfig?.agent_id ?? null,
    fromPhoneNumber: existingConfig?.from_phone_number ?? null,
    webhookSecret: nextSecret,
    enabled: existingConfig?.enabled ?? false,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/lead-automation");

  return nextSecret;
}
