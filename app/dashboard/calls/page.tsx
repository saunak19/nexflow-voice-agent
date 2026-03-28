import Link from "next/link";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant";
import { 
  ExternalLink, 
  Download, 
  Play,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns"; // Make sure to install date-fns

const statusColorMap: Record<string, string> = {
  queued: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "in-progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default async function CallsHistoryPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const executions = await prisma.callExecution.findMany({
    where: { tenantId },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
    take: 50, // basic pagination placeholder
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Call History
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Monitor AI call performance and review transcripts.
          </p>
        </div>
        <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/api/calls/export">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Link>
            </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">AGENT</th>
                <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">PHONE</th>
                <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">STATUS</th>
                <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">DURATION</th>
                <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">INITIATED</th>
                <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {executions.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                     No call executions found for your tenant.
                   </td>
                </tr>
              ) : (
                executions.map((execution) => (
                  <tr key={execution.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                      {execution.agent.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-600 dark:text-zinc-400">
                      {execution.phoneNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColorMap[execution.status] || "bg-zinc-100"}`}>
                        {execution.status === "in-progress" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {execution.status === "completed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {execution.status === "failed" && <XCircle className="mr-1 h-3 w-3" />}
                        {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {execution.duration ? `${execution.duration}s` : "-"}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {formatDistanceToNow(new Date(execution.createdAt))} ago
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         {execution.recordingUrl && (
                             <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Play Recording">
                               <a href={execution.recordingUrl} target="_blank" rel="noreferrer">
                                 <Play className="h-4 w-4" />
                               </a>
                             </Button>
                          )}
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" title="View Transcript">
                            <Link href={`/dashboard/calls/${execution.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                       </div>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
