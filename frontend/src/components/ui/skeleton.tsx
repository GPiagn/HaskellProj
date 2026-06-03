import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md skeleton-shimmer", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Skeleton shaped like a line of text */
export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: i === lines - 1 && lines > 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}
