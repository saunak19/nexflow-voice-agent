import Link from "next/link";
import { ArrowLeft, Layers, Save } from "lucide-react";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBatchAction } from "@/app/dashboard/batches/actions";

export default async function NewBatchPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const agents = await prisma.agent.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/batches"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to batches
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Create Batch
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Create a local campaign batch so your team can schedule and monitor outbound runs.
        </p>
      </div>

      <form
        action={createBatchAction}
        className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Campaign setup
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pick an existing agent and define how many contacts this batch should track.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Batch name
            </label>
            <Input id="name" name="name" placeholder="April warm leads campaign" required className="h-11 rounded-xl" />
          </div>

          <div className="space-y-2">
            <label htmlFor="agentId" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Agent
            </label>
            <select
              id="agentId"
              name="agentId"
              required
              className="h-11 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:focus:border-zinc-600"
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            {agents.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Create an agent first before creating a batch.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="totalCalls" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Total calls
            </label>
            <Input id="totalCalls" name="totalCalls" type="number" min="1" defaultValue="100" required className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This creates a trackable batch record now. Live Bolna scheduling can be connected next on top of this.
          </p>
          <Button
            type="submit"
            disabled={agents.length === 0}
            className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Save className="mr-2 h-4 w-4" />
            Save batch
          </Button>
        </div>
      </form>
    </div>
  );
}
