import Link from "next/link";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FileText, 
  Globe, 
  Cloud,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentTenantId } from "@/lib/tenant";
import { deleteKnowledgeBaseAction } from "@/app/dashboard/knowledge-base/actions";
import { CreateKnowledgeDialog } from "./_components/create-kb-dialog";

import { MotionList, MotionItem } from "@/components/ui/motion-list";

const statusIconMap: Record<string, LucideIcon> = {
  pending: Clock,
  indexing: Cloud,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const statusColorMap: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400",
  indexing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default async function KnowledgeBasePage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Knowledge Base
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage documents and URLs your AI agents use for context.
          </p>
        </div>
        <div className="flex gap-2">
            <CreateKnowledgeDialog />
        </div>
      </div>

      {knowledgeBases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 p-20 text-center dark:border-zinc-800">
           <div className="h-20 w-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
             <BookOpen className="h-10 w-10 text-zinc-400" />
           </div>
           <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">No knowledge base found</h3>
           <p className="mt-2 text-zinc-500 dark:text-zinc-400 max-w-sm">
             Upload PDFs or provide website URLs to train your voice agents with custom business knowledge.
           </p>
           <div className="mt-8 flex gap-4">
              <CreateKnowledgeDialog />
           </div>
        </div>
      ) : (
        <MotionList className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
           {knowledgeBases.map((kb) => {
             const Icon = kb.type === 'pdf' ? FileText : Globe;
             const StatusIcon = statusIconMap[kb.status] || Clock;

             return (
               <MotionItem key={kb.id} className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                       <Icon className="h-6 w-6" />
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColorMap[kb.status]}`}>
                       <StatusIcon className="h-3.5 w-3.5" />
                       {kb.status.charAt(0).toUpperCase() + kb.status.slice(1)}
                    </div>
                  </div>
                  <div className="mt-4">
                     <h3 className="font-bold text-zinc-900 dark:text-zinc-50 truncate" title={kb.name}>{kb.name}</h3>
                     <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                       Source: {kb.sourceUrl || "Uploaded File"}
                     </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                     <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                       ID: {kb.bolnaKbId?.slice(0, 8) || "PENDING"}
                     </span>
                     <form action={deleteKnowledgeBaseAction}>
                        <input type="hidden" name="id" value={kb.id} />
                        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                           <Trash2 className="h-4 w-4" />
                        </Button>
                     </form>
                  </div>
               </MotionItem>
             )
           })}
        </MotionList>
      )}
    </div>
  );
}
