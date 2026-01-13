import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NoteListItemResponse } from "@/types";

interface NoteSelectorProps {
  notes: NoteListItemResponse[];
  selectedNoteId: string;
  onSelectNote: (noteId: string) => void;
  disabled?: boolean;
}

/**
 * NoteSelector - dropdown to switch between notes
 * Allows users to change which note to generate an itinerary for
 */
export function NoteSelector({ notes, selectedNoteId, onSelectNote, disabled = false }: NoteSelectorProps) {
  const selectedNote = notes.find((note) => note.note_id === selectedNoteId);

  return (
    <div className="space-y-2">
      <Label htmlFor="note-selector" className="text-sm font-medium">
        Select Note
      </Label>
      <Select value={selectedNoteId} onValueChange={onSelectNote} disabled={disabled}>
        <SelectTrigger id="note-selector" className="w-full">
          <SelectValue placeholder="Select a note...">
            {selectedNote ? selectedNote.title : "Select a note..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {notes.map((note) => (
            <SelectItem key={note.note_id} value={note.note_id}>
              <div className="flex flex-col">
                <span className="font-medium">{note.title}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                  {note.note_text.slice(0, 60)}
                  {note.note_text.length > 60 ? "..." : ""}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
