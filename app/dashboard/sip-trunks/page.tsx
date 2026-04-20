import Link from "next/link";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { 
  Network, 
  Plus, 
  Trash2, 
  Settings,
  ShieldCheck,
  Server
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentTenantId } from "@/lib/tenant";
import { deleteSipTrunkAction } from "@/app/dashboard/sip-trunks/actions";
import { MotionList, MotionItem } from "@/components/ui/motion-list";

export default async function SipTrunksPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const trunks = await prisma.sipTrunk.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            SIP Trunks
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Bring your own carrier via SIP trunking for advanced outbound/inbound needs.
          </p>
        </div>
        <div className="flex gap-2">
            <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
              <Link href="/dashboard/sip-trunks/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Trunk
              </Link>
            </Button>
        </div>
      </div>

      {trunks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 p-20 text-center dark:border-zinc-800">
           <div className="h-20 w-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
             <Server className="h-10 w-10 text-zinc-400" />
           </div>
           <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">No SIP trunks configured</h3>
           <p className="mt-2 text-zinc-500 dark:text-zinc-400 max-w-sm">
             Configure SIP trunks to use your own VOIP provider for lower costs and custom number management.
           </p>
           <div className="mt-8">
              <Button asChild className="rounded-xl bg-zinc-900 text-white shadow-lg">
                <Link href="/dashboard/sip-trunks/new">New SIP Trunk</Link>
              </Button>
           </div>
        </div>
      ) : (
        <MotionList className="grid grid-cols-1 gap-6 md:grid-cols-2">
           {trunks.map((trunk) => (
             <MotionItem key={trunk.id} className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-50">
                     <Network className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                     <ShieldCheck className="h-3.5 w-3.5" />
                     ACTIVE
                  </div>
                </div>
                <div className="mt-4">
                   <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{trunk.name}</h3>
                   <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-zinc-500 flex items-center gap-2">
                         <span className="font-semibold uppercase tracking-widest text-[10px]">Inbound:</span>
                         <span className="truncate max-w-[200px]">{trunk.inboundUrl || "none"}</span>
                      </p>
                      <p className="text-xs text-zinc-500 flex items-center gap-2">
                         <span className="font-semibold uppercase tracking-widest text-[10px]">Outbound:</span>
                         <span className="truncate max-w-[200px]">{trunk.outboundUrl || "none"}</span>
                      </p>
                   </div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
                   <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-tighter">PROVIDER: {trunk.bolnaTrunkId || "GENERIC_SIP"}</span>
                   <div className="flex gap-2">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                         <Link href="/dashboard/sip-trunks/new">
                           <Settings className="h-4 w-4" />
                         </Link>
                      </Button>
                      <form action={deleteSipTrunkAction}>
                         <input type="hidden" name="id" value={trunk.id} />
                         <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </form>
                   </div>
                </div>
             </MotionItem>
           ))}
        </MotionList>
      )}
    </div>
  );
}
