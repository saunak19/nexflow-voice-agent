"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

const createBatchSchema = z.object({
  name: z.string().min(2, "Name is required"),
  agentId: z.string().min(1, "Agent is required"),
  totalCalls: z.coerce.number().int().min(1, "At least 1 call is required"),
});

export async function createBatchAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const parsed = createBatchSchema.parse({
    name: formData.get("name"),
    agentId: formData.get("agentId"),
    totalCalls: formData.get("totalCalls"),
  });

  await prisma.batch.create({
    data: {
      tenantId,
      agentId: parsed.agentId,
      name: parsed.name,
      totalCalls: parsed.totalCalls,
      status: "queued",
    },
  });

  revalidatePath("/dashboard/batches");
  redirect("/dashboard/batches");
}

export async function toggleBatchStatusAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const id = String(formData.get("id") || "");
  const nextStatus = String(formData.get("nextStatus") || "queued");

  await prisma.batch.updateMany({
    where: {
      id,
      tenantId,
    },
    data: {
      status: nextStatus,
    },
  });

  revalidatePath("/dashboard/batches");
}
