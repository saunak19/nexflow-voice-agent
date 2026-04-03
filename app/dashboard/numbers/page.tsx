import Link from "next/link";
import { auth } from "@/lib/auth";
import { 
  Hash, 
  Plus, 
  Trash2, 
  Globe,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deletePhoneNumberAction } from "@/app/dashboard/numbers/actions";
import { ImportNumberModal } from "./_components/import-number-modal";
import { getCurrentTenantId } from "@/lib/tenant";
import { listTenantPhoneNumbers } from "@/lib/tenant-phone-numbers";
import { getTenantVoiceProviderRuntime } from "@/lib/voice-providers";

function getNumberProviderLabel(provider?: string | null) {
  const normalized = provider?.trim().toLowerCase();

  switch (normalized) {
    case "twilio":
      return "Managed via Twilio";
    case "plivo":
      return "Managed via Plivo";
    case "bolna":
      return "Managed by NexFlow";
    default:
      return "Workspace-managed number";
  }
}

export default async function NumbersPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);
  const runtime = await getTenantVoiceProviderRuntime(tenantId);
  let numbers: Array<{
    phone_number: string;
    locality?: string | null;
    region?: string | null;
    friendly_name?: string | null;
    telephony_provider?: string | null;
  }> = [];
  let loadError = "";

  try {
    numbers = await listTenantPhoneNumbers(tenantId);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load phone numbers.";
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Phone Numbers
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Provision and manage the caller IDs assigned to this workspace. Number inventory is currently routed through {runtime.resolvedMode === "twilio-direct" ? "Direct Twilio" : runtime.resolvedMode === "plivo-direct" ? "Direct Plivo" : "NexFlow Managed"}.
          </p>
        </div>
        <div className="flex gap-3">
            <ImportNumberModal />
            <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
              <Link href="/dashboard/numbers/search">
                <Plus className="mr-2 h-4 w-4" />
                Buy Number
              </Link>
            </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
         <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
               <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Your Active Numbers</h3>
               {numbers.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-12 py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <Hash className="h-12 w-12 text-zinc-300 mb-4" />
                    <p className="text-zinc-500 dark:text-zinc-400">No active phone numbers found.</p>
                    <Button asChild variant="link" className="mt-2 text-zinc-900 dark:text-zinc-50 font-bold underline">
                      <Link href="/dashboard/numbers/search">Search available numbers</Link>
                    </Button>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {numbers.map((number) => (
                     <div
                       key={number.phone_number}
                       className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between"
                     >
                        <div>
                          <p className="font-mono text-base font-semibold text-zinc-900 dark:text-zinc-50">
                            {number.phone_number}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {[number.locality, number.region].filter(Boolean).join(", ") || number.friendly_name || "Workspace number"}
                          </p>
                          <p className="mt-2 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            {getNumberProviderLabel(number.telephony_provider)}
                          </p>
                        </div>
                       <form action={deletePhoneNumberAction}>
                         <input type="hidden" name="phoneNumber" value={number.phone_number} />
                         <Button variant="outline" type="submit" className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20">
                           <Trash2 className="mr-2 h-4 w-4" />
                           Remove
                         </Button>
                       </form>
                     </div>
                   ))}
                 </div>
               )}
            </div>
         </div>

         <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
               <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Globe className="h-4 w-4" />
                 Quick Purchase
               </h3>
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Country</label>
                    <Input placeholder="USA (+1)" disabled className="bg-zinc-50 dark:bg-zinc-900 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Area Code</label>
                    <Input placeholder="e.g. 415" className="rounded-xl" />
                  </div>
                  <Button asChild className="w-full rounded-xl bg-zinc-900 text-white">
                    <Link href="/dashboard/numbers/search">Search Numbers</Link>
                  </Button>
               </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/30">
               <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <AlertCircle className="h-3.5 w-3.5 italic" />
                 Billing Info
               </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Provisioned numbers are billed by the active provider account for this workspace. Make sure the linked provider or managed calling account has sufficient balance before purchasing.
                </p>
             </div>
         </div>
      </div>
    </div>
  );
}
