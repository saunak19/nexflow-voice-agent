// app/dashboard/agents/loading.tsx
// Shows immediately when navigating to /dashboard/agents
import { Skeleton } from "@/components/ui/skeleton";

function AgentCardSkeleton() {
  return (
    <div className="surface-card rounded-xl p-5 space-y-4">
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* Name + ID */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      {/* Prompt lines */}
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-4/6" />
      </div>
      {/* Footer dates */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-28" />
      </div>
      {/* Action button */}
      <Skeleton className="h-9 w-full rounded-lg mt-2" />
      {/* Edit / Delete row */}
      <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export default function AgentsLoading() {
  return (
    <div className="space-y-6">
      {/* Heading + buttons */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Agent cards grid — 3 columns like the actual page */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
