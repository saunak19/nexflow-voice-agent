// app/dashboard/calls/loading.tsx
// Shows immediately when navigating to /dashboard/calls
import { Skeleton } from "@/components/ui/skeleton";

function MetricCardSkeleton() {
  return (
    <div className="surface-card rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export default function CallsLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>

      {/* 6 metric cards — 3 columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Detailed logs section */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-6 w-32" />
        {/* Table */}
        <div className="surface-card rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-6 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            {["w-32", "w-28", "w-20", "w-16", "w-16", "w-20", "w-24"].map((w, i) => (
              <Skeleton key={i} className={`h-3 shrink-0 ${w}`} />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-6 px-5 py-3.5 ${i < 6 ? "border-b border-zinc-100 dark:border-zinc-800" : ""}`}>
              {["w-32", "w-28", "w-20", "w-16", "w-16", "w-20", "w-24"].map((w, j) => (
                <Skeleton key={j} className={`h-4 shrink-0 ${w}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
