import { Suspense } from "react";
import Link from "next/link";
import {
  PhoneCall,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  ArrowRight,
  Bot,
  Layers,
  TrendingUp,
} from "lucide-react";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { getTenantVoiceProvider } from "@/lib/voice-providers";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtDuration(secs: number | undefined | null) {
  const s = Number(secs ?? 0);
  if (!s || s <= 0 || isNaN(s)) return "0s";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function fmtCost(n: number | undefined | null) {
  const v = Number(n ?? 0);
  return `$${(isNaN(v) ? 0 : v).toFixed(3)}`;
}

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));
}

function statusColor(status: string) {
  const s = status?.toLowerCase() ?? "";
  if (["completed", "success"].includes(s)) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30";
  if (["failed", "error", "no-answer", "busy"].includes(s)) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
  if (["in-progress", "queued", "ringing"].includes(s)) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30";
  return "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800";
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchOverviewData(tenantId: string) {
  const voiceProvider = await getTenantVoiceProvider(tenantId);

  // DB queries — fast
  const [agentsList, batchStats] = await Promise.all([
    prisma.agent.findMany({
      where: { tenantId },
      select: { id: true, name: true, bolnaAgentId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.batch.aggregate({
      where: { tenantId },
      _count: { id: true },
      _sum: { totalCalls: true, completedCalls: true, failedCalls: true },
    }),
  ]);

  // Phone number count — safe fallback if model unavailable
  let phoneNumbers = 0;
  try {
    const result = await (prisma as any).tenantPhoneNumber.count({ where: { tenantId } });
    phoneNumbers = typeof result === "number" ? result : 0;
  } catch {
    phoneNumbers = 0;
  }


  // Fetch executions from Bolna for all agents (fan-out, best-effort)
  let allExecutions: any[] = [];
  if (agentsList.length > 0) {
    const results = await Promise.all(
      agentsList.map((agent) =>
        voiceProvider
          .getExecutions(agent.bolnaAgentId)
          .catch(() => [])
      )
    );
    allExecutions = results.flat();
  }

  // Sort newest first
  allExecutions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Aggregate stats
  const totalCalls = allExecutions.length;
  const successful = allExecutions.filter((e) =>
    ["completed", "success"].includes(e.status?.toLowerCase() ?? "")
  ).length;
  const failed = allExecutions.filter((e) =>
    ["failed", "error", "no-answer", "busy"].includes(e.status?.toLowerCase() ?? "")
  ).length;
  const totalDuration = allExecutions.reduce(
    (acc, e) => acc + (Number(e.telephony_data?.duration) || Number(e.conversation_time) || 0),
    0
  );
  const totalCost = allExecutions.reduce(
    (acc, e) => acc + (Number(e.cost) || Number(e.total_cost) || 0),
    0
  );

  // Per-agent call counts for "Top Agents"
  const agentCallCounts: Record<string, number> = {};
  for (const e of allExecutions) {
    if (e.agent_id) {
      agentCallCounts[e.agent_id] = (agentCallCounts[e.agent_id] ?? 0) + 1;
    }
  }

  const topAgents = agentsList
    .map((a) => ({
      ...a,
      callCount: agentCallCounts[a.bolnaAgentId] ?? 0,
    }))
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 5);

  // Recent 8 executions
  const recentExecutions = allExecutions.slice(0, 8).map((e) => ({
    id: e.id as string,
    status: (e.status ?? "unknown") as string,
    created_at: e.created_at as string,
    duration: (Number(e.telephony_data?.duration) || Number(e.conversation_time) || 0) as number,
    cost: (Number(e.cost) || Number(e.total_cost) || 0) as number,
    to_number: (e.telephony_data?.to_number ?? "—") as string,
    agent_id: (e.agent_id ?? "") as string,
  }));

  return {
    agentsCount: agentsList.length,
    totalCalls,
    successful,
    failed,
    totalDuration,
    totalCost,
    phoneNumbers,
    batchCount: batchStats._count.id,
    recentExecutions,
    topAgents,
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: "green" | "red" | "amber" | "default";
}) {
  const accentMap = {
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-500 dark:text-red-400",
    amber: "text-amber-500 dark:text-amber-400",
    default: "text-zinc-400",
  };
  const textColor = accentMap[accent ?? "default"];

  return (
    <div className="surface-card rounded-xl p-5 flex flex-col gap-3 group hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-zinc-900 dark:bg-zinc-700 p-2.5 text-white">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        {sub && (
          <span className={`text-xs font-semibold ${textColor}`}>{sub}</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
          {value}
        </p>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

// ─── Panel: Recent Executions ──────────────────────────────────────────────────

function RecentExecRow({
  exec,
  agentName,
}: {
  exec: {
    id: string;
    status: string;
    created_at: string;
    duration: number;
    cost: number;
    to_number: string;
  };
  agentName: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {exec.to_number}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{agentName} · {fmtDate(exec.created_at)}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          {fmtDuration(exec.duration)}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(exec.status)}`}
        >
          {exec.status}
        </span>
      </div>
    </div>
  );
}

// ─── Async Server Components ──────────────────────────────────────────────────

async function OverviewContent({ tenantId }: { tenantId: string }) {
  const d = await fetchOverviewData(tenantId);

  const successRate =
    d.totalCalls > 0 ? Math.round((d.successful / d.totalCalls) * 100) : 0;

  return (
    <>
      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calls"
          value={fmt(d.totalCalls)}
          icon={PhoneCall}
          accent="default"
        />
        <StatCard
          label="Active Agents"
          value={fmt(d.agentsCount)}
          icon={Users}
          accent="default"
        />
        <StatCard
          label="Successful"
          value={fmt(d.successful)}
          sub={d.totalCalls > 0 ? `${successRate}% success rate` : undefined}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          label="Failed / No Answer"
          value={fmt(d.failed)}
          sub={d.totalCalls > 0 ? `${Math.round((d.failed / d.totalCalls) * 100)}% failure` : undefined}
          icon={XCircle}
          accent="red"
        />
      </div>

      {/* ── Secondary stat row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Talk Time",
            value: fmtDuration(d.totalDuration),
            icon: Clock,
          },
          {
            label: "Platform Spend",
            value: fmtCost(d.totalCost),
            icon: DollarSign,
          },
          {
            label: "Phone Numbers",
            value: String(d.phoneNumbers),
            icon: Activity,
          },
          {
            label: "Total Batches",
            value: String(d.batchCount),
            icon: Layers,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="surface-card rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <item.icon className="h-4 w-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
                {item.value}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom grid: recent executions + top agents ─────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">

        {/* Recent Executions */}
        <div className="surface-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Recent Executions
            </h3>
            <Link
              href="/dashboard/calls"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {d.recentExecutions.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-sm text-zinc-400 dark:text-zinc-500">
              No calls yet — trigger one from an agent card.
            </div>
          ) : (
            <div>
              {d.recentExecutions.map((exec) => {
                // map agent_id (bolna) → local name
                const agentName =
                  d.topAgents.find((a) => a.bolnaAgentId === exec.agent_id)?.name ??
                  "Unknown Agent";
                return (
                  <RecentExecRow key={exec.id} exec={exec} agentName={agentName} />
                );
              })}
            </div>
          )}
        </div>

        {/* Top Agents */}
        <div className="surface-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Agents by Calls
            </h3>
            <Link
              href="/dashboard/agents"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {d.topAgents.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-sm text-zinc-400 dark:text-zinc-500">
              No agents configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {d.topAgents.map((agent, idx) => {
                const barWidth =
                  d.topAgents[0].callCount > 0
                    ? Math.round((agent.callCount / d.topAgents[0].callCount) * 100)
                    : 0;
                return (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/${agent.id}`}
                    className="group block"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors">
                          {agent.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0 ml-2">
                        {agent.callCount} calls
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-800 dark:bg-zinc-300 transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card rounded-xl px-4 py-3 space-y-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-card rounded-xl p-5 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <div className="surface-card rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-12" />
              </div>
              <Skeleton className="h-1.5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  return (
    <div className="space-y-5">

      {/* Heading */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Here&apos;s a live snapshot of your Voice AI workspace.
          </p>
        </div>
        <Link
          href="/dashboard/calls"
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Full Analytics
        </Link>
      </div>

      {/* Data */}
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent tenantId={tenantId} />
      </Suspense>
    </div>
  );
}
