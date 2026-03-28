"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

const createSipTrunkSchema = z.object({
  name: z.string().min(2, "Name is required"),
  inboundUrl: z.string().optional(),
  outboundUrl: z.string().optional(),
  bolnaTrunkId: z.string().optional(),
});

export async function createSipTrunkAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const parsed = createSipTrunkSchema.parse({
    name: formData.get("name"),
    inboundUrl: formData.get("inboundUrl") || undefined,
    outboundUrl: formData.get("outboundUrl") || undefined,
    bolnaTrunkId: formData.get("bolnaTrunkId") || undefined,
  });

  await prisma.sipTrunk.create({
    data: {
      tenantId,
      name: parsed.name,
      inboundUrl: parsed.inboundUrl,
      outboundUrl: parsed.outboundUrl,
      bolnaTrunkId: parsed.bolnaTrunkId,
    },
  });

  revalidatePath("/dashboard/sip-trunks");
  redirect("/dashboard/sip-trunks");
}

export async function deleteSipTrunkAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const id = String(formData.get("id") || "");

  await prisma.sipTrunk.deleteMany({
    where: {
      id,
      tenantId,
    },
  });

  revalidatePath("/dashboard/sip-trunks");
}
