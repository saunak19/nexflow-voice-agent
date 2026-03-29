"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { syncAgentsAction } from "@/app/dashboard/agents/actions";

export function SyncAgentsButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncAgentsAction();
      toast.success(`Synced ${result.synced} of ${result.total} agents from Bolna`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sync failed";
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="rounded-xl"
      onClick={handleSync}
      disabled={isSyncing}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing…" : "Sync from Bolna"}
    </Button>
  );
}
