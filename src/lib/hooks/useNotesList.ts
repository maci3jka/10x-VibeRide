import { useState, useCallback, useEffect } from "react";
import type { NoteListItemResponse, ErrorResponse } from "@/types";

interface UseNotesListReturn {
  notes: NoteListItemResponse[];
  isLoading: boolean;
  error: ErrorResponse | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a simple list of notes for selection
 * Fetches active (non-archived) notes only
 */
export function useNotesList(): UseNotesListReturn {
  const [notes, setNotes] = useState<NoteListItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.fetch("/api/notes?limit=100&sort=updated_at&order=desc", {
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

        const errorData: ErrorResponse = await response.json();
        setError(errorData);
        return;
      }

      const result: { data: NoteListItemResponse[] } = await response.json();
      setNotes(result.data);
      setError(null);
    } catch {
      setError({
        error: "network_error",
        message: "Failed to fetch notes. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    isLoading,
    error,
    refetch: fetchNotes,
  };
}
