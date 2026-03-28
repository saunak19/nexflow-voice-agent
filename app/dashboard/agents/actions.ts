"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

const createAgentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  bolnaAgentId: z.string().min(2, "Bolna agent ID is required"),
  prompt: z.string().optional(),
  voice: z.string().optional(),
});

export async function createAgentAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const parsed = createAgentSchema.parse({
    name: formData.get("name"),
    bolnaAgentId: formData.get("bolnaAgentId"),
    prompt: formData.get("prompt") || undefined,
    voice: formData.get("voice") || undefined,
  });

  await prisma.agent.create({
    data: {
      tenantId,
      name: parsed.name,
      bolnaAgentId: parsed.bolnaAgentId,
      prompt: parsed.prompt,
      voiceConfig: parsed.voice ? { voice: parsed.voice } : undefined,
    },
  });

  revalidatePath("/dashboard/agents");
  redirect("/dashboard/agents");
}
