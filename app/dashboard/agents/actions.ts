"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { requireTenantRole } from "@/lib/authorization";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { assertTenantOwnsPhoneNumber, normalizePhoneNumber } from "@/lib/tenant-phone-numbers";
import { getTenantVoiceProvider } from "@/lib/voice-providers";

function extractCallIdentifier(response: unknown) {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const candidate = response as Record<string, unknown>;
  const possibleId = candidate.call_id ?? candidate.callId ?? candidate.execution_id ?? candidate.executionId ?? candidate.id;

  return typeof possibleId === "string" && possibleId.trim() ? possibleId : undefined;
}

// ─── Create Agent ─────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ["en", "hi", "gu", "mr", "bn", "ta", "te"] as const;

const createAgentSchema = z.object({
  name: z.string().min(2, "Agent name must be at least 2 characters"),
  welcomeMessage: z.string().min(2, "Welcome message is required"),
  prompt: z.string().min(10, "System prompt must be at least 10 characters"),
  language: z.enum(SUPPORTED_LANGUAGES, { message: "Please select a valid language" }),
  voiceId: z.string().min(1, "Please select a voice"),
});

export async function createAgentAction(formData: FormData) {
  "use server";

  let redirectPath: string | null = null;

  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    const parsed = createAgentSchema.parse({
      name: formData.get("name"),
      welcomeMessage: formData.get("welcomeMessage"),
      prompt: formData.get("prompt"),
      language: formData.get("language"),
      voiceId: formData.get("voiceId"),
    });

    // ── Validate the voice_id against real registered voices from Bolna ───────
    const availableVoices = await voiceProvider.listVoices();
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
    const { agent_id: bolnaAgentId } = await voiceProvider.createAgent({
      name: parsed.name,
      welcomeMessage: parsed.welcomeMessage,
      prompt: parsed.prompt,
      language: parsed.language,
      voiceId: parsed.voiceId,
      voiceName: selectedVoice.name,
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
    redirectPath = "/dashboard/agents";
  } catch (error) {
    console.error("[createAgentAction]:", error);
    throw new Error("Failed to create agent. Please try again.");
  }

  // redirect() must be called OUTSIDE try/catch — it works by throwing
  // a special NEXT_REDIRECT error that Next.js intercepts. If called
  // inside catch, it gets swallowed and re-thrown as a generic error.
  if (redirectPath) redirect(redirectPath);
}

// ─── Sync from Bolna ──────────────────────────────────────────────────────────

export async function syncAgentsAction(): Promise<{ synced: number; total: number }> {
  "use server";
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    const bolnaAgents = await voiceProvider.listAgents();
    const existingAgents = await prisma.agent.findMany({
      where: { tenantId },
      select: { id: true, bolnaAgentId: true },
    });
    const existingAgentMap = new Map(
      existingAgents.map((agent) => [agent.bolnaAgentId, agent.id])
    );
    let synced = 0;

    for (const bolnaAgent of bolnaAgents) {
      const existingId = existingAgentMap.get(bolnaAgent.agent_id);
      if (existingId) {
        await prisma.agent.update({
          where: { id: existingId },
          data: { name: bolnaAgent.agent_name },
        });
        synced++;
      }
    }

    revalidatePath("/dashboard/agents");
    return { synced, total: existingAgents.length };
  } catch (error) {
    console.error("[syncAgentsAction]:", error);
    throw new Error("Failed to sync agents from Bolna.");
  }
}

// ─── Delete Agent ─────────────────────────────────────────────────────────────

export async function deleteAgentAction(localAgentId: string, _bolnaAgentId: string) {
  "use server";
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    const agent = await prisma.agent.findFirst({ where: { id: localAgentId, tenantId } });
    if (!agent) throw new Error("Agent not found");

    // Best-effort delete from Bolna
    try {
      if (agent.bolnaAgentId) {
        await voiceProvider.deleteAgent(agent.bolnaAgentId);
      }
    } catch (bolnaErr: any) {
      if (bolnaErr?.message?.includes("404")) {
        console.warn("[deleteAgentAction] Agent not found on Bolna, proceeding with local deletion.");
      } else {
        console.error("[deleteAgentAction] Bolna deletion failed:", bolnaErr);
      }
    }

    await prisma.agent.delete({ where: { id: localAgentId } });
    revalidatePath("/dashboard/agents");
  } catch (error) {
    console.error("[deleteAgentAction]:", error);
    throw new Error("Failed to delete agent. Please try again.");
  }
}

// ─── Update Agent ─────────────────────────────────────────────────────────────

const updateAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Agent name must be at least 2 characters"),
  prompt: z.string().min(10, "System prompt must be at least 10 characters"),
});

export async function updateAgentAction(formData: FormData) {
  "use server";

  let redirectPath: string | null = null;

  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    const parsed = updateAgentSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      prompt: formData.get("prompt"),
    });

    const agent = await prisma.agent.findFirst({
      where: { id: parsed.id, tenantId },
    });
    if (!agent) throw new Error("Agent not found");

    // ── Update Bolna (name + system prompt) ───────────────────────────────
    await voiceProvider.updateAgent(agent.bolnaAgentId, {
      agent_config: { agent_name: parsed.name },
      agent_prompts: { task_1: { system_prompt: parsed.prompt } },
    });

    // ── Update DB ─────────────────────────────────────────────────────────
    await prisma.agent.update({
      where: { id: agent.id },
      data: { name: parsed.name, prompt: parsed.prompt },
    });

    revalidatePath(`/dashboard/agents/${parsed.id}`);
    revalidatePath("/dashboard/agents");
    redirectPath = `/dashboard/agents/${parsed.id}`;
  } catch (error) {
    console.error("[updateAgentAction]:", error);
    throw new Error("Failed to update agent. Please try again.");
  }

  if (redirectPath) redirect(redirectPath);
}

// ─── Stop Agent Calls ─────────────────────────────────────────────────────────

export async function stopAgentCallsAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);
    const id = String(formData.get("id") ?? "");

    const agent = await prisma.agent.findFirst({ where: { id, tenantId } });
    if (!agent) throw new Error("Agent not found");

    await voiceProvider.stopAgentCalls(agent.bolnaAgentId);

    revalidatePath(`/dashboard/agents/${id}`);
  } catch (error) {
    console.error("[stopAgentCallsAction]:", error);
    throw new Error("Failed to stop agent calls. Please try again.");
  }
}

// ─── Trigger Individual Call ──────────────────────────────────────────────────

export async function makeCallAction(
  localAgentId: string,
  phoneNumber: string,
  fromPhoneNumber?: string
) {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    const agent = await prisma.agent.findFirst({
      where: { id: localAgentId, tenantId },
      select: { bolnaAgentId: true },
    });

    if (!agent) {
      throw new Error("Agent not found.");
    }

    if (fromPhoneNumber) {
      const normalizedFromPhoneNumber = normalizePhoneNumber(fromPhoneNumber);
      await assertTenantOwnsPhoneNumber(tenantId, normalizedFromPhoneNumber);
      fromPhoneNumber = normalizedFromPhoneNumber;
    }

    const cleanNumber = normalizePhoneNumber(phoneNumber);

    const response = await voiceProvider.makeCall(agent.bolnaAgentId, cleanNumber, fromPhoneNumber);
    const callIdentifier = extractCallIdentifier(response);

    return {
      success: true,
      callId: callIdentifier,
      bolnaCallId: callIdentifier,
      status: response.status ?? "initiated",
    };
  } catch (error: any) {
    console.error("[makeCallAction]:", error);
    return {
      success: false,
      error: error.message || "Failed to trigger call.",
    };
  }
}

// ─── Stop Individual Call ─────────────────────────────────────────────────────

export async function stopCallAction(executionId: string) {
  try {
    const session = await auth();
    await requireTenantRole(session, Role.ADMIN);
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    if (!executionId) {
      throw new Error("Execution ID is required.");
    }

    const execution = await prisma.callExecution.findFirst({
      where: {
        tenantId,
        OR: [{ bolnaExecutionId: executionId }, { id: executionId }],
      },
      select: { bolnaExecutionId: true },
    });

    if (!execution) {
      throw new Error("Call not found for this workspace.");
    }

    await voiceProvider.stopCall(execution.bolnaExecutionId);

    return { success: true };
  } catch (error: any) {
    console.error("[stopCallAction]:", error);
    return {
      success: false,
      error: error.message || "Failed to stop call.",
    };
  }
}

// ─── Fetch Executions ─────────────────────────────────────────────────────────

export async function getExecutionsAction(localAgentId: string) {
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const voiceProvider = await getTenantVoiceProvider(tenantId);

    const agent = await prisma.agent.findFirst({
      where: { id: localAgentId, tenantId },
      select: { bolnaAgentId: true },
    });

    if (!agent) {
      throw new Error("Agent not found.");
    }

    const executions = await voiceProvider.getExecutions(agent.bolnaAgentId);

    return { success: true, executions };
  } catch (error: any) {
    console.error("[getExecutionsAction]:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch executions.",
      executions: [],
    };
  }
}
