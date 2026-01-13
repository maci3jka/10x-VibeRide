import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNotes, useNoteMutations } from "@/lib/hooks/useNotes";
import { NotesHeader } from "@/components/notes/NotesHeader";
import { InfiniteScrollList } from "@/components/notes/InfiniteScrollList";
import { NoteCard } from "@/components/notes/NoteCard";
import { EmptyState } from "@/components/notes/EmptyState";
import { SkeletonList } from "@/components/notes/SkeletonLoader";
import { ConfirmDialog } from "@/components/notes/ConfirmDialog";
import { TabBar } from "@/components/TabBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import type { NoteVM, ConfirmDialogState, NotesPageState } from "@/lib/types/notesView.types";
import type { NoteListItemResponse } from "@/types";

/**
 * Transform API response to view model
 */
function toNoteVM(note: NoteListItemResponse): NoteVM {
  return {
    ...note,
    isArchived: note.archived_at !== null,
    hasItinerary: note.has_itinerary,
    statusLabel: note.archived_at
      ? "Archived"
      : note.itinerary_count > 0
        ? `${note.itinerary_count} ${note.itinerary_count === 1 ? "itinerary" : "itineraries"}`
        : "",
  };
}

/**
 * NotesPage - main container for notes view
 * Manages state, data fetching, and user interactions
 */
export function NotesPage() {
  // Local UI state
  const [pageState, setPageState] = useState<NotesPageState>({
    query: "",
    includeArchived: false,
  });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: null,
    noteId: null,
    noteTitle: null,
  });

  // Data fetching and mutations
  const { data, error, isFetching, hasNextPage, fetchNotes, fetchNextPage, refetch } = useNotes();
  const { archiveNote, unarchiveNote, deleteNote, isMutating, error: mutationError } = useNoteMutations();

  // Initial fetch
  useEffect(() => {
    fetchNotes({
      page: 1,
      limit: 20,
      search: pageState.query || undefined,
      archived: pageState.includeArchived || undefined,
      sort: "updated_at",
      order: "desc",
    });
  }, [pageState.query, pageState.includeArchived, fetchNotes]);

  // Handle fetch errors
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load notes");
    }
  }, [error]);

  // Handle mutation errors
  useEffect(() => {
    if (mutationError) {
      toast.error(mutationError.message || "Operation failed");
    }
  }, [mutationError]);

  // Transform notes to view models
  const noteVMs = data.map(toNoteVM);

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setPageState((prev) => ({ ...prev, query }));
  }, []);

  const handleToggleArchived = useCallback((includeArchived: boolean) => {
    setPageState((prev) => ({ ...prev, includeArchived }));
  }, []);

  const handleNewNote = useCallback(() => {
    window.location.href = "/notes/new";
  }, []);

  const handleNoteClick = useCallback((noteId: string) => {
    window.location.href = `/notes/${noteId}`;
  }, []);

  const handleGenerate = useCallback((noteId: string) => {
    // Save note ID to localStorage and navigate to generate page
    localStorage.setItem("viberide:last-selected-note", noteId);
    window.location.href = "/generate";
  }, []);

  const handleArchive = useCallback(
    (noteId: string) => {
      const note = data.find((n) => n.note_id === noteId);
      setConfirmDialog({
        isOpen: true,
        action: "archive",
        noteId,
        noteTitle: note?.title || null,
      });
    },
    [data]
  );

  const handleUnarchive = useCallback(
    (noteId: string) => {
      const note = data.find((n) => n.note_id === noteId);
      setConfirmDialog({
        isOpen: true,
        action: "unarchive",
        noteId,
        noteTitle: note?.title || null,
      });
    },
    [data]
  );

  const handleDelete = useCallback(
    (noteId: string) => {
      const note = data.find((n) => n.note_id === noteId);
      setConfirmDialog({
        isOpen: true,
        action: "delete",
        noteId,
        noteTitle: note?.title || null,
      });
    },
    [data]
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmDialog.noteId || !confirmDialog.action) return;

    const { noteId, action } = confirmDialog;

    // Close dialog immediately for better UX
    setConfirmDialog({
      isOpen: false,
      action: null,
      noteId: null,
      noteTitle: null,
    });

    let result = null;

    // Execute mutation
    switch (action) {
      case "archive":
        result = await archiveNote(noteId);
        if (result) {
          toast.success("Note archived");
          refetch();
        }
        break;
      case "unarchive":
        result = await unarchiveNote(noteId);
        if (result) {
          toast.success("Note restored");
          refetch();
        }
        break;
      case "delete":
        result = await deleteNote(noteId);
        if (result) {
          toast.success("Note deleted");
          refetch();
        }
        break;
    }
  }, [confirmDialog, archiveNote, unarchiveNote, deleteNote, refetch]);

  const handleCancel = useCallback(() => {
    setConfirmDialog({
      isOpen: false,
      action: null,
      noteId: null,
      noteTitle: null,
    });
  }, []);

  const isInitialLoading = isFetching && data.length === 0;
  const isSearching = pageState.query.length > 0;

  return (
    <>
      <OfflineBanner />

      <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
        <div className="space-y-6">
          {/* Header */}
          <NotesHeader
            query={pageState.query}
            includeArchived={pageState.includeArchived}
            onSearch={handleSearch}
            onToggleArchived={handleToggleArchived}
            onNewNote={handleNewNote}
          />

          {/* Loading State */}
          {isInitialLoading && (
            <div className="space-y-3">
              <SkeletonList count={3} />
            </div>
          )}

          {/* Notes List */}
          {!isInitialLoading && (
            <InfiniteScrollList
              items={noteVMs}
              renderItem={(note) => (
                <NoteCard
                  note={note}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onDelete={handleDelete}
                  onClick={handleNoteClick}
                  onGenerate={handleGenerate}
                  disabled={isMutating}
                />
              )}
              onReachBottom={fetchNextPage}
              hasMore={hasNextPage}
              isLoading={isFetching && data.length > 0}
              loadingComponent={<SkeletonList count={2} />}
              emptyComponent={<EmptyState isSearching={isSearching} onCreateNote={handleNewNote} />}
            />
          )}
        </div>
      </div>

      {/* Tab Bar Navigation */}
      <TabBar currentPath="/notes" />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        action={confirmDialog.action}
        noteTitle={confirmDialog.noteTitle}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={isMutating}
      />
    </>
  );
}
