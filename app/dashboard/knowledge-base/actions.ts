"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["url", "pdf"]),
  sourceUrl: z.string().optional(),
  bolnaKbId: z.string().optional(),
});

export async function createKnowledgeBaseAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const parsed = createKnowledgeBaseSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    sourceUrl: formData.get("sourceUrl") || undefined,
    bolnaKbId: formData.get("bolnaKbId") || undefined,
  });

  await prisma.knowledgeBase.create({
    data: {
      tenantId,
      name: parsed.name,
      type: parsed.type,
      sourceUrl: parsed.type === "url" ? parsed.sourceUrl : undefined,
      bolnaKbId: parsed.bolnaKbId,
      status: parsed.bolnaKbId ? "completed" : "pending",
    },
  });

  revalidatePath("/dashboard/knowledge-base");
  redirect("/dashboard/knowledge-base");
}

export async function deleteKnowledgeBaseAction(formData: FormData) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const id = String(formData.get("id") || "");

  await prisma.knowledgeBase.deleteMany({
    where: {
      id,
      tenantId,
    },
  });

  revalidatePath("/dashboard/knowledge-base");
}
