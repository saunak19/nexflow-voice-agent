import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant";
import { CreateBatchForm } from "./_components/create-batch-form";
import { bolnaClient } from "@/lib/bolna-client";
export default async function NewBatchPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  // Fetch agents scoped to tenant
  const agents = await prisma.agent.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  let phoneNumbers: { phone_number: string }[] = [];
  try {
    phoneNumbers = await bolnaClient.listPhoneNumbers();
  } catch (e) {
    phoneNumbers = [];
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/batches"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to batches
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Upload new batch
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Upload a CSV contact list and efficiently run high-volume automated voice campaigns.
        </p>
      </div>

      <CreateBatchForm agents={agents} phoneNumbers={phoneNumbers} />
    </div>
  );
}
