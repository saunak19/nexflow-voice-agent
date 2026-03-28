import { auth } from "@/lib/auth";
import { 
  PhoneCall, 
  Users, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";

const stats = [
  { name: "Total Calls", value: "0", icon: PhoneCall, change: "+0%", changeType: "increase" },
  { name: "Active Agents", value: "0", icon: Users, change: "+0%", changeType: "increase" },
  { name: "Successful", value: "0", icon: CheckCircle2, change: "+0%", changeType: "increase" },
  { name: "Failed", value: "0", icon: XCircle, change: "0%", changeType: "neutral" },
];

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back, {session?.user?.name || "Admin"}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Here&apos;s what&apos;s happening with your Voice AI agents today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 transition-all hover:shadow-md group"
          >
            <dt>
              <div className="absolute rounded-xl bg-zinc-900 p-3 text-white dark:bg-zinc-800 group-hover:scale-110 transition-transform">
                <stat.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600 dark:text-green-400">
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Recent Executions
          </h3>
          <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
            No recent calls found
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Top Performing Agents
          </h3>
          <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
            No agents configured
          </div>
        </div>
      </div>
    </div>
  );
}
