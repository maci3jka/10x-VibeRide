import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotes, useNoteMutations } from "./useNotes";
import type {
  NotesPaginatedResponse,
  NoteListItemResponse,
  ArchiveNoteResponse,
  UnarchiveNoteResponse,
  DeleteNoteResponse,
  ErrorResponse,
} from "@/types";

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

describe("useNotes", () => {
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
  ];

  const mockPaginatedResponse: NotesPaginatedResponse = {
    data: mockNotes,
    pagination: {
      page: 1,
      limit: 20,
      total_count: 2,
      total_pages: 1,
    },
  };

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
    it("should initialize with empty data and default state", () => {
      const { result } = renderHook(() => useNotes());

      expect(result.current.data).toEqual([]);
      expect(result.current.pagination).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  describe("Fetch Notes", () => {
    it("should fetch notes with default parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse,
      });

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes?page=1&limit=20", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockNotes);
        expect(result.current.pagination).toEqual(mockPaginatedResponse.pagination);
        expect(result.current.isFetching).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it("should build query string with all parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse,
      });

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({
          page: 2,
          limit: 10,
          search: "test query",
          archived: true,
          sort: "created_at",
          order: "asc",
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/notes?page=2&limit=10&search=test+query&archived=true&sort=created_at&order=asc",
        expect.any(Object)
      );
    });

    it("should replace data when page is 1", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [mockNotes[0]],
            pagination: { page: 1, limit: 20, total_count: 1, total_pages: 1 },
          }),
        });

      const { result } = renderHook(() => useNotes());

      // First fetch
      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      expect(result.current.data).toHaveLength(2);

      // Second fetch with page 1 should replace data
      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].note_id).toBe("note-1");
      });
    });

    it("should append data when page > 1", async () => {
      const page2Notes: NoteListItemResponse[] = [
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

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPaginatedResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: page2Notes,
            pagination: { page: 2, limit: 20, total_count: 3, total_pages: 2 },
          }),
        });

      const { result } = renderHook(() => useNotes());

      // First fetch page 1
      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      expect(result.current.data).toHaveLength(2);

      // Fetch page 2 should append
      await act(async () => {
        await result.current.fetchNotes({ page: 2, limit: 20 });
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(3);
        expect(result.current.data[2].note_id).toBe("note-3");
      });
    });

    it("should handle 401 unauthorized and redirect", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

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

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(mockErrorResponse);
        expect(result.current.isFetching).toBe(false);
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      await waitFor(() => {
        expect(result.current.error).toEqual({
          error: "network_error",
          message: "Failed to fetch notes. Please check your connection.",
        });
      });
    });

    it("should prevent duplicate concurrent fetches", async () => {
      let resolveFirst: (value: unknown) => void;
      const firstFetchPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      mockFetch.mockImplementationOnce(() => firstFetchPromise);

      const { result } = renderHook(() => useNotes());

      // Start first fetch (won't complete yet)
      act(() => {
        result.current.fetchNotes({ page: 1, limit: 20 });
      });

      // Try to start second fetch immediately (should be prevented)
      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      // Complete first fetch
      resolveFirst!({
        ok: true,
        json: async () => mockPaginatedResponse,
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      // Should only have been called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Fetch Next Page", () => {
    it("should fetch next page when available", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockNotes,
            pagination: { page: 1, limit: 20, total_count: 30, total_pages: 2 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [mockNotes[0]],
            pagination: { page: 2, limit: 20, total_count: 30, total_pages: 2 },
          }),
        });

      const { result } = renderHook(() => useNotes());

      // Fetch page 1
      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      expect(result.current.hasNextPage).toBe(true);

      // Fetch next page
      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.pagination?.page).toBe(2);
        expect(result.current.data).toHaveLength(3);
      });
    });

    it("should not fetch when no next page available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse,
      });

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      expect(result.current.hasNextPage).toBe(false);

      // Try to fetch next page
      await act(async () => {
        await result.current.fetchNextPage();
      });

      // Should not make additional fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should not fetch when already on last page", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockNotes,
          pagination: { page: 2, limit: 20, total_count: 30, total_pages: 2 },
        }),
      });

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 2, limit: 20 });
      });

      expect(result.current.hasNextPage).toBe(false);

      await act(async () => {
        await result.current.fetchNextPage();
      });

      // Should not make additional fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Refetch", () => {
    it("should refetch with current params starting from page 1", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockNotes,
            pagination: { page: 2, limit: 10, total_count: 30, total_pages: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [mockNotes[0]],
            pagination: { page: 1, limit: 10, total_count: 30, total_pages: 3 },
          }),
        });

      const { result } = renderHook(() => useNotes());

      // Fetch page 2
      await act(async () => {
        await result.current.fetchNotes({ page: 2, limit: 10, search: "test" });
      });

      // Refetch should go back to page 1 but keep other params
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith("/api/notes?page=1&limit=10&search=test", expect.any(Object));
      });
    });
  });

  describe("hasNextPage", () => {
    it("should be true when current page < total pages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockNotes,
          pagination: { page: 1, limit: 20, total_count: 50, total_pages: 3 },
        }),
      });

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 1, limit: 20 });
      });

      await waitFor(() => {
        expect(result.current.hasNextPage).toBe(true);
      });
    });

    it("should be false when current page >= total pages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockNotes,
          pagination: { page: 3, limit: 20, total_count: 50, total_pages: 3 },
        }),
      });

      const { result } = renderHook(() => useNotes());

      await act(async () => {
        await result.current.fetchNotes({ page: 3, limit: 20 });
      });

      await waitFor(() => {
        expect(result.current.hasNextPage).toBe(false);
      });
    });

    it("should be false when pagination is null", () => {
      const { result } = renderHook(() => useNotes());

      expect(result.current.hasNextPage).toBe(false);
    });
  });
});

