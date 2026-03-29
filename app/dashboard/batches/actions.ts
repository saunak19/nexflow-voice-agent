"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { bolnaClient } from "@/lib/bolna-client";

const createBatchSchema = z.object({
  name: z.string().min(2, "Name is required"),
  agentId: z.string().min(1, "Agent is required"),
});

export async function createBatchAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);

    const parsed = createBatchSchema.parse({
      name: formData.get("name"),
      agentId: formData.get("agentId"),
    });

    // Resolve the Bolna agent ID for this local agent
    const agent = await prisma.agent.findFirst({
      where: { id: parsed.agentId, tenantId },
      select: { bolnaAgentId: true },
    });

    if (!agent) {
      throw new Error("Agent not found for this tenant");
    }

    const csvFile = formData.get("csvFile") as File | null;
    if (!csvFile || csvFile.size === 0) {
      throw new Error("CSV file is required");
    }

    // ── Call Bolna to create the batch ──────────────────────────────────────
    const bolnaResponse = await bolnaClient.createBatch(
      agent.bolnaAgentId,
      csvFile,
      { name: parsed.name }
    );

    // ── Persist batch in local DB with Bolna's batch_id ───────────────────
    await prisma.batch.create({
      data: {
        tenantId,
        agentId: parsed.agentId,
        name: parsed.name,
        totalCalls: bolnaResponse.total_calls ?? 0,
        status: bolnaResponse.status ?? "queued",
        bolnaBatchId: bolnaResponse.batch_id,
      },
    });

    revalidatePath("/dashboard/batches");
    redirect("/dashboard/batches");
  } catch (error) {
    console.error("[createBatchAction]:", error);
    throw new Error("Failed to create batch. Please try again.");
  }
}

export async function toggleBatchStatusAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const id = String(formData.get("id") ?? "");
    const nextStatus = String(formData.get("nextStatus") ?? "queued");

    const batch = await prisma.batch.findFirst({
      where: { id, tenantId },
    });

    if (!batch) throw new Error("Batch not found");

    if (!batch.bolnaBatchId) {
      throw new Error("Batch has no Bolna ID — it was never synced with Bolna");
    }

    // ── Call Bolna first ────────────────────────────────────────────────────
    if (nextStatus === "stopped") {
      await bolnaClient.stopBatch(batch.bolnaBatchId);
    } else if (nextStatus === "in-progress") {
      await bolnaClient.scheduleBatch(batch.bolnaBatchId, new Date().toISOString());
    }

    // ── Update Prisma only after successful Bolna call ─────────────────────
    await prisma.batch.update({
      where: { id: batch.id },
      data: { status: nextStatus },
    });

    revalidatePath("/dashboard/batches");
  } catch (error) {
    console.error("[toggleBatchStatusAction]:", error);
    throw new Error("Failed to update batch status. Please try again.");
  }
}

export async function syncBatchProgressAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const id = String(formData.get("id") ?? "");

    const batch = await prisma.batch.findFirst({ where: { id, tenantId } });
    if (!batch || !batch.bolnaBatchId) throw new Error("Batch not synced");

    const batchData = await bolnaClient.getBatch(batch.bolnaBatchId);

    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: batchData.status,
        completedCalls: batchData.completed_calls ?? batch.completedCalls,
        failedCalls: batchData.failed_calls ?? batch.failedCalls,
        totalCalls: batchData.total_calls ?? batch.totalCalls,
      },
    });

    revalidatePath("/dashboard/batches");
  } catch (error) {
    console.error("[syncBatchProgressAction]:", error);
    throw new Error("Failed to sync batch progress.");
  }
}

export async function uploadBatchAction(formData: FormData) {
  try {
    const agentId = formData.get("agentId") as string;
    const file = formData.get("file") as File;
    const runType = formData.get("runType") as "now" | "schedule";
    const scheduledAt = formData.get("scheduledAt") as string;
    const webhookUrl = formData.get("webhookUrl") as string;

    if (!agentId) throw new Error("Agent is required.");
    if (!file || file.size === 0 || !file.name.endsWith('.csv')) {
      throw new Error("A valid .csv file is required.");
    }

    // 1. Upload the CSV to create the batch
    const batchResponse = await bolnaClient.createBatch(agentId, file, { name: file.name });
    
    // 2. Schedule the batch if requested
    if (runType === "schedule" && scheduledAt) {
      const isoDate = new Date(scheduledAt).toISOString();
      await bolnaClient.scheduleBatch(batchResponse.batch_id, isoDate);
    }

    // 3. (Optional) Save to local Prisma DB if you track batches locally
    // await prisma.batch.create({ ... });

  } catch (error) {
    console.error("[uploadBatchAction]:", error);
    throw new Error("Failed to upload batch. Please try again.");
  }

  revalidatePath("/dashboard/batches");
  redirect("/dashboard/batches");
}
