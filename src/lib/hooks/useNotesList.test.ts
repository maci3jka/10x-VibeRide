import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotesList } from "./useNotesList";
import type { NoteListItemResponse, ErrorResponse } from "@/types";

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

describe("useNotesList", () => {
  const mockNotes: NoteListItemResponse[] = [
    {
      note_id: "note-1",
      title: "First Note",
      note_text: "Content of first note",
      trip_prefs: {},
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      archived_at: null,
    },
    {
      note_id: "note-2",
      title: "Second Note",
      note_text: "Content of second note",
      trip_prefs: { terrain: "paved" },
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      archived_at: null,
    },
    {
      note_id: "note-3",
      title: "Third Note",
      note_text: "Content of third note",
      trip_prefs: {},
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:00:00Z",
      archived_at: null,
    },
  ];

  const mockErrorResponse: ErrorResponse = {
    error: "server_error",
    message: "Failed to fetch notes",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with empty notes array and start loading", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useNotesList());

      expect(result.current.notes).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Starts loading on mount
      expect(result.current.error).toBeNull();
    });

    it("should fetch notes on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      renderHook(() => useNotesList());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/notes?limit=100&sort=updated_at&order=desc",
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

  describe("Fetch Notes", () => {
    it("should fetch and set notes successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes).toEqual(mockNotes);
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

      const { result } = renderHook(() => useNotesList());

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should use correct query parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      renderHook(() => useNotesList());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/notes?limit=100&sort=updated_at&order=desc",
          expect.any(Object)
        );
      });
    });

    it("should handle empty notes array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes).toEqual([]);
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

      renderHook(() => useNotesList());

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

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.error).toEqual(mockErrorResponse);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.notes).toEqual([]);
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.error).toEqual({
          error: "network_error",
          message: "Failed to fetch notes. Please check your connection.",
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

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Refetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.notes).toEqual(mockNotes);
      });
    });
  });

  describe("Refetch", () => {
    it("should refetch notes when called", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockNotes[0]] }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(1);
      });

      // Refetch with different data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(3);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it("should set isLoading during refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      const { result } = renderHook(() => useNotesList());

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
        json: async () => ({ data: mockNotes }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should replace existing notes on refetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockNotes[0], mockNotes[1]] }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(2);
      });

      // Refetch with single note
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockNotes[2]] }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(1);
        expect(result.current.notes[0].note_id).toBe("note-3");
      });
    });
  });

  describe("Data Handling", () => {
    it("should handle notes with all fields", async () => {
      const completeNote: NoteListItemResponse = {
        note_id: "complete-note",
        title: "Complete Note",
        note_text: "Complete note content",
        trip_prefs: {
          terrain: "gravel",
          road_type: "scenic",
          duration_h: 3.5,
          distance_km: 200,
        },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        archived_at: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [completeNote] }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes[0]).toEqual(completeNote);
      });
    });

    it("should handle notes with empty trip_prefs", async () => {
      const noteWithEmptyPrefs: NoteListItemResponse = {
        note_id: "note-empty-prefs",
        title: "Note",
        note_text: "Content",
        trip_prefs: {},
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [noteWithEmptyPrefs] }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes[0].trip_prefs).toEqual({});
      });
    });

    it("should maintain note order from API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes[0].note_id).toBe("note-1");
        expect(result.current.notes[1].note_id).toBe("note-2");
        expect(result.current.notes[2].note_id).toBe("note-3");
      });
    });
  });

  describe("Fetch on Mount", () => {
    it("should only fetch once on initial mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      renderHook(() => useNotesList());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it("should not refetch on rerender", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotes }),
      });

      const { rerender } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Rerender
      rerender();

      // Should not fetch again
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large notes array", async () => {
      const largeNotesArray = Array.from({ length: 100 }, (_, i) => ({
        note_id: `note-${i}`,
        title: `Note ${i}`,
        note_text: `Content ${i}`,
        trip_prefs: {},
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: largeNotesArray }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(100);
      });
    });

    it("should handle notes with special characters in title", async () => {
      const noteWithSpecialChars: NoteListItemResponse = {
        note_id: "special-note",
        title: 'Note with "quotes" & <tags>',
        note_text: "Content with special chars",
        trip_prefs: {},
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [noteWithSpecialChars] }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes[0].title).toBe('Note with "quotes" & <tags>');
      });
    });

    it("should handle notes with very long text", async () => {
      const noteWithLongText: NoteListItemResponse = {
        note_id: "long-note",
        title: "Long Note",
        note_text: "a".repeat(1500),
        trip_prefs: {},
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [noteWithLongText] }),
      });

      const { result } = renderHook(() => useNotesList());

      await waitFor(() => {
        expect(result.current.notes[0].note_text.length).toBe(1500);
      });
    });
  });
});
