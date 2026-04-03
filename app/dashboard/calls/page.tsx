import { Suspense } from "react";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant";
import { ExecutionsTable } from "./_components/executions-table";
import { ExecutionsFilterBar } from "./_components/executions-filter-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantVoiceProvider, type VoiceProviderExecution } from "@/lib/voice-providers";
import { 
  PhoneOutgoing, 
  Clock, 
  DollarSign, 
  Activity,
  CheckCircle2,
  XCircle
} from "lucide-react";

async function getAggregatedExecutions(
  tenantId: string, 
  agentId?: string, 
  batchId?: string, 
  dateRange?: { start: string; end: string }
) {
  const voiceProvider = await getTenantVoiceProvider(tenantId);
  // 1. Fetch all local agents for this tenant
  const agentsList = await prisma.agent.findMany({
    where: { tenantId },
    select: { id: true, name: true, bolnaAgentId: true },
  });

  if (agentsList.length === 0) return { executions: [], agentsList };

  let executions: VoiceProviderExecution[] = [];

  // 2. Fetch logic based on searchParams
  // If batch selected
  if (batchId && batchId !== "all") {
    executions = await voiceProvider.getExecutions(undefined, batchId, dateRange);
  } 
  // If specific agent selected
  else if (agentId && agentId !== "all") {
    const selectedBolnaAgentId = agentsList.find(a => a.id === agentId)?.bolnaAgentId;
    if (selectedBolnaAgentId) {
      executions = await voiceProvider.getExecutions(selectedBolnaAgentId, undefined, dateRange);
    }
  } 
  // If no filters (Global Fanout)
  else {
      const results = await Promise.all(
      agentsList.map(agent => voiceProvider.getExecutions(agent.bolnaAgentId, undefined, dateRange))
    );
    executions = results.flat();
  }

  // 3. Sort by desc
  executions.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return { executions, agentsList };
}

// Format raw seconds into mm:ss seamlessly
function formatTimeVal(seconds: number) {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}



// Helper: strip Bolna's flat $2 platform fee, keep only real usage cost
function getUsageCost(ex: { total_cost?: number; cost_breakdown?: { platform?: number } }): number {
  const totalCost = Number(ex.total_cost ?? 0);
  const platformFee = Number(ex.cost_breakdown?.platform ?? 0);
  const usage = totalCost - platformFee;
  const markupUsage = usage * 1.4; // 40% increase
  return markupUsage > 0 ? markupUsage : 0;
}

export default async function CallsPage({
  searchParams,
}: {
  // In Next.js 15 the App Router passes searchParams as a Promise
  searchParams: Promise<{ [key: string]: string | undefined }> | { [key: string]: string | undefined };
}) {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  // Always await — harmless in Next 14, required in Next 15
  const resolvedParams = await Promise.resolve(searchParams);
  const { agentId, batchId, startDate, endDate } = resolvedParams;
  const dateRange = (startDate || endDate) ? { start: startDate || "", end: endDate || "" } : undefined;

  const { executions, agentsList } = await getAggregatedExecutions(
    tenantId,
    agentId,
    batchId,
    dateRange
  );

  // ─── Derive Metrics ────────────────────────────────────────────────────────
  const totalExecutions = executions.length;
  // Sum only real usage cost — Bolna's flat "platform" fee is excluded
  const totalCost = executions.reduce((sum, exec) => sum + getUsageCost(exec), 0);
  let totalDuration = 0;
  let completedCount = 0;
  let failedCount = 0;

  executions.forEach((ex) => {
    // 2. Process Duration safely
    // Priority: telephony_data.duration -> conversation_time -> 0
    let dur = Number(ex.telephony_data?.duration);
    if (isNaN(dur) || dur <= 0) dur = Number(ex.conversation_time);
    if (isNaN(dur) || dur < 0) dur = 0;
    
    // Safety check: if raw duration > 500,000, it's virtually guaranteed Bolna sent milliseconds.
    // Convert to seconds.
    if (dur > 500000) {
      dur = Math.floor(dur / 1000);
    }
    
    totalDuration += dur;

    // 3. Process Status
    const stat = (ex.status || "").toLowerCase();
    if (stat === "completed") completedCount++;
    else if (stat === "failed" || stat === "error") failedCount++;
  });

  const avgCost = totalExecutions > 0 ? (totalCost / totalExecutions) : 0;
  const avgDuration = totalExecutions > 0 ? Math.floor(totalDuration / totalExecutions) : 0;
  const activeCount = totalExecutions - (completedCount + failedCount);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Agent Conversations
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Analytics and complete execution logs across your operations.
          </p>
        </div>
      </div>
      
      {/* ─── Filter Bar ─────────────────────────────────────────────────────── */}
      <ExecutionsFilterBar agents={agentsList.map(a => ({ id: a.id, name: a.name }))} />

      {/* ─── Metric Cards Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total Calls
            </CardTitle>
            <PhoneOutgoing className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {totalExecutions}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Found in current scope</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatTimeVal(totalDuration)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Avg: {formatTimeVal(avgDuration)} / call
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Platform Spend
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              ${Number(totalCost).toFixed(3)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Avg: ${Number(avgCost).toFixed(3)} / call
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-500">
              Successfully Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">
              {completedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-500">
              Failed or Errored
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
              {failedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Active / Queued
            </CardTitle>
            <Activity className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {activeCount < 0 ? 0 : activeCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Executions Data Table ──────────────────────────────────────────── */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Detailed Logs
        </h2>
        
        <Suspense fallback={
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-zinc-900 dark:border-white"></div>
          </div>
        }>
          <ExecutionsTable data={executions} />
        </Suspense>
      </div>
    </div>
  );
}
