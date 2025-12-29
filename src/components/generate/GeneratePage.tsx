import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { usePastItineraries } from "@/lib/hooks/usePastItineraries";
import { useNotesList } from "@/lib/hooks/useNotesList";
import { NoteSelector } from "./NoteSelector";
import { NotePreviewCard } from "./NotePreviewCard";
import { ResolvedPreferencesCollapse } from "./ResolvedPreferencesCollapse";
import { GenerateButton } from "./GenerateButton";
import { ProgressSection } from "./ProgressSection";
import { ItinerarySummary } from "./ItinerarySummary";
import { DownloadSection } from "./DownloadSection";
import { ErrorRetryCard } from "./ErrorRetryCard";
import { PastItinerariesSection } from "./PastItinerariesSection";
import { TabBar } from "@/components/TabBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import type { NoteListItemResponse, UserPreferences, TripPreferences } from "@/types";

interface GeneratePageProps {
  initialNote?: NoteListItemResponse;
  userPreferences?: UserPreferences;
}

/**
 * Resolve preferences by merging trip prefs with user defaults
 */
function resolvePreferences(tripPrefs: TripPreferences, userPrefs?: UserPreferences): Required<TripPreferences> {
  return {
    terrain: tripPrefs.terrain ?? userPrefs?.terrain ?? "paved",
    road_type: tripPrefs.road_type ?? userPrefs?.road_type ?? "scenic",
    duration_h: tripPrefs.duration_h ?? userPrefs?.typical_duration_h ?? 2.0,
    distance_km: tripPrefs.distance_km ?? userPrefs?.typical_distance_km ?? 100.0,
  };
}

/**
 * GeneratePage - main container for itinerary generation view
 * Manages generation state machine, polling, and user interactions
 */
export function GeneratePage({ initialNote, userPreferences }: GeneratePageProps) {
  const [selectedNote, setSelectedNote] = useState<NoteListItemResponse | undefined>(initialNote);
  const [isOnline, setIsOnline] = useState(true);

  const { state, progress, routeGeoJSON, error, itineraryId, generate, cancel, retry, download, reset } = useGenerate();
  const {
    itineraries: pastItineraries,
    isLoading: isPastLoading,
    refetch: refetchPast,
  } = usePastItineraries(selectedNote?.note_id);
  const { notes, isLoading: isNotesLoading } = useNotesList();

  // Monitor online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load selected note from localStorage if not provided
  useEffect(() => {
    if (!selectedNote) {
      const storedNoteId = localStorage.getItem("viberide:last-selected-note");
      if (storedNoteId) {
        // Fetch note from API
        fetchNote(storedNoteId);
      } else {
        // Redirect to notes if no note selected
        toast.error("Please select a note first");
        setTimeout(() => {
          window.location.href = "/notes";
        }, 1500);
      }
    }
  }, [selectedNote]);

  // Save selected note to localStorage
  useEffect(() => {
    if (selectedNote) {
      localStorage.setItem("viberide:last-selected-note", selectedNote.note_id);
    }
  }, [selectedNote]);

  // Show error toasts
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Refetch past itineraries when generation completes
  useEffect(() => {
    if (state === "completed") {
      refetchPast();
    }
  }, [state, refetchPast]);

  // Fetch note by ID
  const fetchNote = async (noteId: string) => {
    try {
      const response = await window.fetch(`/api/notes/${noteId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/";
          return;
        }
        if (response.status === 404) {
          toast.error("Note not found");
          window.location.href = "/notes";
          return;
        }
        throw new Error("Failed to fetch note");
      }

      const note = await response.json();
      setSelectedNote(note);
    } catch {
      toast.error("Failed to load note");
      window.location.href = "/notes";
    }
  };

  // Handlers
  const handleGenerate = useCallback(() => {
    if (!selectedNote) return;
    generate(selectedNote.note_id);
  }, [selectedNote, generate]);

  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleDownload = useCallback(
    (acknowledged: boolean, format: "gpx" | "kml" | "geojson") => {
      download(acknowledged, format);
    },
    [download]
  );

  const handleDownloadPast = useCallback(
    (itineraryId: string, format: "gpx" | "kml" | "geojson" = "gpx") => {
      // Find the itinerary to get its title
      const itinerary = pastItineraries.find((it) => it.itinerary_id === itineraryId);

      // Create filename from title if available
      const extension = format === "gpx" ? "gpx" : format === "kml" ? "kml" : "geojson";
      let filename = `itinerary-${itineraryId}.${extension}`;
      if (itinerary?.title) {
        // Sanitize title for filename (remove special chars, limit length)
        const sanitizedTitle = itinerary.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50);
        filename = `${sanitizedTitle}.${extension}`;
      }

      // Download past itinerary with selected format
      const url = `/api/itineraries/${itineraryId}/download?format=${format}&acknowledged=true`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [pastItineraries]
  );

  const handleNoteChange = useCallback(
    (noteId: string) => {
      const note = notes.find((n) => n.note_id === noteId);
      if (note) {
        // Reset generation state when switching notes
        reset();
        setSelectedNote(note);
        localStorage.setItem("viberide:last-selected-note", noteId);
      }
    },
    [notes, reset]
  );

  // Don't render until we have a note
  if (!selectedNote) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const resolvedPrefs = resolvePreferences(selectedNote.trip_prefs, userPreferences);
  const isGenerating = state === "posting" || state === "running";
  const isCompleted = state === "completed";
  const isFailed = state === "failed";

  return (
    <>
      <OfflineBanner />

      <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Generate Itinerary</h1>
            <p className="text-muted-foreground">Create an AI-powered riding itinerary from your trip notes</p>
          </div>

          {/* Note Selector */}
          {notes.length > 1 && (
            <NoteSelector
              notes={notes}
              selectedNoteId={selectedNote.note_id}
              onSelectNote={handleNoteChange}
              disabled={isGenerating || isNotesLoading}
            />
          )}

          {/* Note Preview */}
          <NotePreviewCard note={selectedNote} />

          {/* Resolved Preferences */}
          <ResolvedPreferencesCollapse preferences={resolvedPrefs} />

          {/* Generate Button */}
          {!isCompleted && (
            <GenerateButton
              disabled={isGenerating || !isOnline}
              loading={state === "posting"}
              onClick={handleGenerate}
            />
          )}

          {/* Progress Section */}
          {isGenerating && (
            <ProgressSection progress={progress} onCancel={handleCancel} showCancelButton={state === "running"} />
          )}

          {/* Itinerary Summary */}
          {isCompleted && routeGeoJSON && itineraryId && (
            <>
              <ItinerarySummary routeGeoJSON={routeGeoJSON} />
              <DownloadSection onDownload={handleDownload} itineraryId={itineraryId} />
            </>
          )}

          {/* Error/Retry */}
          {isFailed && <ErrorRetryCard error={error} onRetry={handleRetry} />}

          {/* Past Itineraries */}
          {!isGenerating && (
            <PastItinerariesSection
              itineraries={pastItineraries}
              isLoading={isPastLoading}
              onDownload={handleDownloadPast}
            />
          )}
        </div>
      </div>

      {/* Tab Bar Navigation */}
      <TabBar currentPath="/generate" />
    </>
  );
}
