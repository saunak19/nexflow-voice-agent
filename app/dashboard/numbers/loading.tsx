// app/dashboard/numbers/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

function NumberRowSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
  );
}

export default function NumbersLoading() {
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Layout: 2/3 + 1/3 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: active numbers */}
        <div className="lg:col-span-2">
          <div className="surface-card rounded-xl p-5 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <NumberRowSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: quick purchase + billing */}
        <div className="space-y-4">
          <div className="surface-card rounded-xl p-5 space-y-4">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 rounded-lg" />
            </div>
          </div>
          <div className="surface-card rounded-xl p-5 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
