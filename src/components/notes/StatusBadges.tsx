import { Archive, FileText } from "lucide-react";

interface StatusBadgesProps {
  isArchived: boolean;
  itineraryCount: number;
}

/**
 * StatusBadges - displays status indicators for notes
 * Shows archived state and itinerary count
 */
export function StatusBadges({ isArchived, itineraryCount }: StatusBadgesProps) {
  return (
    <div className="flex items-center gap-2">
      {isArchived && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          <Archive className="h-3 w-3" />
          Archived
        </span>
      )}
      {itineraryCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          <FileText className="h-3 w-3" />
          {itineraryCount} {itineraryCount === 1 ? "itinerary" : "itineraries"}
        </span>
      )}
    </div>
  );
}
