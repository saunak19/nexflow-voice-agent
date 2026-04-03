"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { assertTenantOwnsPhoneNumber, normalizePhoneNumber } from "@/lib/tenant-phone-numbers";
import { getTenantVoiceProvider } from "@/lib/voice-providers";

const createBatchSchema = z.object({
  name: z.string().min(2, "Name is required"),
  agentId: z.string().min(1, "Agent is required"),
});

export async function createBatchAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

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
    const bolnaResponse = await voiceProvider.createBatch(
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
    const voiceProvider = await getTenantVoiceProvider(tenantId);
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
      await voiceProvider.stopBatch(batch.bolnaBatchId);
    } else if (nextStatus === "in-progress") {
      await voiceProvider.scheduleBatch(batch.bolnaBatchId, new Date().toISOString());
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
    const voiceProvider = await getTenantVoiceProvider(tenantId);
    const id = String(formData.get("id") ?? "");

    const batch = await prisma.batch.findFirst({ where: { id, tenantId } });
    if (!batch || !batch.bolnaBatchId) throw new Error("Batch not synced");

    const batchData = await voiceProvider.getBatch(batch.bolnaBatchId);

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
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    const localAgentId = formData.get("agentId") as string;
    const file = formData.get("file") as File;
    const runType = formData.get("runType") as "now" | "schedule";
    const scheduledAt = formData.get("scheduledAt") as string;
    const webhookUrl = formData.get("webhookUrl") as string;
    const fromNumber = formData.get("fromNumber") as string;
    const countryCode = formData.get("countryCode") as string || "+91";

    if (!localAgentId) throw new Error("Agent is required.");
    if (!file || file.size === 0 || !file.name.endsWith('.csv')) {
      throw new Error("A valid .csv file is required.");
    }

    const text = await file.text();
    const rows = text.split(/\r?\n/);
    
    if (rows.length === 0 || !rows[0].trim()) {
      throw new Error("The uploaded CSV file appears to be empty.");
    }

    const headerRow = rows[0];
    const headers = headerRow.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // 2. Robust Header Detection
    const possibleHeaders = ["phone", "phonenumber", "phone_number", "contact", "contactnumber", "contact_number", "mobile", "mobilenumber", "ph"];
    let phoneColIdx = headers.findIndex(h => possibleHeaders.includes(h.replace(/[^a-z_]/g, '')));
    
    // Looser fallback matching
    if (phoneColIdx === -1) {
      phoneColIdx = headers.findIndex(h => h.includes("phone") || h.includes("contact") || h.includes("mobile"));
    }

    if (phoneColIdx === -1) {
      throw new Error("Could not find a valid phone number column in the CSV. Please ensure you have a header named 'Phone' or 'Contact'.");
    }

    // 3. Data Mutation
    const mutatedRows = [headerRow];
    for (let i = 1; i < rows.length; i++) {
      const rowStr = rows[i];
      if (!rowStr.trim()) continue; // Skip empty rows

      const columns = rowStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (columns.length > phoneColIdx) {
        let number = columns[phoneColIdx].trim().replace(/^"|"$/g, '');
        
        if (number) {
          // Strip random spaces, dashes, parentheses
          number = number.replace(/[\s\-\(\)]/g, '');
          
          // Prepend default code if it does not start with +
          if (!number.startsWith('+')) {
            // Strip any leading zeros before prepending country code
            number = `${countryCode}${number.replace(/^0+/, '')}`;
          }

          const e164Regex = /^\+[1-9]\d{1,14}$/;
          if (!e164Regex.test(number)) {
            throw new Error(`Row ${i + 1}: Invalid phone number format '${columns[phoneColIdx]}'. Expected E.164 format (e.g., +919876543210).`);
          }

          // Update column value with properly formatted E.164 string
          columns[phoneColIdx] = `"${number}"`;
        }
      }
      mutatedRows.push(columns.join(','));
    }
    
    // 4. Reconstruct the File
    const fixedFile = new File([mutatedRows.join('\n')], file.name, { type: "text/csv" });

    const agent = await prisma.agent.findFirst({
      where: { id: localAgentId, tenantId },
      select: { bolnaAgentId: true },
    });
    
    if (!agent) throw new Error("Agent not found.");

    const metadata: { name?: string; from_number?: string } = {
      name: file.name.replace(".csv", ""),
    };

    if (fromNumber && fromNumber !== "bolna_managed" && fromNumber !== "agent_owned") {
      const normalizedFromNumber = normalizePhoneNumber(fromNumber);
      await assertTenantOwnsPhoneNumber(tenantId, normalizedFromNumber);
      metadata.from_number = normalizedFromNumber;
      console.log("[uploadBatchAction] Using from_number:", normalizedFromNumber);
    }

    // 1. Upload the CSV to create the batch
    const batchResponse = await voiceProvider.createBatch(agent.bolnaAgentId, fixedFile, metadata);
    
    // 2. Schedule the batch if requested
    if (runType === "schedule" && scheduledAt) {
      const isoDate = new Date(scheduledAt).toISOString();
      await voiceProvider.scheduleBatch(batchResponse.batch_id, isoDate);
    } else if (runType === "now") {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 3); // Bolna requires >2 minutes
      await voiceProvider.scheduleBatch(batchResponse.batch_id, futureDate.toISOString());
    }

    // 3. (Optional) Save to local Prisma DB if you track batches locally
    // await prisma.batch.create({ ... });

  } catch (error) {
    console.error("[uploadBatchAction]:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to upload batch. Please try again.");
  }

  revalidatePath("/dashboard/batches");
  redirect("/dashboard/batches");
}

export async function deleteBatchAction(batchId: string) {
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    await voiceProvider.deleteBatch(batchId);

    await prisma.batch.deleteMany({
      where: { bolnaBatchId: batchId, tenantId },
    });

    revalidatePath("/dashboard/batches");
    return { success: true };
  } catch (error) {
    console.error("[deleteBatchAction]:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete batch. Please try again." };
  }
}

export async function runBatchNowAction(batchId: string) {
  try {
    const voiceProvider = await getTenantVoiceProvider();
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 3); // Bolna requires >2 minutes
    
    await voiceProvider.scheduleBatch(batchId, futureDate.toISOString());
    // Also trigger revalidation
    revalidatePath("/dashboard/batches");
    return { success: true };
  } catch (error) {
    console.error("[runBatchNowAction]:", error);
    return { success: false, error: "Failed to run batch. Please try again." };
  }
}

export async function stopBatchAction(batchId: string) {
  try {
    const voiceProvider = await getTenantVoiceProvider();
    await voiceProvider.stopBatch(batchId);
    revalidatePath("/dashboard/batches");
    return { success: true };
  } catch (error) {
    console.error("[stopBatchAction]:", error);
    return { success: false, error: "Failed to stop batch. Please try again." };
  }
}

export async function getBatchCallLogUrl(batchId: string) {
  return `https://api.bolna.ai/batches/${batchId}/executions/download`;
}
