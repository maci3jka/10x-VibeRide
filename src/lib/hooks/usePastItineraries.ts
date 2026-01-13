import { useState, useCallback, useEffect } from "react";
import type { ItineraryListItemResponse, ErrorResponse } from "@/types";

interface UsePastItinerariesReturn {
  itineraries: ItineraryListItemResponse[];
  isLoading: boolean;
  error: ErrorResponse | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching past itineraries for a note
 * Only fetches completed itineraries
 */
export function usePastItineraries(noteId: string | undefined): UsePastItinerariesReturn {
  const [itineraries, setItineraries] = useState<ItineraryListItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  const fetchItineraries = useCallback(async () => {
    if (!noteId) {
      setItineraries([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await window.fetch(`/api/notes/${noteId}/itineraries?status=completed&limit=10`, {
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

      const result: { data: ItineraryListItemResponse[] } = await response.json();
      setItineraries(result.data);
      setError(null);
    } catch {
      setError({
        error: "network_error",
        message: "Failed to fetch past itineraries. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  // Fetch on mount and when noteId changes
  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  return {
    itineraries,
    isLoading,
    error,
    refetch: fetchItineraries,
  };
}
