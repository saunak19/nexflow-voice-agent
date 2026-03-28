import Link from "next/link";
import { ArrowLeft, Bot, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAgentAction } from "@/app/dashboard/agents/actions";

export default function NewAgentPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/agents"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to agents
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Create Agent Record
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Add an agent to NexFlow by saving its Bolna agent ID. This makes the
            agent available for call triggering, history mapping, and future
            dashboard actions.
          </p>
        </div>
      </div>

      <form
        action={createAgentAction}
        className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Agent details
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Use the exact Bolna agent ID from your Bolna account.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Agent name
            </label>
            <Input id="name" name="name" placeholder="Sales Qualifier" required className="h-11 rounded-xl" />
          </div>

          <div className="space-y-2">
            <label htmlFor="bolnaAgentId" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Bolna agent ID
            </label>
            <Input
              id="bolnaAgentId"
              name="bolnaAgentId"
              placeholder="agent_12345 or UUID from Bolna"
              required
              className="h-11 rounded-xl font-mono"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="prompt" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Notes or prompt summary
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={5}
              placeholder="Describe what this agent does, tone, qualification logic, or guardrails."
              className="flex min-h-32 w-full rounded-2xl border border-zinc-200 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:focus:border-zinc-600"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="voice" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Voice label
            </label>
            <Input id="voice" name="voice" placeholder="e.g. allison, rachel, male-en-us" className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tip: if you create agents directly in Bolna first, this page lets you import them into NexFlow immediately.
          </p>
          <Button type="submit" className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
            <Save className="mr-2 h-4 w-4" />
            Save agent
          </Button>
        </div>
      </form>
    </div>
  );
}
