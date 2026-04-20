import { cn } from "@/lib/utils";

/** Base skeleton block — shimmering placeholder for any content shape */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-base", className)}
      {...props}
    />
  );
}

/** Preset: stat card skeleton (icon box + label + value) */
function StatCardSkeleton() {
  return (
    <div className="surface-card rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Preset: a single table row */
function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  const widths = ["w-24", "w-40", "w-16", "w-20", "w-16", "w-24", "w-16"];
  return (
    <div className="flex items-center gap-6 px-5 py-3.5">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 shrink-0", widths[i] ?? "w-20")}
        />
      ))}
    </div>
  );
}

/** Preset: full table with header + rows */
function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  const headerWidths = ["w-20", "w-36", "w-20", "w-24", "w-16", "w-28", "w-16"];
  return (
    <div className="surface-card rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="flex items-center gap-6 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3 shrink-0", headerWidths[i] ?? "w-20")}
          />
        ))}
      </div>
      {/* Rows with separator */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={i < rows - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""}>
          <TableRowSkeleton cols={cols} />
        </div>
      ))}
    </div>
  );
}

/** Preset: page heading + sub-text */
function HeadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

export { Skeleton, StatCardSkeleton, TableSkeleton, TableRowSkeleton, HeadingSkeleton };
