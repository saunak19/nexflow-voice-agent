import Link from "next/link";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { 
  Layers, 
  Plus, 
  Play, 
  Square, 
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentTenantId } from "@/lib/tenant";
import { toggleBatchStatusAction } from "@/app/dashboard/batches/actions";

export default async function BatchesPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const batches = await prisma.batch.findMany({
    where: { tenantId },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Batch Executions
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Schedule and manage large-scale outbound voice campaigns.
          </p>
        </div>
        <div className="flex gap-2">
            <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
              <Link href="/dashboard/batches/new">
                <Plus className="mr-2 h-4 w-4" />
                New Batch
              </Link>
            </Button>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 p-20 text-center dark:border-zinc-800">
           <div className="h-20 w-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
             <Layers className="h-10 w-10 text-zinc-400" />
           </div>
           <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">No batches scheduled</h3>
           <p className="mt-2 text-zinc-500 dark:text-zinc-400 max-w-sm">
             Initiate high-volume voice call campaigns by uploading a CSV of contacts.
           </p>
           <div className="mt-8 flex gap-4">
              <Button asChild className="rounded-xl bg-zinc-900 text-white">
                <Link href="/dashboard/batches/new">Create First Batch</Link>
              </Button>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
           {batches.map((batch:any) => {
             const progress = batch.totalCalls > 0 
               ? Math.round(((batch.completedCalls + batch.failedCalls) / batch.totalCalls) * 100) 
               : 0;

             return (
               <div key={batch.id} className="group relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-50 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                         <Activity className="h-6 w-6" />
                      </div>
                      <div>
                         <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{batch.name}</h3>
                         <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                           Agent: {batch.agent.name} • Created {new Date(batch.createdAt).toLocaleDateString()}
                         </p>
                      </div>
                    </div>

                    <div className="flex-1 max-w-md w-full">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-tighter">Progress: {progress}%</span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 uppercase tracking-tighter">
                            {batch.completedCalls + batch.failedCalls} / {batch.totalCalls} Calls
                          </span>
                       </div>
                       <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-zinc-900 dark:bg-zinc-50 transition-all duration-1000" 
                            style={{ width: `${progress}%` }}
                          />
                       </div>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">{batch.completedCalls}</span>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold">Success</span>
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">{batch.failedCalls}</span>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold">Failed</span>
                       </div>
                       <div className="h-8 w-px bg-zinc-200 dark:border-zinc-800 mx-2" />
                       <div className="flex items-center gap-2">
                           <form action={toggleBatchStatusAction}>
                             <input type="hidden" name="id" value={batch.id} />
                             {batch.status === 'in-progress' ? (
                               <>
                                 <input type="hidden" name="nextStatus" value="stopped" />
                                 <Button type="submit" variant="outline" size="sm" className="rounded-lg text-red-600 border-red-200 hover:bg-red-50 transition-colors">
                                    <Square className="mr-2 h-3 w-3 fill-current" />
                                    Stop
                                 </Button>
                               </>
                             ) : (
                               <>
                                 <input type="hidden" name="nextStatus" value="in-progress" />
                                 <Button type="submit" variant="outline" size="sm" className="rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
                                    <Play className="mr-2 h-3 w-3 fill-current" />
                                    Resume
                                 </Button>
                               </>
                             )}
                           </form>
                           <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                             {batch.status}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
             )
           })}
        </div>
      )}
    </div>
  );
}
