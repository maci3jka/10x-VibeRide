import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeEventHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

const MIN_SWIPE_DISTANCE = 50; // minimum distance in pixels to trigger swipe

/**
 * Custom hook for handling swipe gestures on mobile
 * Returns touch event handlers to attach to an element
 */
export function useSwipe(handlers: SwipeHandlers): SwipeEventHandlers {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;

    // Check if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Swipe left
      if (deltaX < -MIN_SWIPE_DISTANCE && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      }
      // Swipe right
      else if (deltaX > MIN_SWIPE_DISTANCE && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      }
    }

    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  }, [handlers]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
