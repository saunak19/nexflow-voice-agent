import Link from "next/link";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { Plus, User, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagicCallButton } from "@/components/magic-call-button";
import { getCurrentTenantId } from "@/lib/tenant";

export default async function AgentsPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const agents = await prisma.agent.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI Agents
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your Bolna voice agents and their configurations.
          </p>
        </div>
        <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
          <Link href="/dashboard/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
            <Users className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">No agents</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Get started by creating your first AI voice agent.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/dashboard/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                New Agent
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 transition-transform group-hover:scale-110">
                  <User className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  Ready
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {agent.name}
                </h3>
                <p className="mt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  BOLNA ID: {agent.bolnaAgentId}
                </p>
              </div>
              <div className="mt-6 flex flex-col space-y-4">
                 <MagicCallButton agentId={agent.id} tenantId={agent.tenantId} />
                 <Button asChild variant="ghost" className="w-full justify-start rounded-lg text-xs" size="sm">
                   <Link href={`/dashboard/agents/${agent.id}`}>
                     <ExternalLink className="mr-2 h-3 w-3" />
                     Open Agent Record
                   </Link>
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
