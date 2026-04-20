import Link from "next/link";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { Plus, User, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagicCallButton } from "@/components/magic-call-button";
import { getCurrentTenantId } from "@/lib/tenant";
import { SyncAgentsButton } from "@/components/sync-agents-button";
import { DeleteAgentButton } from "./_components/delete-agent-button";
import { AgentsList } from "./_components/agents-list";
import { listTenantPhoneNumbers } from "@/lib/tenant-phone-numbers";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function AgentsPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const agents = await prisma.agent.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  let phoneNumbers: { phone_number: string }[] = [];
  try {
    phoneNumbers = await listTenantPhoneNumbers(tenantId);
  } catch (err) {
    console.error("[AgentsPage] failed to fetch phone numbers:", err);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI Agents
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your workspace voice agents and their configurations.
          </p>
        </div>
        <div className="flex gap-2">
          <SyncAgentsButton />
          <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
            <Link href="/dashboard/agents/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Link>
          </Button>
        </div>
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
        <AgentsList 
          agents={agents} 
          phoneNumbers={phoneNumbers.map(n => ({ phone_number: n.phone_number }))} 
        />
      )}
    </div>
  );
}
