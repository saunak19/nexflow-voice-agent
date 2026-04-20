// app/dashboard/batches/loading.tsx
// Shows immediately when navigating to /dashboard/batches
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function BatchesLoading() {
  return (
    <div className="space-y-6">
      {/* Header row: title + filter + button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <TableSkeleton rows={6} cols={7} />
    </div>
  );
}
