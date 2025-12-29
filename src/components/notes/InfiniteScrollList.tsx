import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface InfiniteScrollListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  onReachBottom: () => void;
  hasMore: boolean;
  isLoading: boolean;
  loadingComponent?: ReactNode;
  emptyComponent?: ReactNode;
  className?: string;
}

/**
 * InfiniteScrollList - generic infinite scroll list component
 * Uses IntersectionObserver to detect when user scrolls near bottom
 */
export function InfiniteScrollList<T>({
  items,
  renderItem,
  onReachBottom,
  hasMore,
  isLoading,
  loadingComponent,
  emptyComponent,
  className = "",
}: InfiniteScrollListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Trigger fetch when sentinel is visible and we have more items
        if (entry.isIntersecting && hasMore && !isLoading) {
          onReachBottom();
        }
      },
      {
        root: null, // viewport
        rootMargin: "100px", // trigger 100px before reaching sentinel
        threshold: 0,
      }
    );

    observerRef.current.observe(sentinelRef.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, onReachBottom]);

  // Show empty state if no items and not loading
  if (items.length === 0 && !isLoading && emptyComponent) {
    return <>{emptyComponent}</>;
  }

  return (
    <div className={className}>
      {/* List items */}
      <ul role="list" className="space-y-3">
        {items.map((item, index) => (
          <li key={index}>{renderItem(item, index)}</li>
        ))}
      </ul>

      {/* Loading indicator */}
      {isLoading && loadingComponent && (
        <div className="mt-4" aria-live="polite" aria-busy="true">
          {loadingComponent}
        </div>
      )}

      {/* Sentinel element for intersection observer */}
      {hasMore && !isLoading && (
        <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      )}

      {/* End of list indicator */}
      {!hasMore && items.length > 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground" aria-live="polite">
          No more notes to load
        </div>
      )}
    </div>
  );
}

