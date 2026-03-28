import Link from "next/link";
import { ArrowLeft, Network, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSipTrunkAction } from "@/app/dashboard/sip-trunks/actions";

export default function NewSipTrunkPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/sip-trunks"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SIP trunks
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Create SIP Trunk
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Save your SIP endpoints so the team can manage trunk configuration from the dashboard.
        </p>
      </div>

      <form
        action={createSipTrunkAction}
        className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <Network className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Trunk details
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Use this page for quick setup even before live provider sync is added.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Trunk name
            </label>
            <Input id="name" name="name" placeholder="Primary Twilio SIP" required className="h-11 rounded-xl" />
          </div>

          <div className="space-y-2">
            <label htmlFor="inboundUrl" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Inbound URL
            </label>
            <Input id="inboundUrl" name="inboundUrl" placeholder="sip:inbound.example.com" className="h-11 rounded-xl" />
          </div>

          <div className="space-y-2">
            <label htmlFor="outboundUrl" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Outbound URL
            </label>
            <Input id="outboundUrl" name="outboundUrl" placeholder="sip:outbound.example.com" className="h-11 rounded-xl" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="bolnaTrunkId" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Bolna trunk ID
            </label>
            <Input id="bolnaTrunkId" name="bolnaTrunkId" placeholder="Optional" className="h-11 rounded-xl font-mono" />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Once your provider API flow is ready, these records can be synced with Bolna automatically.
          </p>
          <Button type="submit" className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
            <Save className="mr-2 h-4 w-4" />
            Save trunk
          </Button>
        </div>
      </form>
    </div>
  );
}
