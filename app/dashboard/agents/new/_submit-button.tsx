"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="h-11 min-w-[160px] rounded-xl bg-zinc-900 px-6 text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Agent…
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Create Agent
        </>
      )}
    </Button>
  );
}
