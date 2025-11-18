import { useState, useCallback } from "react";
import type { UserPreferencesResponse, UpdateUserPreferencesRequest, ErrorResponse } from "@/types";

interface UseUserPreferencesReturn {
  data: UserPreferencesResponse | null;
  error: ErrorResponse | null;
  isFetching: boolean;
  isMutating: boolean;
  fetch: () => Promise<void>;
  upsert: (preferences: UpdateUserPreferencesRequest) => Promise<UserPreferencesResponse | null>;
}

/**
 * Hook for managing user preferences API calls
 * Provides fetch and upsert operations for /api/user/preferences
 */
export function useUserPreferences(): UseUserPreferencesReturn {
  const [data, setData] = useState<UserPreferencesResponse | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const fetch = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await window.fetch("/api/user/preferences", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle 404 as first-time user (not an error)
        if (response.status === 404) {
          setData(null);
          setError(null);
          return;
        }

        const errorData: ErrorResponse = await response.json();
        setError(errorData);
        return;
      }

      const preferences: UserPreferencesResponse = await response.json();
      setData(preferences);
      setError(null);
    } catch {
      setError({
        error: "network_error",
        message: "Failed to fetch preferences. Please check your connection.",
      });
    } finally {
      setIsFetching(false);
    }
  }, []);

  const upsert = useCallback(
    async (preferences: UpdateUserPreferencesRequest): Promise<UserPreferencesResponse | null> => {
      setIsMutating(true);
      setError(null);

      try {
        const response = await window.fetch("/api/user/preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(preferences),
        });

        if (!response.ok) {
          const errorData: ErrorResponse = await response.json();
          setError(errorData);
          return null;
        }

        const updatedPreferences: UserPreferencesResponse = await response.json();
        setData(updatedPreferences);
        setError(null);
        return updatedPreferences;
      } catch {
        setError({
          error: "network_error",
          message: "Failed to save preferences. Please check your connection.",
        });
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  return {
    data,
    error,
    isFetching,
    isMutating,
    fetch,
    upsert,
  };
}
