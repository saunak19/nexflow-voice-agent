"use server";
// Invalidate cache

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { requireTenantRole } from "@/lib/authorization";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { bolnaClient } from "@/lib/bolna-client";

const PROVIDERS = ["twilio", "plivo", "custom"] as const;
type Provider = (typeof PROVIDERS)[number];

const createSipTrunkSchema = z.object({
  name: z.string().min(2, "Trunk name must be at least 2 characters"),
  provider: z.enum(PROVIDERS).default("custom"),

  // Twilio auth
  accountSid: z.string().optional(),
  authToken:  z.string().optional(),

  // Plivo auth
  authId:     z.string().optional(),

  // Custom / generic SIP auth
  sipUsername: z.string().optional(),
  sipPassword: z.string().optional(),

  // Shared: provider domain / endpoint
  sipDomain:   z.string().optional(),

  // SIP routing URIs (sent to Bolna)
  inboundUrl:  z.string().optional(),
  outboundUrl: z.string().optional(),
});

/**
 * Build/validate the Bolna SIP payload.
 * For Twilio/Plivo we can auto-build a sensible outbound URI from the domain field
 * when the user doesn't supply one explicitly.
 */
function buildBolnaUris(
  data: z.infer<typeof createSipTrunkSchema>
): { inbound_uri?: string; outbound_uri?: string; error?: string } {
  const inbound  = data.inboundUrl?.trim()  || undefined;
  const outbound = data.outboundUrl?.trim() || undefined;

  // Auto-construct Outbound URI when a sipDomain was provided but no outboundUrl
  if (!outbound && data.sipDomain) {
    const domain = data.sipDomain.trim();
    if (data.provider === "twilio") {
      // Twilio Elastic SIP Trunk Termination URI
      return {
        inbound_uri:  inbound,
        outbound_uri: domain.includes(".") ? `sip:${domain}` : `sip:${domain}.pstn.twilio.com`,
      };
    }
    if (data.provider === "plivo") {
      // Plivo SIP endpoint
      return {
        inbound_uri:  inbound,
        outbound_uri: domain.includes(".") ? `sip:${domain}` : `sip:${domain}@sip5.plivo.com`,
      };
    }
  }

  if (!inbound && !outbound) {
    return { error: "At least one of Inbound or Outbound URI (or the SIP Domain) is required." };
  }

  return { inbound_uri: inbound, outbound_uri: outbound };
}

export async function createSipTrunkAction(
  formData: FormData
): Promise<{ error?: string } | void> {
  try {
    const session  = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);

    // Collect all form fields
    const raw: Record<string, string | undefined> = {};
    for (const key of [
      "name", "provider",
      "accountSid", "authToken", "authId",
      "sipUsername", "sipPassword", "sipDomain",
      "inboundUrl", "outboundUrl",
    ]) {
      const v = formData.get(key);
      raw[key] = typeof v === "string" && v.trim() ? v.trim() : undefined;
    }

    const parsed = createSipTrunkSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((e: z.ZodIssue) => e.message).join(", ") };
    }

    const d = parsed.data;

    // Build Bolna SIP URIs
    const { inbound_uri, outbound_uri, error: uriError } = buildBolnaUris(d);
    if (uriError) return { error: uriError };

    // Validate provider-specific auth
    if (d.provider === "twilio" && !d.accountSid) {
      return { error: "Twilio Account SID is required." };
    }
    if (d.provider === "plivo" && !d.authId) {
      return { error: "Plivo Auth ID is required." };
    }

    // ── Call Bolna SIP API ─────────────────────────────────────────────────
    let bolnaResponse: { trunk_id?: string } = {};
    try {
      bolnaResponse = await bolnaClient.createSipTrunk({
        name:         d.name,
        inbound_uri,
        outbound_uri,
      });
    } catch (bolnaErr: any) {
      // Don't block save if Bolna API is down — save locally, surface warning
      console.error("[createSipTrunkAction] Bolna API error:", bolnaErr?.message);
    }

    // ── Credentials blob (stored, never sent to client) ────────────────────
    const credentials: Record<string, string> = {};
    if (d.provider === "twilio") {
      if (d.accountSid) credentials.accountSid = d.accountSid;
      if (d.authToken)  credentials.authToken  = d.authToken;
      if (d.sipDomain)  credentials.sipDomain  = d.sipDomain;
    } else if (d.provider === "plivo") {
      if (d.authId)    credentials.authId    = d.authId;
      if (d.authToken) credentials.authToken = d.authToken;
      if (d.sipDomain) credentials.sipDomain = d.sipDomain;
    } else {
      if (d.sipUsername) credentials.sipUsername = d.sipUsername;
      if (d.sipPassword) credentials.sipPassword = d.sipPassword;
    }

    // ── Persist locally ────────────────────────────────────────────────────
    await (prisma.sipTrunk as any).create({
      data: {
        tenantId,
        name:        d.name,
        provider:    d.provider,
        inboundUrl:  inbound_uri,
        outboundUrl: outbound_uri,
        credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
        bolnaTrunkId: bolnaResponse?.trunk_id ?? null,
      },
    });

    revalidatePath("/dashboard/sip-trunks");
  } catch (error: any) {
    console.error("[createSipTrunkAction]:", error);
    const msg: string = error?.message ?? "";
    if (msg.includes("Bolna API error")) {
      return { error: `Provider rejected the request: ${msg.split(": ").slice(1).join(": ")}` };
    }
    return { error: "Failed to create SIP trunk. Please try again." };
  }
}

export async function deleteSipTrunkAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const id = String(formData.get("id") ?? "");

    const trunk = await (prisma.sipTrunk as any).findFirst({ where: { id, tenantId } });
    if (!trunk) throw new Error("SIP trunk not found");

    if (trunk.bolnaTrunkId) {
      try {
        await bolnaClient.deleteSipTrunk(trunk.bolnaTrunkId);
      } catch (bolnaErr) {
        console.error("[deleteSipTrunkAction] Bolna deletion failed:", bolnaErr);
      }
    }

    await prisma.sipTrunk.delete({ where: { id: trunk.id } });
    revalidatePath("/dashboard/sip-trunks");
  } catch (error) {
    console.error("[deleteSipTrunkAction]:", error);
    throw new Error("Failed to delete SIP trunk. Please try again.");
  }
}
