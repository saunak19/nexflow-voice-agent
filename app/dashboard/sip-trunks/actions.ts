"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { bolnaClient } from "@/lib/bolna-client";

const createSipTrunkSchema = z.object({
  name: z.string().min(2, "Name is required"),
  inboundUrl: z.string().optional(),
  outboundUrl: z.string().optional(),
});

export async function createSipTrunkAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);

    const parsed = createSipTrunkSchema.parse({
      name: formData.get("name"),
      inboundUrl: formData.get("inboundUrl") || undefined,
      outboundUrl: formData.get("outboundUrl") || undefined,
    });

    // ── Call Bolna SIP API ──────────────────────────────────────────────────
    const bolnaResponse = await bolnaClient.createSipTrunk({
      name: parsed.name,
      inbound_uri: parsed.inboundUrl,
      outbound_uri: parsed.outboundUrl,
    });

    // ── Persist with auto-filled bolnaTrunkId ──────────────────────────────
    await prisma.sipTrunk.create({
      data: {
        tenantId,
        name: parsed.name,
        inboundUrl: parsed.inboundUrl,
        outboundUrl: parsed.outboundUrl,
        bolnaTrunkId: bolnaResponse.trunk_id,
      },
    });

    revalidatePath("/dashboard/sip-trunks");
    redirect("/dashboard/sip-trunks");
  } catch (error) {
    console.error("[createSipTrunkAction]:", error);
    throw new Error("Failed to create SIP trunk. Please try again.");
  }
}

export async function deleteSipTrunkAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const id = String(formData.get("id") ?? "");

    const trunk = await prisma.sipTrunk.findFirst({ where: { id, tenantId } });
    if (!trunk) throw new Error("SIP trunk not found");

    // ── Delete from Bolna first (best-effort) ─────────────────────────────
    if (trunk.bolnaTrunkId) {
      try {
        await bolnaClient.deleteSipTrunk(trunk.bolnaTrunkId);
      } catch (bolnaErr) {
        console.error("[deleteSipTrunkAction] Bolna deletion failed:", bolnaErr);
        // Continue to delete from Prisma even if Bolna fails
      }
    }

    await prisma.sipTrunk.delete({ where: { id: trunk.id } });
    revalidatePath("/dashboard/sip-trunks");
  } catch (error) {
    console.error("[deleteSipTrunkAction]:", error);
    throw new Error("Failed to delete SIP trunk. Please try again.");
  }
}
