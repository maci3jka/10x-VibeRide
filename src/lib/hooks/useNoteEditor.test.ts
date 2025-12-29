import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNoteEditor } from "./useNoteEditor";
import type { NoteResponse, ErrorResponse } from "@/types";

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

describe("useNoteEditor", () => {
  const mockNote: NoteResponse = {
    note_id: "test-note-id",
    user_id: "test-user-id",
    title: "Test Note",
    note_text: "This is a test note with enough characters to pass validation.",
    trip_prefs: {
      terrain: "paved",
      road_type: "scenic",
    },
    ai_summary: null,
    distance_km: null,
    duration_h: null,
    terrain: "paved",
    road_type: "scenic",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    archived_at: null,
  };

  const mockErrorResponse: ErrorResponse = {
    error: "server_error",
    message: "Failed to save note",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization - Create Mode", () => {
    it("should initialize with empty values when no noteId provided", () => {
      const { result } = renderHook(() => useNoteEditor());

      expect(result.current.viewModel).toEqual({
        noteId: undefined,
        title: "",
        noteText: "",
        trip_prefs: {},
        saveState: "idle",
        dirty: false,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should not fetch note when noteId is undefined", () => {
      renderHook(() => useNoteEditor());

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Initialization - Edit Mode", () => {
    it("should fetch note when noteId is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNote,
      });

      const { result } = renderHook(() => useNoteEditor("test-note-id"));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes/test-note-id", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.viewModel).toEqual({
          noteId: "test-note-id",
          title: "Test Note",
          noteText: "This is a test note with enough characters to pass validation.",
          trip_prefs: {
            terrain: "paved",
            road_type: "scenic",
          },
          saveState: "idle",
          dirty: false,
        });
      });
    });

    it("should handle 404 error when note not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "not_found", message: "Note not found" }),
      });

      const { result } = renderHook(() => useNoteEditor("non-existent-id"));

      await waitFor(() => {
        expect(result.current.error).toEqual({
          error: "not_found",
          message: "Note not found",
        });
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should redirect to home on 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      renderHook(() => useNoteEditor("test-note-id"));

      await waitFor(() => {
        expect(mockLocation.href).toBe("/");
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useNoteEditor("test-note-id"));

      await waitFor(() => {
        expect(result.current.error).toEqual({
          error: "network_error",
          message: "Failed to fetch note. Please check your connection.",
        });
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Field Updates", () => {
    it("should update title and mark as dirty", () => {
      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("New Title");
      });

      expect(result.current.viewModel.title).toBe("New Title");
      expect(result.current.viewModel.dirty).toBe(true);
    });

    it("should update note text and mark as dirty", () => {
      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateNoteText("New note text content");
      });

      expect(result.current.viewModel.noteText).toBe("New note text content");
      expect(result.current.viewModel.dirty).toBe(true);
    });

    it("should update trip preferences and mark as dirty", () => {
      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTripPrefs({ terrain: "gravel", duration_h: 3.5 });
      });

      expect(result.current.viewModel.trip_prefs).toEqual({
        terrain: "gravel",
        duration_h: 3.5,
      });
      expect(result.current.viewModel.dirty).toBe(true);
    });

    it("should allow resetting dirty flag", () => {
      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("New Title");
      });

      expect(result.current.viewModel.dirty).toBe(true);

      act(() => {
        result.current.resetDirty();
      });

      expect(result.current.viewModel.dirty).toBe(false);
    });
  });

  describe("Save - Create Note", () => {
    it("should create new note via POST", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockNote,
      });

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Test Note",
          note_text: "This is a test note with enough characters.",
          trip_prefs: {},
        }),
      });

      await waitFor(() => {
        expect(result.current.viewModel.noteId).toBe("test-note-id");
        expect(result.current.viewModel.dirty).toBe(false);
        expect(result.current.viewModel.saveState).toBe("saved");
      });
    });

    it("should trim whitespace before saving", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockNote,
      });

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("  Test Note  ");
        result.current.updateNoteText("  This is a test note with enough characters.  ");
      });

      await act(async () => {
        await result.current.save();
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.title).toBe("Test Note");
      expect(callBody.note_text).toBe("This is a test note with enough characters.");
    });

    it("should transition saveState: idle -> saving -> saved", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockNote,
      });

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      expect(result.current.viewModel.saveState).toBe("idle");

      await act(async () => {
        await result.current.save();
      });

      // Should transition to saved
      await waitFor(() => {
        expect(result.current.viewModel.saveState).toBe("saved");
      });
    });
  });

  describe("Save - Update Note", () => {
    it("should update existing note via PUT", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNote,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockNote, title: "Updated Title" }),
        });

      const { result } = renderHook(() => useNoteEditor("test-note-id"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateTitle("Updated Title");
      });

      await act(async () => {
        await result.current.save();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/test-note-id", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      });
    });
  });

  describe("Save - Error Handling", () => {
    it("should handle validation error (400)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
      });

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(result.current.error).toEqual(mockErrorResponse);
      expect(result.current.viewModel.saveState).toBe("error");
    });

    it("should handle conflict error (409)", async () => {
      const conflictError: ErrorResponse = {
        error: "conflict",
        message: "Title already exists",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => conflictError,
      });

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Duplicate Title");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(result.current.error).toEqual(conflictError);
    });

    it("should handle network error during save", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(result.current.error).toEqual({
        error: "network_error",
        message: "Failed to save note. Please check your connection.",
      });
      expect(result.current.viewModel.saveState).toBe("error");
    });

    it("should prevent concurrent saves", async () => {
      let resolveFirst: (value: unknown) => void;
      const firstSavePromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      mockFetch.mockImplementationOnce(() => firstSavePromise);

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      // Start first save (won't complete yet)
      const save1Promise = result.current.save();

      // Try to start second save immediately (should be prevented)
      const save2Result = await result.current.save();

      // Second save should return false immediately
      expect(save2Result).toBe(false);

      // Complete first save
      resolveFirst!({
        ok: true,
        json: async () => mockNote,
      });

      await save1Promise;

      // Should only have been called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Dirty State", () => {
    it("should mark as dirty when content changes", () => {
      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      expect(result.current.viewModel.dirty).toBe(true);
    });

    it("should clear dirty flag after successful save", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockNote,
      });

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      expect(result.current.viewModel.dirty).toBe(true);

      // Save successfully
      await act(async () => {
        await result.current.save();
      });

      // Should not be dirty anymore
      await waitFor(() => {
        expect(result.current.viewModel.dirty).toBe(false);
      });
    });
  });

  describe("Last Saved Tracking", () => {
    it("should update lastSavedAt after successful save", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNote,
      });

      const { result } = renderHook(() => useNoteEditor());

      act(() => {
        result.current.updateTitle("Test Note");
        result.current.updateNoteText("This is a test note with enough characters.");
      });

      expect(result.current.lastSavedAt).toBeNull();

      await act(async () => {
        await result.current.save();
      });

      await waitFor(() => {
        expect(result.current.lastSavedAt).not.toBeNull();
        expect(result.current.lastSavedAt).toBeInstanceOf(Date);
      });
    });
  });
});

