import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePastItineraries } from "./usePastItineraries";
import type { ItineraryListItemResponse, ErrorResponse } from "@/types";

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

describe("usePastItineraries", () => {
  const noteId = "test-note-id";

  const mockItineraries: ItineraryListItemResponse[] = [
    {
      itinerary_id: "itinerary-1",
      note_id: noteId,
      version: 1,
      status: "completed",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:01:00Z",
    },
    {
      itinerary_id: "itinerary-2",
      note_id: noteId,
      version: 2,
      status: "completed",
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:01:00Z",
    },
    {
      itinerary_id: "itinerary-3",
      note_id: noteId,
      version: 3,
      status: "completed",
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:01:00Z",
    },
  ];

  const mockErrorResponse: ErrorResponse = {
    error: "server_error",
    message: "Failed to fetch itineraries",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with empty itineraries array when noteId is undefined", () => {
      const { result } = renderHook(() => usePastItineraries(undefined));

      expect(result.current.itineraries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should not fetch when noteId is undefined", () => {
      renderHook(() => usePastItineraries(undefined));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch itineraries when noteId is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/notes/${noteId}/itineraries?status=completed&limit=10`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      });
    });
  });

  describe("Fetch Itineraries", () => {
    it("should fetch and set itineraries successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries).toEqual(mockItineraries);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it("should set isLoading to true during fetch", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => usePastItineraries(noteId));

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should use correct query parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        const expectedUrl = `/api/notes/${noteId}/itineraries?status=completed&limit=10`;
        expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
      });
    });

    it("should filter to completed status only", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        const callUrl = mockFetch.mock.calls[0][0];
        expect(callUrl).toContain("status=completed");
      });
    });

    it("should limit to 10 itineraries", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        const callUrl = mockFetch.mock.calls[0][0];
        expect(callUrl).toContain("limit=10");
      });
    });

    it("should handle empty itineraries array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries).toEqual([]);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle 401 unauthorized and redirect", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(mockLocation.href).toBe("/");
      });
    });

    it("should handle server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse,
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.error).toEqual(mockErrorResponse);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.itineraries).toEqual([]);
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.error).toEqual({
          error: "network_error",
          message: "Failed to fetch past itineraries. Please check your connection.",
        });
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should clear error on successful refetch", async () => {
      // First fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse,
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Refetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.itineraries).toEqual(mockItineraries);
      });
    });
  });

  describe("Refetch", () => {
    it("should refetch itineraries when called", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockItineraries[0]] }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries).toHaveLength(1);
      });

      // Refetch with different data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.itineraries).toHaveLength(3);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it("should set isLoading during refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveRefetch: (value: any) => void;
      const refetchPromise = new Promise((resolve) => {
        resolveRefetch = resolve;
      });

      mockFetch.mockReturnValueOnce(refetchPromise);

      act(() => {
        result.current.refetch();
      });

      // Should be loading during refetch
      expect(result.current.isLoading).toBe(true);

      // Resolve refetch
      resolveRefetch!({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should replace existing itineraries on refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockItineraries[0], mockItineraries[1]] }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries).toHaveLength(2);
      });

      // Refetch with single itinerary
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockItineraries[2]] }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.itineraries).toHaveLength(1);
        expect(result.current.itineraries[0].itinerary_id).toBe("itinerary-3");
      });
    });
  });

  describe("NoteId Changes", () => {
    it("should refetch when noteId changes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockItineraries[0]] }),
      });

      const { rerender } = renderHook(
        ({ id }) => usePastItineraries(id),
        { initialProps: { id: "note-1" } }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Change noteId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockItineraries[1]] }),
      });

      rerender({ id: "note-2" });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith(
          "/api/notes/note-2/itineraries?status=completed&limit=10",
          expect.any(Object)
        );
      });
    });

    it("should clear itineraries when noteId becomes undefined", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      const { result, rerender } = renderHook(
        ({ id }) => usePastItineraries(id),
        { initialProps: { id: noteId } }
      );

      await waitFor(() => {
        expect(result.current.itineraries).toHaveLength(3);
      });

      // Change to undefined
      rerender({ id: undefined });

      expect(result.current.itineraries).toEqual([]);
    });

    it("should not fetch when noteId changes from undefined to undefined", () => {
      const { rerender } = renderHook(
        ({ id }) => usePastItineraries(id),
        { initialProps: { id: undefined } }
      );

      expect(mockFetch).not.toHaveBeenCalled();

      rerender({ id: undefined });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Data Handling", () => {
    it("should handle itineraries with all fields", async () => {
      const completeItinerary: ItineraryListItemResponse = {
        itinerary_id: "complete-itinerary",
        note_id: noteId,
        version: 5,
        status: "completed",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:05:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [completeItinerary] }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries[0]).toEqual(completeItinerary);
      });
    });

    it("should maintain itinerary order from API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries[0].itinerary_id).toBe("itinerary-1");
        expect(result.current.itineraries[1].itinerary_id).toBe("itinerary-2");
        expect(result.current.itineraries[2].itinerary_id).toBe("itinerary-3");
      });
    });

    it("should handle itineraries with different versions", async () => {
      const itinerariesWithVersions = [
        { ...mockItineraries[0], version: 1 },
        { ...mockItineraries[1], version: 5 },
        { ...mockItineraries[2], version: 10 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: itinerariesWithVersions }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries[0].version).toBe(1);
        expect(result.current.itineraries[1].version).toBe(5);
        expect(result.current.itineraries[2].version).toBe(10);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle exactly 10 itineraries (limit)", async () => {
      const tenItineraries = Array.from({ length: 10 }, (_, i) => ({
        itinerary_id: `itinerary-${i}`,
        note_id: noteId,
        version: i + 1,
        status: "completed" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:01:00Z",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: tenItineraries }),
      });

      const { result } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(result.current.itineraries).toHaveLength(10);
      });
    });

    it("should handle noteId with special characters", async () => {
      const specialNoteId = "550e8400-e29b-41d4-a716-446655440000";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderHook(() => usePastItineraries(specialNoteId));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/notes/${specialNoteId}/itineraries?status=completed&limit=10`,
          expect.any(Object)
        );
      });
    });

    it("should not fetch on rerender with same noteId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockItineraries }),
      });

      const { rerender } = renderHook(() => usePastItineraries(noteId));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Rerender with same noteId
      rerender();

      // Should not fetch again
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle rapid noteId changes", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { rerender } = renderHook(
        ({ id }) => usePastItineraries(id),
        { initialProps: { id: "note-1" } }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Rapid changes
      rerender({ id: "note-2" });
      rerender({ id: "note-3" });
      rerender({ id: "note-4" });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });
    });
  });
});