describe("useNoteMutations", () => {
  const mockArchiveResponse: ArchiveNoteResponse = {
    success: true,
    note_id: "test-note-id",
    archived_at: "2024-01-01T00:00:00Z",
  };

  const mockUnarchiveResponse: UnarchiveNoteResponse = {
    success: true,
    note_id: "test-note-id",
    unarchived_at: "2024-01-01T00:00:00Z",
  };

  const mockDeleteResponse: DeleteNoteResponse = {
    success: true,
    note_id: "test-note-id",
    deleted_at: "2024-01-01T00:00:00Z",
  };

  const mockErrorResponse: ErrorResponse = {
    error: "server_error",
    message: "Operation failed",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Archive Note", () => {
    it("should archive note successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArchiveResponse,
      });

      const { result } = renderHook(() => useNoteMutations());

      let archiveResult: ArchiveNoteResponse | null = null;
      await act(async () => {
        archiveResult = await result.current.archiveNote("test-note-id");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/test-note-id/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(archiveResult).toEqual(mockArchiveResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isMutating).toBe(false);
    });

    it("should handle archive error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse,
      });

      const { result } = renderHook(() => useNoteMutations());

      let archiveResult: ArchiveNoteResponse | null = null;
      await act(async () => {
        archiveResult = await result.current.archiveNote("test-note-id");
      });

      expect(archiveResult).toBeNull();
      expect(result.current.error).toEqual(mockErrorResponse);
    });

    it("should handle 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useNoteMutations());

      await act(async () => {
        await result.current.archiveNote("test-note-id");
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe("/");
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useNoteMutations());

      let archiveResult: ArchiveNoteResponse | null = null;
      await act(async () => {
        archiveResult = await result.current.archiveNote("test-note-id");
      });

      expect(archiveResult).toBeNull();
      expect(result.current.error).toEqual({
        error: "network_error",
        message: "Failed to archive note. Please check your connection.",
      });
    });
  });

  describe("Unarchive Note", () => {
    it("should unarchive note successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUnarchiveResponse,
      });

      const { result } = renderHook(() => useNoteMutations());

      let unarchiveResult: UnarchiveNoteResponse | null = null;
      await act(async () => {
        unarchiveResult = await result.current.unarchiveNote("test-note-id");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/test-note-id/unarchive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(unarchiveResult).toEqual(mockUnarchiveResponse);
      expect(result.current.error).toBeNull();
    });

    it("should handle unarchive error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse,
      });

      const { result } = renderHook(() => useNoteMutations());

      let unarchiveResult: UnarchiveNoteResponse | null = null;
      await act(async () => {
        unarchiveResult = await result.current.unarchiveNote("test-note-id");
      });

      expect(unarchiveResult).toBeNull();
      expect(result.current.error).toEqual(mockErrorResponse);
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useNoteMutations());

      let unarchiveResult: UnarchiveNoteResponse | null = null;
      await act(async () => {
        unarchiveResult = await result.current.unarchiveNote("test-note-id");
      });

      expect(unarchiveResult).toBeNull();
      expect(result.current.error).toEqual({
        error: "network_error",
        message: "Failed to unarchive note. Please check your connection.",
      });
    });
  });

  describe("Delete Note", () => {
    it("should delete note successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeleteResponse,
      });

      const { result } = renderHook(() => useNoteMutations());

      let deleteResult: DeleteNoteResponse | null = null;
      await act(async () => {
        deleteResult = await result.current.deleteNote("test-note-id");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/test-note-id", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(deleteResult).toEqual(mockDeleteResponse);
      expect(result.current.error).toBeNull();
    });

    it("should treat 404 as successful delete (idempotent)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useNoteMutations());

      let deleteResult: DeleteNoteResponse | null = null;
      await act(async () => {
        deleteResult = await result.current.deleteNote("test-note-id");
      });

      expect(deleteResult).not.toBeNull();
      expect(deleteResult?.success).toBe(true);
      expect(deleteResult?.note_id).toBe("test-note-id");
    });

    it("should handle delete error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse,
      });

      const { result } = renderHook(() => useNoteMutations());

      let deleteResult: DeleteNoteResponse | null = null;
      await act(async () => {
        deleteResult = await result.current.deleteNote("test-note-id");
      });

      expect(deleteResult).toBeNull();
      expect(result.current.error).toEqual(mockErrorResponse);
    });

    it("should handle 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useNoteMutations());

      await act(async () => {
        await result.current.deleteNote("test-note-id");
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe("/");
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useNoteMutations());

      let deleteResult: DeleteNoteResponse | null = null;
      await act(async () => {
        deleteResult = await result.current.deleteNote("test-note-id");
      });

      expect(deleteResult).toBeNull();
      expect(result.current.error).toEqual({
        error: "network_error",
        message: "Failed to delete note. Please check your connection.",
      });
    });
  });

  describe("Mutation State", () => {
    it("should set isMutating to true during operation", async () => {
      let resolveArchive: (value: unknown) => void;
      const archivePromise = new Promise((resolve) => {
        resolveArchive = resolve;
      });

      mockFetch.mockImplementationOnce(() => archivePromise);

      const { result } = renderHook(() => useNoteMutations());

      // Start archive (won't complete yet)
      act(() => {
        result.current.archiveNote("test-note-id");
      });

      // Should be mutating
      expect(result.current.isMutating).toBe(true);

      // Complete archive
      resolveArchive!({
        ok: true,
        json: async () => mockArchiveResponse,
      });

      await waitFor(() => {
        expect(result.current.isMutating).toBe(false);
      });
    });

    it("should clear error on new mutation", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => mockErrorResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockArchiveResponse,
        });

      const { result } = renderHook(() => useNoteMutations());

      // First mutation fails
      await act(async () => {
        await result.current.archiveNote("test-note-id");
      });

      expect(result.current.error).not.toBeNull();

      // Second mutation should clear error
      await act(async () => {
        await result.current.archiveNote("test-note-id");
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
