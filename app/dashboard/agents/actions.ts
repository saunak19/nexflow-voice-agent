"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { bolnaClient, createBolnaAgent } from "@/lib/bolna-client";

// ─── Create Agent ─────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ["en", "hi", "gu", "mr", "bn", "ta", "te"] as const;

const createAgentSchema = z.object({
  name: z.string().min(2, "Agent name must be at least 2 characters"),
  prompt: z.string().min(10, "System prompt must be at least 10 characters"),
  language: z.enum(SUPPORTED_LANGUAGES, { message: "Please select a valid language" }),
  voiceId: z.string().min(1, "Please select a voice"),
});

export async function createAgentAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);

    const parsed = createAgentSchema.parse({
      name: formData.get("name"),
      prompt: formData.get("prompt"),
      language: formData.get("language"),
      voiceId: formData.get("voiceId"),
    });

    // ── Validate the voice_id against real registered voices from Bolna ───────
    const availableVoices = await bolnaClient.listVoices();
    const selectedVoice = availableVoices.find(
      (v) => v.voice_id === parsed.voiceId && v.provider === "sarvam"
    );
    if (!selectedVoice) {
      throw new Error(
        `Voice ID "${parsed.voiceId}" is not registered in your Bolna account. ` +
        `Available Sarvam voices: ${availableVoices
          .filter((v) => v.provider === "sarvam")
          .map((v) => `${v.name} (${v.voice_id})`)
          .join(", ") || "none — add voices in the Bolna dashboard first"}`
      );
    }

    // ── Create the fully-configured agent in Bolna ─────────────────────────
    const { agent_id: bolnaAgentId } = await createBolnaAgent({
      name: parsed.name,
      prompt: parsed.prompt,
      language: parsed.language,
      voiceId: parsed.voiceId,
    });

    // ── Persist to database ────────────────────────────────────────────────
    await prisma.agent.create({
      data: {
        tenantId,
        name: parsed.name,
        bolnaAgentId,
        prompt: parsed.prompt,
        voiceConfig: {
          language: parsed.language,
          voiceId: parsed.voiceId,
          voiceName: selectedVoice.name,
          provider: "sarvam",
        },
      },
    });

    revalidatePath("/dashboard/agents");
    redirect("/dashboard/agents");
  } catch (error) {
    console.error("[createAgentAction]:", error);
    throw new Error("Failed to create agent. Please try again.");
  }
}

// ─── Sync from Bolna ──────────────────────────────────────────────────────────

export async function syncAgentsAction(): Promise<{ synced: number; total: number }> {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);

    const bolnaAgents = await bolnaClient.listAgents();
    let synced = 0;

    for (const bolnaAgent of bolnaAgents) {
      const existing = await prisma.agent.findFirst({
        where: { bolnaAgentId: bolnaAgent.agent_id },
      });
      if (existing) {
        await prisma.agent.update({
          where: { id: existing.id },
          data: { name: bolnaAgent.agent_name },
        });
      } else {
        await prisma.agent.create({
          data: {
            tenantId,
            bolnaAgentId: bolnaAgent.agent_id,
            name: bolnaAgent.agent_name,
          },
        });
      }
      synced++;
    }

    revalidatePath("/dashboard/agents");
    return { synced, total: bolnaAgents.length };
  } catch (error) {
    console.error("[syncAgentsAction]:", error);
    throw new Error("Failed to sync agents from Bolna.");
  }
}

// ─── Delete Agent ─────────────────────────────────────────────────────────────

export async function deleteAgentAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const id = String(formData.get("id") ?? "");

    const agent = await prisma.agent.findFirst({ where: { id, tenantId } });
    if (!agent) throw new Error("Agent not found");

    // Best-effort delete from Bolna
    try {
      await bolnaClient.deleteAgent(agent.bolnaAgentId);
    } catch (bolnaErr) {
      console.error("[deleteAgentAction] Bolna deletion failed:", bolnaErr);
    }

    await prisma.agent.delete({ where: { id: agent.id } });
    revalidatePath("/dashboard/agents");
  } catch (error) {
    console.error("[deleteAgentAction]:", error);
    throw new Error("Failed to delete agent. Please try again.");
  }
}
