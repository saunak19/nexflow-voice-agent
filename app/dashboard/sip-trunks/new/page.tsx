import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";

import { CreateTrunkForm } from "@/app/dashboard/sip-trunks/_components/create-trunk-form";

export default function NewSipTrunkPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/sip-trunks"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SIP Trunks
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
            <Network className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Create SIP Trunk
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Set up a connection to your proprietary voice carrier or PBX.
            </p>
          </div>
        </div>
      </div>

      <CreateTrunkForm />
    </div>
  );
}
