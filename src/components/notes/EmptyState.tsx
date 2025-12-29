import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  isSearching: boolean;
  onCreateNote: () => void;
}

/**
 * EmptyState - shown when no notes are found
 * Different messages for empty list vs no search results
 */
export function EmptyState({ isSearching, onCreateNote }: EmptyStateProps) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No notes found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Start your journey by creating your first trip note. Describe where you want to ride, and we'll help you create an amazing itinerary.
      </p>
      <Button onClick={onCreateNote} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Your First Note
      </Button>
    </div>
  );
}


