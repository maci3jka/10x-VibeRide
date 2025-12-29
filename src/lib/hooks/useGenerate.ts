import { useState, useCallback, useRef, useEffect } from "react";
import type {
  GenerateItineraryRequest,
  GenerateItineraryResponse,
  ItineraryStatusResponse,
  RouteGeoJSON,
  ErrorResponse,
} from "@/types";
import { extractSummary, type ExtractedSummary } from "@/lib/services/geojsonService";

export type GenerateState = "idle" | "posting" | "running" | "completed" | "failed" | "cancelled";
export type DownloadFormat = "gpx" | "kml" | "geojson";

interface UseGenerateReturn {
  state: GenerateState;
  progress: number | undefined;
  routeGeoJSON: RouteGeoJSON | undefined;
  summary: ExtractedSummary | undefined;
  error: string | undefined;
  itineraryId: string | undefined;
  generate: (noteId: string) => Promise<void>;
  cancel: () => Promise<void>;
  retry: () => Promise<void>;
  download: (acknowledged: boolean, format?: DownloadFormat) => Promise<void>;
  reset: () => void;
}

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const POLL_TIMEOUT_MS = 300000; // 5 minutes timeout (AI generation can take time)

/**
 * Hook for managing itinerary generation lifecycle
 * Handles state machine transitions, polling, cancellation, and download
 */
