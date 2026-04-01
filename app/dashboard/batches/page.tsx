import Link from "next/link";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentTenantId } from "@/lib/tenant";
import { bolnaClient, BatchResponse } from "@/lib/bolna-client";

import { BatchesTable } from "./_components/batches-table";
import { AgentFilter } from "./_components/agent-filter";

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const resolvedParams = await searchParams;
  const filterAgentId = typeof resolvedParams.agentId === "string" ? resolvedParams.agentId : undefined;

  // 1. Fetch all agents from Prisma for the current tenant
  const agents = await prisma.agent.findMany({
    where: { tenantId },
    select: { id: true, name: true, bolnaAgentId: true },
  });

  // 2. Fetch batches from Bolna API
  let batches: BatchResponse[] = [];
  
  if (filterAgentId) {
    const selectedAgent = agents.find(a => a.id === filterAgentId);
    if (selectedAgent && selectedAgent.bolnaAgentId) {
      batches = await bolnaClient.listBatchesForAgent(selectedAgent.bolnaAgentId);
    }
  } else {
    // Fetch for all agents concurrently
    const batchPromises = agents.map(async (agent) => {
      if (!agent.bolnaAgentId) return [];
      try {
        return await bolnaClient.listBatchesForAgent(agent.bolnaAgentId);
      } catch (e) {
        console.error(`Failed to fetch batches for agent ${agent.id}`);
        return [];
      }
    });
    
    const results = await Promise.all(batchPromises);
    batches = results.flat();
  }

  // Sort batches by created_at descending
  batches.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Batch Executions
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Schedule and manage large-scale outbound voice campaigns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {agents.length > 0 && (
             <AgentFilter agents={agents} currentAgentId={filterAgentId || ""} />
          )}
          <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
            <Link href="/dashboard/batches/new">
              <Plus className="mr-2 h-4 w-4" />
              New Batch
            </Link>
          </Button>
        </div>
      </div>

      <BatchesTable batches={batches} agents={agents} />
    </div>
  );
}
