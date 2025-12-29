import { Archive, ArchiveRestore, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadges } from "./StatusBadges";
import { useSwipe } from "@/lib/hooks/useSwipe";
import type { NoteVM } from "@/lib/types/notesView.types";

interface NoteCardProps {
  note: NoteVM;
  onArchive: (noteId: string) => void;
  onUnarchive: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  onClick: (noteId: string) => void;
  onGenerate?: (noteId: string) => void;
  disabled?: boolean;
}

/**
 * NoteCard - displays a single note with actions
 * Supports archive/unarchive and delete operations
 * Includes swipe gestures on mobile (left = delete, right = archive/unarchive)
 */
export function NoteCard({ note, onArchive, onUnarchive, onDelete, onClick, onGenerate, disabled = false }: NoteCardProps) {
  // Swipe handlers for mobile
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (!disabled) {
        onDelete(note.note_id);
      }
    },
    onSwipeRight: () => {
      if (!disabled) {
        if (note.isArchived) {
          onUnarchive(note.note_id);
        } else {
          onArchive(note.note_id);
        }
      }
    },
  });

  const handleCardClick = () => {
    if (!disabled) {
      onClick(note.note_id);
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      if (note.isArchived) {
        onUnarchive(note.note_id);
      } else {
        onArchive(note.note_id);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onDelete(note.note_id);
    }
  };

  const handleGenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onGenerate) {
      onGenerate(note.note_id);
    }
  };

  // Format date
  const formattedDate = new Date(note.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Truncate note text for preview
  const truncatedText = note.note_text.length > 150 ? `${note.note_text.slice(0, 150)}...` : note.note_text;

  return (
    <article
      className="group rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer touch-pan-y"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`Note: ${note.title}`}
      {...swipeHandlers}
    >
      <div className="space-y-3">
        {/* Header with title and status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{note.title}</h3>
          </div>
          <StatusBadges isArchived={note.isArchived} itineraryCount={note.itinerary_count} />
        </div>

        {/* Note text preview */}
        <p className="text-sm text-muted-foreground line-clamp-2">{truncatedText}</p>

        {/* Footer with metadata and actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{formattedDate}</span>
            {note.distance_km && <span>{note.distance_km} km</span>}
            {note.duration_h && <span>{note.duration_h} h</span>}
          </div>

          {/* Action buttons - always visible on mobile, hover on desktop */}
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {onGenerate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGenerate}
                disabled={disabled}
                aria-label="Generate itinerary"
                className="h-8 w-8 text-primary hover:text-primary"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleArchive}
              disabled={disabled}
              aria-label={note.isArchived ? "Unarchive note" : "Archive note"}
              className="h-8 w-8"
            >
              {note.isArchived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={disabled}
              aria-label="Delete note"
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

