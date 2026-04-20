import Link from "next/link";
import { ArrowLeft, Bot, PhoneCall } from "lucide-react";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { listTenantPhoneNumbers } from "@/lib/tenant-phone-numbers";
import { MagicCallButton } from "@/components/magic-call-button";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      tenantId,
    },
  });

  if (!agent) {
    notFound();
  }

  const phoneNumbers = await listTenantPhoneNumbers(tenantId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/agents"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {agent.name}
            </h1>
            <p className="mt-2 font-mono text-sm text-zinc-500 dark:text-zinc-400">
              Agent ID: {agent.bolnaAgentId}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <Bot className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Agent notes
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {agent.prompt || "No notes saved yet for this agent."}
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <PhoneCall className="h-4 w-4" />
              Trigger a call
            </div>
            <MagicCallButton
              agentId={agent.id}
              tenantId={agent.tenantId}
              phoneNumbers={phoneNumbers.map((number) => ({ phone_number: number.phone_number }))}
            />
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Voice
            </p>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {typeof agent.voiceConfig === "object" && agent.voiceConfig && "voice" in (agent.voiceConfig as Record<string, unknown>)
                ? String((agent.voiceConfig as Record<string, unknown>).voice)
                : "Not set"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
