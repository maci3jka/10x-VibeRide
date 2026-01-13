import { useState, useCallback, useEffect, useRef } from "react";
import type { NoteResponse, CreateNoteRequest, UpdateNoteRequest, ErrorResponse, TripPreferences } from "@/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface NoteEditorViewModel {
  noteId?: string;
  title: string;
  noteText: string;
  trip_prefs: TripPreferences;
  saveState: SaveState;
  dirty: boolean;
}

interface UseNoteEditorReturn {
  viewModel: NoteEditorViewModel;
  error: ErrorResponse | null;
  isLoading: boolean;
  lastSavedAt: Date | null;
  updateTitle: (title: string) => void;
  updateNoteText: (text: string) => void;
  updateTripPrefs: (prefs: TripPreferences) => void;
  save: () => Promise<boolean>;
  resetDirty: () => void;
}

/**
 * Hook for managing note editor state with autosave
 * Handles creating new notes and editing existing ones
 */
export function useNoteEditor(noteId?: string): UseNoteEditorReturn {
  const [viewModel, setViewModel] = useState<NoteEditorViewModel>({
    noteId,
    title: "",
    noteText: "",
    trip_prefs: {},
    saveState: "idle",
    dirty: false,
  });
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Track autosave interval
  const autosaveIntervalRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);

  // Fetch existing note if noteId is provided
  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await window.fetch(`/api/notes/${noteId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Handle 401 - session expired
          if (response.status === 401) {
            window.location.href = "/";
            return;
          }

          // Handle 404 - note not found
          if (response.status === 404) {
            setError({
              error: "not_found",
              message: "Note not found",
            });
            return;
          }

          const errorData: ErrorResponse = await response.json();
          setError(errorData);
          return;
        }

        const note: NoteResponse = await response.json();
        setViewModel({
          noteId: note.note_id,
          title: note.title,
          noteText: note.note_text,
          trip_prefs: note.trip_prefs,
          saveState: "idle",
          dirty: false,
        });
      } catch {
        setError({
          error: "network_error",
          message: "Failed to fetch note. Please check your connection.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [noteId]);

  // Save function
  const save = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent saves
    if (isSavingRef.current) {
      return false;
    }

    isSavingRef.current = true;
    setViewModel((prev) => ({ ...prev, saveState: "saving" }));
    setError(null);

    try {
      const payload: CreateNoteRequest | UpdateNoteRequest = {
        title: viewModel.title.trim(),
        note_text: viewModel.noteText.trim(),
        trip_prefs: viewModel.trip_prefs,
      };

      const url = viewModel.noteId ? `/api/notes/${viewModel.noteId}` : "/api/notes";
      const method = viewModel.noteId ? "PUT" : "POST";

      const response = await window.fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Handle 401 - session expired
        if (response.status === 401) {
          window.location.href = "/";
          return false;
        }

        const errorData: ErrorResponse = await response.json();
        setError(errorData);
        setViewModel((prev) => ({ ...prev, saveState: "error" }));
        return false;
      }

      const savedNote: NoteResponse = await response.json();

      // Update view model with saved note data
      setViewModel((prev) => ({
        ...prev,
        noteId: savedNote.note_id,
        title: savedNote.title,
        noteText: savedNote.note_text,
        trip_prefs: savedNote.trip_prefs,
        saveState: "saved",
        dirty: false,
      }));

      setLastSavedAt(new Date());
      setError(null);

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setViewModel((prev) => ({ ...prev, saveState: "idle" }));
      }, 2000);

      return true;
    } catch {
      setError({
        error: "network_error",
        message: "Failed to save note. Please check your connection.",
      });
      setViewModel((prev) => ({ ...prev, saveState: "error" }));
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [viewModel.title, viewModel.noteText, viewModel.trip_prefs, viewModel.noteId]);

  // Update functions
  const updateTitle = useCallback((title: string) => {
    setViewModel((prev) => ({ ...prev, title, dirty: true }));
  }, []);

  const updateNoteText = useCallback((text: string) => {
    setViewModel((prev) => ({ ...prev, noteText: text, dirty: true }));
  }, []);

  const updateTripPrefs = useCallback((prefs: TripPreferences) => {
    setViewModel((prev) => ({ ...prev, trip_prefs: prefs, dirty: true }));
  }, []);

  const resetDirty = useCallback(() => {
    setViewModel((prev) => ({ ...prev, dirty: false }));
  }, []);

  // Setup autosave interval when dirty
  useEffect(() => {
    // Clear any existing interval
    if (autosaveIntervalRef.current !== null) {
      window.clearInterval(autosaveIntervalRef.current);
      autosaveIntervalRef.current = null;
    }

    // Only setup autosave if dirty and has minimum content
    if (viewModel.dirty && viewModel.title.trim() && viewModel.noteText.trim().length >= 10) {
      autosaveIntervalRef.current = window.setInterval(() => {
        save();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autosaveIntervalRef.current !== null) {
        window.clearInterval(autosaveIntervalRef.current);
      }
    };
  }, [viewModel.dirty, viewModel.title, viewModel.noteText, save]);

  // Setup beforeunload listener when dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (viewModel.dirty) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but setting returnValue is required
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [viewModel.dirty]);

  // Pause autosave when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && autosaveIntervalRef.current !== null) {
        window.clearInterval(autosaveIntervalRef.current);
        autosaveIntervalRef.current = null;
      } else if (!document.hidden && viewModel.dirty) {
        // Restart autosave when page becomes visible again
        if (viewModel.title.trim() && viewModel.noteText.trim().length >= 10) {
          autosaveIntervalRef.current = window.setInterval(() => {
            save();
          }, 30000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [viewModel.dirty, viewModel.title, viewModel.noteText, save]);

  return {
    viewModel,
    error,
    isLoading,
    lastSavedAt,
    updateTitle,
    updateNoteText,
    updateTripPrefs,
    save,
    resetDirty,
  };
}
