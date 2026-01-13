import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSwipe } from "./useSwipe";
import React from "react";

describe("useSwipe", () => {
  const mockOnSwipeLeft = vi.fn();
  const mockOnSwipeRight = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createTouchEvent = (
    type: "touchstart" | "touchmove" | "touchend",
    clientX: number,
    clientY: number
  ): React.TouchEvent => {
    return {
      type,
      touches: [{ clientX, clientY }] as any,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;
  };

  describe("Initialization", () => {
    it("should return touch event handlers", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      expect(result.current.onTouchStart).toBeDefined();
      expect(result.current.onTouchMove).toBeDefined();
      expect(result.current.onTouchEnd).toBeDefined();
      expect(typeof result.current.onTouchStart).toBe("function");
      expect(typeof result.current.onTouchMove).toBe("function");
      expect(typeof result.current.onTouchEnd).toBe("function");
    });

    it("should work with only onSwipeLeft handler", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
        })
      );

      expect(result.current.onTouchStart).toBeDefined();
      expect(result.current.onTouchMove).toBeDefined();
      expect(result.current.onTouchEnd).toBeDefined();
    });

    it("should work with only onSwipeRight handler", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      expect(result.current.onTouchStart).toBeDefined();
      expect(result.current.onTouchMove).toBeDefined();
      expect(result.current.onTouchEnd).toBeDefined();
    });

    it("should work with no handlers", () => {
      const { result } = renderHook(() => useSwipe({}));

      expect(result.current.onTouchStart).toBeDefined();
      expect(result.current.onTouchMove).toBeDefined();
      expect(result.current.onTouchEnd).toBeDefined();
    });
  });

  describe("Swipe Left Detection", () => {
    it("should detect swipe left when deltaX exceeds threshold", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=200
      result.current.onTouchStart(createTouchEvent("touchstart", 200, 100));

      // Move to x=140 (delta = -60, exceeds -50 threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 140, 100));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeLeft).toHaveBeenCalledTimes(1);
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });

    it("should not detect swipe left when deltaX is below threshold", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=200
      result.current.onTouchStart(createTouchEvent("touchstart", 200, 100));

      // Move to x=160 (delta = -40, below -50 threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 100));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });

    it("should detect swipe left at exact threshold (-50)", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
        })
      );

      // Start at x=200
      result.current.onTouchStart(createTouchEvent("touchstart", 200, 100));

      // Move to x=150 (delta = -50, exactly at threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 150, 100));

      // End touch
      result.current.onTouchEnd();

      // Should NOT trigger at exact threshold (needs to exceed)
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });

    it("should detect swipe left just beyond threshold (-51)", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
        })
      );

      // Start at x=200
      result.current.onTouchStart(createTouchEvent("touchstart", 200, 100));

      // Move to x=149 (delta = -51, just beyond threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 149, 100));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it("should not call handler if onSwipeLeft is not provided", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Swipe left gesture
      result.current.onTouchStart(createTouchEvent("touchstart", 200, 100));
      result.current.onTouchMove(createTouchEvent("touchmove", 140, 100));
      result.current.onTouchEnd();

      // No handler provided, so nothing should be called
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe("Swipe Right Detection", () => {
    it("should detect swipe right when deltaX exceeds threshold", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=100
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to x=160 (delta = +60, exceeds +50 threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 100));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });

    it("should not detect swipe right when deltaX is below threshold", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=100
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to x=140 (delta = +40, below +50 threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 140, 100));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).not.toHaveBeenCalled();
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });

    it("should detect swipe right at exact threshold (+50)", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=100
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to x=150 (delta = +50, exactly at threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 150, 100));

      // End touch
      result.current.onTouchEnd();

      // Should NOT trigger at exact threshold (needs to exceed)
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });

    it("should detect swipe right just beyond threshold (+51)", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=100
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to x=151 (delta = +51, just beyond threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 151, 100));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("should not call handler if onSwipeRight is not provided", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
        })
      );

      // Swipe right gesture
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 100));
      result.current.onTouchEnd();

      // No handler provided, so nothing should be called
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe("Vertical Swipe Rejection", () => {
    it("should not trigger horizontal swipe when vertical movement is dominant", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at (100, 100)
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to (140, 200) - deltaX = 40, deltaY = 100 (vertical dominant)
      result.current.onTouchMove(createTouchEvent("touchmove", 140, 200));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });

    it("should not trigger when vertical and horizontal deltas are equal", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at (100, 100)
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to (160, 160) - deltaX = 60, deltaY = 60 (equal)
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 160));

      // End touch
      result.current.onTouchEnd();

      // When equal, horizontal is NOT dominant, so no swipe
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });

    it("should trigger when horizontal movement is clearly dominant", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at (100, 100)
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to (170, 110) - deltaX = 70, deltaY = 10 (horizontal dominant)
      result.current.onTouchMove(createTouchEvent("touchmove", 170, 110));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("should handle negative vertical movement", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
        })
      );

      // Start at (200, 200)
      result.current.onTouchStart(createTouchEvent("touchstart", 200, 200));

      // Move to (140, 100) - deltaX = -60 (left), deltaY = -100 (up, dominant)
      result.current.onTouchMove(createTouchEvent("touchmove", 140, 100));

      // End touch
      result.current.onTouchEnd();

      // Vertical is dominant, so no horizontal swipe
      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe("Coordinate Reset", () => {
    it("should reset coordinates after touchEnd", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // First swipe
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 100));
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);

      // Second swipe - should work independently
      result.current.onTouchStart(createTouchEvent("touchstart", 200, 100));
      result.current.onTouchMove(createTouchEvent("touchmove", 260, 100));
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(2);
    });

    it("should not trigger swipe if touchEnd called without touchMove", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start touch
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // End without move (tap)
      result.current.onTouchEnd();

      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe("Multiple Touch Moves", () => {
    it("should use last touchMove position for swipe calculation", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=100
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));

      // Move to x=120 (delta = +20, below threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 120, 100));

      // Move to x=160 (delta = +60, exceeds threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 100));

      // End touch
      result.current.onTouchEnd();

      // Should trigger based on final position
      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("should handle direction change during swipe", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=150
      result.current.onTouchStart(createTouchEvent("touchstart", 150, 100));

      // Move right to x=180
      result.current.onTouchMove(createTouchEvent("touchmove", 180, 100));

      // Move left to x=90 (final delta = -60, swipe left)
      result.current.onTouchMove(createTouchEvent("touchmove", 90, 100));

      // End touch
      result.current.onTouchEnd();

      // Should trigger left based on final position
      expect(mockOnSwipeLeft).toHaveBeenCalledTimes(1);
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero movement", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start and end at same position
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));
      result.current.onTouchMove(createTouchEvent("touchmove", 100, 100));
      result.current.onTouchEnd();

      expect(mockOnSwipeLeft).not.toHaveBeenCalled();
      expect(mockOnSwipeRight).not.toHaveBeenCalled();
    });

    it("should handle very large swipe distances", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=0
      result.current.onTouchStart(createTouchEvent("touchstart", 0, 100));

      // Move to x=1000 (delta = +1000)
      result.current.onTouchMove(createTouchEvent("touchmove", 1000, 100));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("should handle negative coordinates", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeLeft: mockOnSwipeLeft,
        })
      );

      // Start at x=0
      result.current.onTouchStart(createTouchEvent("touchstart", 0, 0));

      // Move to x=-60 (delta = -60)
      result.current.onTouchMove(createTouchEvent("touchmove", -60, 0));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it("should handle fractional coordinates", () => {
      const { result } = renderHook(() =>
        useSwipe({
          onSwipeRight: mockOnSwipeRight,
        })
      );

      // Start at x=100.5
      result.current.onTouchStart(createTouchEvent("touchstart", 100.5, 100.5));

      // Move to x=151.7 (delta = +51.2, exceeds threshold)
      result.current.onTouchMove(createTouchEvent("touchmove", 151.7, 100.5));

      // End touch
      result.current.onTouchEnd();

      expect(mockOnSwipeRight).toHaveBeenCalledTimes(1);
    });
  });

  describe("Handler Updates", () => {
    it("should use updated handlers on subsequent swipes", () => {
      const firstHandler = vi.fn();
      const secondHandler = vi.fn();

      const { result, rerender } = renderHook(
        ({ handler }) => useSwipe({ onSwipeRight: handler }),
        { initialProps: { handler: firstHandler } }
      );

      // First swipe with first handler
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 100));
      result.current.onTouchEnd();

      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled();

      // Update handler
      rerender({ handler: secondHandler });

      // Second swipe with second handler
      result.current.onTouchStart(createTouchEvent("touchstart", 100, 100));
      result.current.onTouchMove(createTouchEvent("touchmove", 160, 100));
      result.current.onTouchEnd();

      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).toHaveBeenCalledTimes(1);
    });
  });
});
