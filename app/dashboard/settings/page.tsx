import Link from "next/link";
import { Plug } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
          Manage your workspace preferences and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Link href="/dashboard/settings/providers">
          <Card className="hover:border-zinc-400 hover:shadow-md transition-all cursor-pointer h-full border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardHeader className="p-6">
              <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-4 text-zinc-700 dark:text-zinc-300">
                <Plug className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold">Integrations & Providers</CardTitle>
              <CardDescription className="text-sm mt-2 text-zinc-500 dark:text-zinc-400">
                Connect your external APIs for LLMs, Voice, and Telephony.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
      
    </div>
  );
}
