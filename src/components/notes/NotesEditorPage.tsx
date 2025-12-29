import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useNoteEditor } from "@/lib/hooks/useNoteEditor";
import { EditorHeader } from "./EditorHeader";
import { TitleInput } from "./TitleInput";
import { NoteTextArea } from "./NoteTextArea";
import { PreferencesOverrideForm } from "./PreferencesOverrideForm";
import { AutosaveIndicator } from "./AutosaveIndicator";
import { TabBar } from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotesEditorPageProps {
  noteId?: string;
  userPreferences?: any; // UserPreferences from types.ts
}

/**
 * Main editor page for creating and editing notes
 * Handles autosave, validation, and unsaved changes warnings
 */
export function NotesEditorPage({ noteId, userPreferences }: NotesEditorPageProps) {
  const {
    viewModel,
    error,
    isLoading,
    lastSavedAt,
    updateTitle,
    updateNoteText,
    updateTripPrefs,
    save,
  } = useNoteEditor(noteId);

  // Show error toasts
  useEffect(() => {
    if (error) {
      if (error.error === "conflict" || error.message.toLowerCase().includes("already exists")) {
        toast.error("Title already exists", {
          description: "Please choose a different title for your note.",
        });
      } else if (error.error === "not_found") {
        toast.error("Note not found", {
          description: "The note you're trying to edit doesn't exist.",
        });
      } else {
        toast.error("Error", {
          description: error.message,
        });
      }
    }
  }, [error]);

  const handleSave = async () => {
    // Validate before saving
    const titleTrimmed = viewModel.title.trim();
    const textTrimmed = viewModel.noteText.trim();

    if (!titleTrimmed) {
      toast.error("Title required", {
        description: "Please enter a title for your note.",
      });
      return;
    }

    if (titleTrimmed.length > 120) {
      toast.error("Title too long", {
        description: "Title must be 120 characters or less.",
      });
      return;
    }

    if (textTrimmed.length < 10) {
      toast.error("Note too short", {
        description: "Note must be at least 10 characters.",
      });
      return;
    }

    if (textTrimmed.length > 1500) {
      toast.error("Note too long", {
        description: "Note must be 1500 characters or less.",
      });
      return;
    }

    const success = await save();
    if (success) {
      toast.success("Note saved", {
        description: noteId ? "Your changes have been saved." : "Your note has been created.",
      });

      // If this was a new note, redirect to edit mode with the new ID
      if (!noteId && viewModel.noteId) {
        window.location.href = `/notes/${viewModel.noteId}`;
      }
    }
  };

  const handleBack = () => {
    if (viewModel.dirty) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmed) return;
    }
    window.location.href = "/notes";
  };

  const handleGenerateItinerary = () => {
    if (!noteId) {
      toast.error("Save note first", {
        description: "Please save your note before generating an itinerary.",
      });
      return;
    }

    if (viewModel.dirty) {
      toast.info("Unsaved changes", {
        description: "Your note has unsaved changes. Save them first.",
      });
      return;
    }

    // Save note ID to localStorage and navigate to generate page
    localStorage.setItem("viberide:last-selected-note", noteId);
    window.location.href = "/generate";
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <EditorHeader
          title="Loading..."
          saveState="idle"
          onSave={() => {}}
          onBack={handleBack}
          disabled={true}
        />
        <main className="flex-1 p-4">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-64 animate-pulse rounded bg-muted" />
          </div>
        </main>
      </div>
    );
  }

  // Show error state for not found
  if (error?.error === "not_found") {
    return (
      <div className="flex min-h-screen flex-col">
        <EditorHeader
          title="Note Not Found"
          saveState="idle"
          onSave={() => {}}
          onBack={handleBack}
          disabled={true}
        />
        <main className="flex-1 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
              <p className="text-lg font-medium text-destructive">Note not found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The note you're looking for doesn't exist or has been deleted.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const pageTitle = noteId ? viewModel.title || "Edit Note" : "New Note";
  const canSave =
    viewModel.title.trim().length > 0 &&
    viewModel.title.trim().length <= 120 &&
    viewModel.noteText.trim().length >= 10 &&
    viewModel.noteText.trim().length <= 1500;

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <EditorHeader
        title={pageTitle}
        saveState={viewModel.saveState}
        onSave={handleSave}
        onBack={handleBack}
        disabled={!canSave}
      />

      <main className="flex-1 p-4">
        <form
          className="mx-auto max-w-3xl space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Title Input */}
          <TitleInput
            value={viewModel.title}
            onChange={updateTitle}
            disabled={viewModel.saveState === "saving"}
          />

          {/* Note Text Area */}
          <NoteTextArea
            value={viewModel.noteText}
            onChange={updateNoteText}
            disabled={viewModel.saveState === "saving"}
          />

          {/* Trip Preferences Override */}
          <PreferencesOverrideForm
            value={viewModel.trip_prefs}
            onChange={updateTripPrefs}
            disabled={viewModel.saveState === "saving"}
            userDefaults={userPreferences}
          />

          {/* Autosave Indicator */}
          <div className="pt-4">
            <AutosaveIndicator state={viewModel.saveState} lastSavedAt={lastSavedAt} />
          </div>

          {/* Generate Itinerary Button - only show for existing notes */}
          {noteId && (
            <div className="pt-6 border-t">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Ready to ride?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate an AI-powered itinerary with turn-by-turn directions and downloadable GPX file.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleGenerateItinerary}
                  disabled={viewModel.dirty || viewModel.saveState === "saving"}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Itinerary
                </Button>
                {viewModel.dirty && (
                  <p className="text-xs text-muted-foreground text-center">
                    Save your changes first
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Hidden submit button for form submission via Enter */}
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </main>

      <TabBar currentPath={noteId ? `/notes/${noteId}` : "/notes/new"} />
    </div>
  );
}

