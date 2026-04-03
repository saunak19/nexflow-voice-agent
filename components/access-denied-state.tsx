import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AccessDeniedStateProps = {
  title?: string;
  description?: string;
};

export function AccessDeniedState({
  title = "Access Denied",
  description = "You are signed in, but your workspace role does not allow access to this page. Ask a workspace owner or admin for access.",
}: AccessDeniedStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 animate-in fade-in duration-300">
      <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <CardHeader className="px-8 pt-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {title}
          </CardTitle>
          <CardDescription className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Button asChild className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
