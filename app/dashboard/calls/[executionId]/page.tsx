import Link from "next/link";
import { ArrowLeft, Clock, FileText, PhoneCall } from "lucide-react";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export default async function CallExecutionDetailPage({
  params,
}: {
  params: Promise<{ executionId: string }>;
}) {
  const { executionId } = await params;
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const execution = await prisma.callExecution.findFirst({
    where: {
      id: executionId,
      tenantId,
    },
    include: {
      agent: true,
      callLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!execution) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/calls"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to call history
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {execution.agent.name}
        </h1>
        <p className="mt-2 font-mono text-sm text-zinc-500 dark:text-zinc-400">
          {execution.phoneNumber}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-6 flex items-center gap-3">
            <FileText className="h-5 w-5 text-zinc-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Transcript
            </h2>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-5 text-sm leading-7 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
            {execution.transcript || "No transcript stored yet for this execution."}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <PhoneCall className="h-4 w-4" />
              Call details
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-50">{execution.status}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Duration</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                  {execution.duration ? `${execution.duration}s` : "Not available"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Recording</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                  {execution.recordingUrl ? (
                    <a
                      href={execution.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
                    >
                      Open recording
                    </a>
                  ) : (
                    "No recording URL"
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <Clock className="h-4 w-4" />
              Recent webhook events
            </div>
            <div className="space-y-3">
              {execution.callLogs.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No webhook events stored yet.</p>
              ) : (
                execution.callLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      {log.event}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
