"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { bolnaClient } from "@/lib/bolna-client";

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["url", "pdf"]),
  sourceUrl: z.string().optional(),
  language: z.string().optional(),
  file: z.any().optional(),
});

export async function createKnowledgeBaseAction(formData: FormData) {
  "use server";
  
  let redirectPath: string | null = null;
  
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);

    const parsed = createKnowledgeBaseSchema.parse({
      name: formData.get("name"),
      type: formData.get("type"),
      sourceUrl: formData.get("sourceUrl") || undefined,
      language: formData.get("language") || undefined,
    });
    
    const file = formData.get("file") as File | null;

    // ── Call Bolna KB API ───────────────────────────────────────────────────
    let bolnaResponse;
    if (parsed.type === "url") {
      bolnaResponse = await bolnaClient.createKnowledgeBase({
        name: parsed.name,
        url: parsed.sourceUrl,
      });
    } else if (parsed.type === "pdf") {
      if (!file || file.size === 0) {
        throw new Error("A valid PDF file is required.");
      }
      bolnaResponse = await bolnaClient.createKnowledgeBase({
        name: parsed.name,
        file,
      });
    }

    if (!bolnaResponse) {
      throw new Error("Invalid knowledge base type");
    }

    // ── Persist with auto-filled bolnaKbId ─────────────────────────────────
    await prisma.knowledgeBase.create({
      data: {
        tenantId,
        name: parsed.name,
        type: parsed.type,
        sourceUrl: parsed.type === "url" ? parsed.sourceUrl : (file?.name || ""),
        bolnaKbId: bolnaResponse.kb_id,
        status: "indexing",
      },
    });

    revalidatePath("/dashboard/knowledge-base");
    redirectPath = "/dashboard/knowledge-base";
  } catch (error) {
    console.error("[createKnowledgeBaseAction]:", error);
    throw new Error("Failed to create knowledge base. Please try again.");
  }
  
  if (redirectPath) redirect(redirectPath);
}

export async function deleteKnowledgeBaseAction(formData: FormData) {
  "use server";
  try {
    const session = await auth();
    const tenantId = await getCurrentTenantId(session);
    const id = String(formData.get("id") ?? "");

    const kb = await prisma.knowledgeBase.findFirst({ where: { id, tenantId } });
    if (!kb) throw new Error("Knowledge base not found");

    // ── Delete from Bolna first (best-effort) ─────────────────────────────
    if (kb.bolnaKbId) {
      try {
        await bolnaClient.deleteKnowledgeBase(kb.bolnaKbId);
      } catch (bolnaErr) {
        console.error("[deleteKnowledgeBaseAction] Bolna deletion failed:", bolnaErr);
        // Continue to delete from Prisma even if Bolna fails
      }
    }

    await prisma.knowledgeBase.delete({ where: { id: kb.id } });
    revalidatePath("/dashboard/knowledge-base");
  } catch (error) {
    console.error("[deleteKnowledgeBaseAction]:", error);
    throw new Error("Failed to delete knowledge base. Please try again.");
  }
}
