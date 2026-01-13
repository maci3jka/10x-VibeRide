import { useState, useCallback, useRef } from "react";
import type {
  NotesPaginatedResponse,
  NoteListItemResponse,
  ArchiveNoteResponse,
  UnarchiveNoteResponse,
  DeleteNoteResponse,
  ErrorResponse,
} from "@/types";
import type { NotesQueryParams } from "@/lib/types/notesView.types";

interface UseNotesReturn {
  data: NoteListItemResponse[];
  pagination: NotesPaginatedResponse["pagination"] | null;
  error: ErrorResponse | null;
  isFetching: boolean;
  hasNextPage: boolean;
  fetchNotes: (params: Partial<NotesQueryParams>) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching paginated notes list
 * Supports infinite scroll with page-based pagination
 */
export function useNotes(): UseNotesReturn {
  const [data, setData] = useState<NoteListItemResponse[]>([]);
  const [pagination, setPagination] = useState<NotesPaginatedResponse["pagination"] | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [currentParams, setCurrentParams] = useState<Partial<NotesQueryParams>>({
    page: 1,
    limit: 20,
  });

  // Track if we're currently fetching to prevent duplicate requests
  const fetchingRef = useRef(false);

  const fetchNotes = useCallback(async (params: Partial<NotesQueryParams>) => {
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setIsFetching(true);
    setError(null);

    // Build query string
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set("page", String(params.page));
    if (params.limit) queryParams.set("limit", String(params.limit));
    if (params.search) queryParams.set("search", params.search);
    if (params.archived !== undefined) queryParams.set("archived", String(params.archived));
    if (params.sort) queryParams.set("sort", params.sort);
    if (params.order) queryParams.set("order", params.order);

    try {
      const response = await window.fetch(`/api/notes?${queryParams.toString()}`, {
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

      const result: NotesPaginatedResponse = await response.json();

      // If page 1, replace data; otherwise append
      if (params.page === 1) {
        setData(result.data);
      } else {
        setData((prev) => [...prev, ...result.data]);
      }

      setPagination(result.pagination);
      setCurrentParams(params);
      setError(null);
    } catch {
      setError({
        error: "network_error",
        message: "Failed to fetch notes. Please check your connection.",
      });
    } finally {
      setIsFetching(false);
      fetchingRef.current = false;
    }
  }, []);

  const fetchNextPage = useCallback(async () => {
    if (!pagination || pagination.page >= pagination.total_pages) {
      return;
    }

    await fetchNotes({
      ...currentParams,
      page: pagination.page + 1,
    });
  }, [pagination, currentParams, fetchNotes]);

  const refetch = useCallback(async () => {
    await fetchNotes({ ...currentParams, page: 1 });
  }, [currentParams, fetchNotes]);

  const hasNextPage = pagination ? pagination.page < pagination.total_pages : false;

  return {
    data,
    pagination,
    error,
    isFetching,
    hasNextPage,
    fetchNotes,
    fetchNextPage,
    refetch,
  };
}

interface UseNoteMutationsReturn {
  archiveNote: (noteId: string) => Promise<ArchiveNoteResponse | null>;
  unarchiveNote: (noteId: string) => Promise<UnarchiveNoteResponse | null>;
  deleteNote: (noteId: string) => Promise<DeleteNoteResponse | null>;
  isMutating: boolean;
  error: ErrorResponse | null;
}

/**
 * Hook for note mutations (archive, unarchive, delete)
 * Provides mutation functions with loading and error states
 */
export function useNoteMutations(): UseNoteMutationsReturn {
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  const archiveNote = useCallback(async (noteId: string): Promise<ArchiveNoteResponse | null> => {
    setIsMutating(true);
    setError(null);

    try {
      const response = await window.fetch(`/api/notes/${noteId}/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle 401 - session expired
        if (response.status === 401) {
          window.location.href = "/";
          return null;
        }

        const errorData: ErrorResponse = await response.json();
        setError(errorData);
        return null;
      }

      const result: ArchiveNoteResponse = await response.json();
      return result;
    } catch {
      setError({
        error: "network_error",
        message: "Failed to archive note. Please check your connection.",
      });
      return null;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const unarchiveNote = useCallback(async (noteId: string): Promise<UnarchiveNoteResponse | null> => {
    setIsMutating(true);
    setError(null);

    try {
      const response = await window.fetch(`/api/notes/${noteId}/unarchive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle 401 - session expired
        if (response.status === 401) {
          window.location.href = "/";
          return null;
        }

        const errorData: ErrorResponse = await response.json();
        setError(errorData);
        return null;
      }

      const result: UnarchiveNoteResponse = await response.json();
      return result;
    } catch {
      setError({
        error: "network_error",
        message: "Failed to unarchive note. Please check your connection.",
      });
      return null;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string): Promise<DeleteNoteResponse | null> => {
    setIsMutating(true);
    setError(null);

    try {
      const response = await window.fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle 401 - session expired
        if (response.status === 401) {
          window.location.href = "/";
          return null;
        }

        // 404 is acceptable for delete (already deleted)
        if (response.status === 404) {
          return {
            success: true,
            note_id: noteId,
            deleted_at: new Date().toISOString(),
          };
        }

        const errorData: ErrorResponse = await response.json();
        setError(errorData);
        return null;
      }

      const result: DeleteNoteResponse = await response.json();
      return result;
    } catch {
      setError({
        error: "network_error",
        message: "Failed to delete note. Please check your connection.",
      });
      return null;
    } finally {
      setIsMutating(false);
    }
  }, []);

  return {
    archiveNote,
    unarchiveNote,
    deleteNote,
    isMutating,
    error,
  };
}
