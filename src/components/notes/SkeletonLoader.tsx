/**
 * SkeletonLoader - loading placeholder for note cards
 */
export function SkeletonLoader() {
  return (
    <div className="rounded-lg border bg-card p-4 animate-pulse">
      <div className="space-y-3">
        {/* Title skeleton */}
        <div className="h-5 bg-muted rounded w-3/4" />
        
        {/* Text snippet skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
        
        {/* Footer skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-6 bg-muted rounded w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonList - renders multiple skeleton loaders
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} />
      ))}
    </>
  );
}


