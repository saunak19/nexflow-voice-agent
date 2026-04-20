// app/dashboard/loading.tsx — immediate skeleton on navigation to /dashboard
import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="hidden sm:block h-9 w-32 rounded-lg" />
      </div>

      {/* 4 primary stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* 4 secondary mini-stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card rounded-xl px-4 py-3 space-y-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>

      {/* Recent executions + top agents */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Executions list */}
        <div className="surface-card rounded-xl p-5 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 gap-3"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>

        {/* Top agents */}
        <div className="surface-card rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-12" />
              </div>
              <Skeleton className="h-1.5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
