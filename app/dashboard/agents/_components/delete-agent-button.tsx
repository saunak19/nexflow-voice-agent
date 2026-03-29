"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteAgentAction } from "@/app/dashboard/agents/actions";

interface DeleteAgentButtonProps {
  localId: string;
  bolnaId: string;
}

export function DeleteAgentButton({ localId, bolnaId }: DeleteAgentButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    
    startTransition(async () => {
      try {
        await deleteAgentAction(localId, bolnaId);
      } catch (error) {
        console.error("Failed to delete agent", error);
        alert("Failed to delete agent");
      }
    });
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleDelete} 
      disabled={isPending}
      className="flex-1 rounded-lg px-3 text-xs border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
    >
      <Trash2 className="mr-2 h-3.5 w-3.5" />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
