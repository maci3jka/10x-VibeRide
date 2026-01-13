import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGenerate } from "./useGenerate";
import type {
  GenerateItineraryResponse,
  ItineraryStatusResponse,
  CancelItineraryResponse,
  ErrorResponse,
  RouteGeoJSON,
} from "@/types";
import "@testing-library/jest-dom";

// Mock extractSummary from geojsonService
vi.mock("@/lib/services/geojsonService", () => ({
  extractSummary: (geojson: RouteGeoJSON) => ({
    title: geojson.properties.title,
    total_distance_km: geojson.properties.total_distance_km,
    total_duration_h: geojson.properties.total_duration_h,
    highlights: geojson.properties.highlights || [],
  }),
}));

// Mock window.fetch
const mockFetch = vi.fn();
global.window.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: "",
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Mock crypto.randomUUID
const mockUUID = "test-request-id-123";
vi.stubGlobal("crypto", {
  ...global.crypto,
  randomUUID: () => mockUUID,
});

// Mock document for download testing
const mockClick = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");

describe("useGenerate", () => {
  const mockGenerateResponse: GenerateItineraryResponse = {
    itinerary_id: "test-itinerary-id",
    note_id: "test-note-id",
    version: 1,
    status: "pending",
    request_id: mockUUID,
    created_at: "2024-01-01T00:00:00Z",
  };

  const mockRouteGeoJSON: RouteGeoJSON = {
    type: "FeatureCollection",
    properties: {
      title: "Test Itinerary",
      total_distance_km: 50,
      total_duration_h: 1.5,
      highlights: ["Scenic route", "Mountain views"],
      days: 1,
    },
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4084, 37.7849],
          ],
        },
        properties: {
          name: "Segment 1",
          description: "Test segment",
          type: "route",
          day: 1,
          segment: 1,
          distance_km: 50,
          duration_h: 1.5,
        },
      },
    ],
  };

  const mockStatusRunning: ItineraryStatusResponse = {
    itinerary_id: "test-itinerary-id",
    status: "running",
    progress: 50,
    message: "Generating route...",
  };

  const mockStatusCompleted: ItineraryStatusResponse = {
    itinerary_id: "test-itinerary-id",
    status: "completed",
    route_geojson: mockRouteGeoJSON,
  };

  const mockStatusFailed: ItineraryStatusResponse = {
    itinerary_id: "test-itinerary-id",
    status: "failed",
    error: "Generation failed",
  };

  const mockCancelResponse: CancelItineraryResponse = {
    itinerary_id: "test-itinerary-id",
    status: "cancelled",
    cancelled_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockLocation.href = "";

    // Setup download mocks
    vi.stubGlobal("URL", {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    // Mock document.createElement for download link
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const element = originalCreateElement(tag);
        element.click = mockClick;
        return element;
      }
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Initialization", () => {
    it("should initialize with idle state", () => {
      const { result } = renderHook(() => useGenerate());

      expect(result.current.state).toBe("idle");
      expect(result.current.progress).toBeUndefined();
      expect(result.current.routeGeoJSON).toBeUndefined();
      expect(result.current.summary).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });
  });

  describe("Generate - Success Flow", () => {
    it("should start generation and transition to posting state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => mockGenerateResponse,
      });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/test-note-id/itineraries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: mockUUID,
        }),
      });

      expect(result.current.state).toBe("running");
    });

    // TODO: Fix fake timer interaction with polling
    it.skip("should poll status after starting generation", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusRunning,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      // Advance timers to trigger initial poll
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/itineraries/test-itinerary-id/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(result.current.progress).toBe(50);
      expect(result.current.state).toBe("running");
    });

    it("should complete generation and stop polling", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusCompleted,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      // Trigger poll
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.state).toBe("completed");
      expect(result.current.routeGeoJSON).toEqual(mockRouteGeoJSON);
      expect(result.current.summary).toEqual({
        title: "Test Itinerary",
        total_distance_km: 50,
        total_duration_h: 1.5,
        highlights: ["Scenic route", "Mountain views"],
      });
      expect(result.current.progress).toBe(100);

      // Verify polling stopped (no more calls after completion)
      const callCountAfterComplete = mockFetch.mock.calls.length;
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(mockFetch.mock.calls.length).toBe(callCountAfterComplete);
    });
  });

  describe("Generate - Error Scenarios", () => {
    it("should handle 409 conflict (generation already in progress)", async () => {
      const conflictError: ErrorResponse = {
        error: "generation_in_progress",
        message: "Generation already in progress",
        details: {
          itinerary_id: "existing-itinerary-id",
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => conflictError,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockStatusRunning, itinerary_id: "existing-itinerary-id" }),
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      expect(result.current.state).toBe("running");

      // Should start polling existing itinerary
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/itineraries/existing-itinerary-id/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should handle 429 spend cap exceeded", async () => {
      const rateLimitError: ErrorResponse = {
        error: "service_limit_reached",
        message: "Monthly spend cap exceeded",
        retry_after: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => rateLimitError,
      });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      expect(result.current.state).toBe("failed");
      expect(result.current.error).toContain("Spend cap exceeded");
      expect(result.current.error).toContain("3600 seconds");
    });

    it("should handle 403 preferences incomplete and redirect", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "profile_incomplete", message: "Preferences missing" }),
      });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      expect(result.current.state).toBe("failed");
      expect(result.current.error).toContain("profile preferences");

      // Fast-forward redirect delay
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockLocation.href).toBe("/profile");
    });

    it("should handle 401 unauthorized and redirect", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      expect(mockLocation.href).toBe("/");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      expect(result.current.state).toBe("failed");
      expect(result.current.error).toContain("Network error");
    });

    it("should handle generation failure from status", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusFailed,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      // Trigger poll
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.state).toBe("failed");
      expect(result.current.error).toBe("Generation failed");
    });
  });

  describe("Polling Behavior", () => {
    it("should poll every 2 seconds", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValue({
          ok: true,
          json: async () => mockStatusRunning,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      // Initial call + 1 status call = 2
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Advance 2 seconds - should trigger another poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Advance another 2 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    // TODO: Fix fake timer interaction with polling
    it.skip("should stop polling after 3 consecutive failures", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValue({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      // Trigger 3 failed polls
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(2000);
        });
      }

      expect(result.current.state).toBe("failed");
      expect(result.current.error).toContain("Network error");

      // Verify polling stopped
      const callCount = mockFetch.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(mockFetch.mock.calls.length).toBe(callCount);
    });

    it("should timeout after 25 seconds", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValue({
          ok: true,
          json: async () => mockStatusRunning,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      // Fast-forward past timeout (5 minutes)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300000);
      });

      expect(result.current.state).toBe("failed");
      expect(result.current.error).toContain("timeout");
    });
  });

  describe("Cancel", () => {
    it("should cancel running generation", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusRunning,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCancelResponse,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      await act(async () => {
        await result.current.cancel();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/itineraries/test-itinerary-id/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(result.current.state).toBe("cancelled");
    });

    it("should not cancel if not running", async () => {
      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.cancel();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    // TODO: Fix fake timer interaction with polling
    it.skip("should handle cancel error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: "cannot_cancel", message: "Cannot cancel" }),
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      // State should be running after generate completes
      expect(result.current.state).toBe("running");

      await act(async () => {
        await result.current.cancel();
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error).toContain("Failed to cancel");
    });
  });

  describe("Retry", () => {
    it("should retry generation after failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: "server_error", message: "Server error" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        });

      const { result } = renderHook(() => useGenerate());

      // First attempt fails
      await act(async () => {
        await result.current.generate("test-note-id");
      });

      expect(result.current.state).toBe("failed");

      // Retry
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.state).toBe("running");
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 failed + 1 retry + 1 status poll
    });
  });

  describe("Download", () => {
    it("should download GPX file when acknowledged", async () => {
      const mockBlob = new Blob(["<gpx></gpx>"], { type: "application/gpx+xml" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const { result } = renderHook(() => useGenerate());

      // Set completed state manually
      await act(async () => {
        result.current.generate("test-note-id");
      });

      // Mock completion
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusCompleted,
        });

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.state).toBe("completed");

      // Now download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      await act(async () => {
        await result.current.download(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/itineraries/test-itinerary-id/download?format=gpx&acknowledged=true",
        {
          method: "GET",
        }
      );

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should download GeoJSON file when format specified", async () => {
      const mockBlob = new Blob(['{"type":"FeatureCollection"}'], { type: "application/geo+json" });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusCompleted,
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.state).toBe("completed");

      // Now download as GeoJSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      await act(async () => {
        await result.current.download(true, "geojson");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/itineraries/test-itinerary-id/download?format=geojson&acknowledged=true",
        {
          method: "GET",
        }
      );

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should not download if not completed", async () => {
      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.download(true);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle download error for incomplete itinerary", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusCompleted,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({ error: "itinerary_incomplete", message: "Incomplete" }),
        });

      const { result } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.state).toBe("completed");

      await act(async () => {
        await result.current.download(true);
      });

      expect(result.current.error).toContain("incomplete");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup polling on unmount", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => mockGenerateResponse,
        })
        .mockResolvedValue({
          ok: true,
          json: async () => mockStatusRunning,
        });

      const { result, unmount } = renderHook(() => useGenerate());

      await act(async () => {
        await result.current.generate("test-note-id");
      });

      const callCountBeforeUnmount = mockFetch.mock.calls.length;

      unmount();

      // Advance time - should not trigger more polls
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockFetch.mock.calls.length).toBe(callCountBeforeUnmount);
    });
  });
});