export function useGenerate(): UseGenerateReturn {
  const [state, setState] = useState<GenerateState>("idle");
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [routeGeoJSON, setRouteGeoJSON] = useState<RouteGeoJSON | undefined>(undefined);
  const [summary, setSummary] = useState<ExtractedSummary | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [itineraryId, setItineraryId] = useState<string | undefined>(undefined);
  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(undefined);

  const pollIntervalRef = useRef<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const consecutiveFailuresRef = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Stop polling and clear timers
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    consecutiveFailuresRef.current = 0;
  }, []);

  /**
   * Poll itinerary status
   */
  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const response = await window.fetch(`/api/itineraries/${id}/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Handle 401 - session expired
          if (response.status === 401) {
            stopPolling();
            window.location.href = "/";
            return;
          }

          consecutiveFailuresRef.current++;

          // After 3 consecutive failures, stop polling and show error
          if (consecutiveFailuresRef.current >= 3) {
            stopPolling();
            setState("failed");
            setError("Failed to check generation status. Please try again.");
            return;
          }

          return;
        }

        // Reset failure counter on success
        consecutiveFailuresRef.current = 0;

        const statusData: ItineraryStatusResponse = await response.json();

        // Handle different status states
        switch (statusData.status) {
          case "pending":
          case "running":
            setState("running");
            setProgress(statusData.progress);
            break;

          case "completed":
            stopPolling();
            setState("completed");
            if (statusData.route_geojson) {
              setRouteGeoJSON(statusData.route_geojson);
              try {
                const extractedSummary = extractSummary(statusData.route_geojson);
                setSummary(extractedSummary);
              } catch {
                setError("Failed to parse itinerary data.");
              }
            }
            setProgress(100);
            break;

          case "failed":
            stopPolling();
            setState("failed");
            setError(statusData.error || "Generation failed. Please try again.");
            break;

          case "cancelled":
            stopPolling();
            setState("cancelled");
            break;
        }
      } catch {
        consecutiveFailuresRef.current++;

        // After 3 consecutive failures, stop polling and show error
        if (consecutiveFailuresRef.current >= 3) {
          stopPolling();
          setState("failed");
          setError("Network error. Please check your connection and try again.");
        }
      }
    },
    [stopPolling]
  );

  /**
   * Start polling for status updates
   */
  const startPolling = useCallback(
    (id: string) => {
      // Clear any existing polling
      stopPolling();

      // Set timeout for polling (5 minutes - AI generation can take time)
      pollTimeoutRef.current = window.setTimeout(() => {
        stopPolling();
        setState("failed");
        setError("Generation timeout. Please try again or check your note for complexity.");
      }, POLL_TIMEOUT_MS);

      // Start polling interval
      pollIntervalRef.current = window.setInterval(() => {
        pollStatus(id);
      }, POLL_INTERVAL_MS);

      // Initial poll
      pollStatus(id);
    },
    [pollStatus, stopPolling]
  );

  /**
   * Generate itinerary for a note
   */
  const generate = useCallback(
    async (noteId: string) => {
      // Prevent duplicate generation
      if (state === "posting" || state === "running") {
        return;
      }

      setState("posting");
      setError(undefined);
      setProgress(undefined);
      setRouteGeoJSON(undefined);
      setSummary(undefined);
      setCurrentNoteId(noteId);

      // Generate idempotency key
      const requestId = crypto.randomUUID();

      const requestBody: GenerateItineraryRequest = {
        request_id: requestId,
      };

      try {
        const response = await window.fetch(`/api/notes/${noteId}/itineraries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          // Handle 401 - session expired
          if (response.status === 401) {
            window.location.href = "/";
            return;
          }

          // Handle 409 - generation already in progress
          if (response.status === 409) {
            const errorData: ErrorResponse = await response.json();
            // Extract existing itinerary ID from error details if available
            const existingId = errorData.details?.itinerary_id;
            if (existingId) {
              setItineraryId(existingId);
              setState("running");
              startPolling(existingId);
              return;
            }
          }

          // Handle 429 - spend cap exceeded
          if (response.status === 429) {
            const errorData: ErrorResponse = await response.json();
            setState("failed");
            setError(
              errorData.retry_after
                ? `Spend cap exceeded. Please try again in ${errorData.retry_after} seconds.`
                : "Spend cap exceeded. Please try again later."
            );
            return;
          }

          // Handle 403 - preferences incomplete
          if (response.status === 403) {
            setState("failed");
            setError("Please complete your profile preferences first.");
            // Redirect to profile after a delay
            setTimeout(() => {
              window.location.href = "/profile";
            }, 2000);
            return;
          }

          const errorData: ErrorResponse = await response.json();
          setState("failed");
          setError(errorData.message || "Failed to start generation. Please try again.");
          return;
        }

        const result: GenerateItineraryResponse = await response.json();
        setItineraryId(result.itinerary_id);
        setState("running");
        startPolling(result.itinerary_id);
      } catch {
        setState("failed");
        setError("Network error. Please check your connection and try again.");
      }
    },
    [state, startPolling]
  );

  /**
   * Cancel ongoing generation
   */
  const cancel = useCallback(async () => {
    if (!itineraryId || (state !== "running" && state !== "posting")) {
      return;
    }

    try {
      const response = await window.fetch(`/api/itineraries/${itineraryId}/cancel`, {
        method: "POST",
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
        setError(errorData.message || "Failed to cancel generation.");
        return;
      }

      stopPolling();
      setState("cancelled");
    } catch {
      setError("Network error. Failed to cancel generation.");
    }
  }, [itineraryId, state, stopPolling]);

  /**
   * Retry generation after failure
   */
  const retry = useCallback(async () => {
    if (currentNoteId) {
      await generate(currentNoteId);
    }
  }, [currentNoteId, generate]);

  /**
   * Download route file (GPX or GeoJSON)
   */
  const download = useCallback(
    async (acknowledged: boolean, format: DownloadFormat = "gpx") => {
      if (!itineraryId || state !== "completed") {
        return;
      }

      try {
        const url = `/api/itineraries/${itineraryId}/download?format=${format}&acknowledged=${acknowledged}`;
        const response = await window.fetch(url, {
          method: "GET",
        });

        if (!response.ok) {
          // Handle 401 - session expired
          if (response.status === 401) {
            window.location.href = "/";
            return;
          }

          // Handle 400 - disclaimer not acknowledged
          if (response.status === 400) {
            setError("Please acknowledge the safety disclaimer to download.");
            return;
          }

          // Handle 422 - incomplete itinerary or invalid GeoJSON
          if (response.status === 422) {
            setError("Itinerary is incomplete and cannot be downloaded.");
            return;
          }

          const errorData: ErrorResponse = await response.json();
          setError(errorData.message || `Failed to download ${format.toUpperCase()} file.`);
          return;
        }

        // Download the file
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        
        // Create filename from title if available, otherwise use itinerary ID
        const extension = format === "gpx" ? "gpx" : "geojson";
        let filename = `itinerary-${itineraryId}.${extension}`;
        if (summary?.title) {
          // Sanitize title for filename (remove special chars, limit length)
          const sanitizedTitle = summary.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 50);
          filename = `${sanitizedTitle}.${extension}`;
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch {
        setError(`Network error. Failed to download ${format.toUpperCase()} file.`);
      }
    },
    [itineraryId, state, summary]
  );

  /**
   * Reset all state to initial values
   * Used when switching between notes
   */
  const reset = useCallback(() => {
    stopPolling();
    setState("idle");
    setProgress(undefined);
    setRouteGeoJSON(undefined);
    setSummary(undefined);
    setError(undefined);
    setItineraryId(undefined);
    setCurrentNoteId(undefined);
  }, [stopPolling]);

  return {
    state,
    progress,
    routeGeoJSON,
    summary,
    error,
    itineraryId,
    generate,
    cancel,
    retry,
    download,
    reset,
  };
}

