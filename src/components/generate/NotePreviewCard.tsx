import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { NoteListItemResponse } from "@/types";

interface NotePreviewCardProps {
  note: NoteListItemResponse;
}

/**
 * NotePreviewCard - displays note title and snippet
 * Shows context for the itinerary generation
 */
export function NotePreviewCard({ note }: NotePreviewCardProps) {
  // Truncate note text to first 200 characters for preview
  const snippet =
    note.note_text.length > 200 ? `${note.note_text.substring(0, 200)}...` : note.note_text;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{note.title}</CardTitle>
        <CardDescription>Trip notes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{snippet}</p>
      </CardContent>
    </Card>
  );
}


