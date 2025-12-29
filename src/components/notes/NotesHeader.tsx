import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NotesHeaderProps {
  query: string;
  includeArchived: boolean;
  onSearch: (query: string) => void;
  onToggleArchived: (includeArchived: boolean) => void;
  onNewNote: () => void;
}

const MAX_SEARCH_LENGTH = 250;
const DEBOUNCE_MS = 300;

/**
 * NotesHeader - top control bar for notes view
 * Includes search input, archived toggle, and new note button
 */
export function NotesHeader({ query, includeArchived, onSearch, onToggleArchived, onNewNote }: NotesHeaderProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Sync local query with prop changes
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== query) {
        onSearch(localQuery);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [localQuery, query, onSearch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Validate length
    if (value.length > MAX_SEARCH_LENGTH) {
      setSearchError(`Search query must be ${MAX_SEARCH_LENGTH} characters or less`);
      return;
    }

    setSearchError(null);
    setLocalQuery(value);
  }, []);

  const handleToggleArchived = useCallback(() => {
    onToggleArchived(!includeArchived);
  }, [includeArchived, onToggleArchived]);

  return (
    <header className="space-y-4">
      {/* Title and New Note Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Trip Notes</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your motorcycle trip notes
          </p>
        </div>
        <Button onClick={onNewNote} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search notes..."
            value={localQuery}
            onChange={handleSearchChange}
            className="pl-9"
            aria-label="Search notes"
            aria-invalid={!!searchError}
            aria-describedby={searchError ? "search-error" : undefined}
          />
          {searchError && (
            <p id="search-error" className="text-xs text-destructive mt-1">
              {searchError}
            </p>
          )}
        </div>

        {/* Archived Toggle */}
        <Button
          variant={includeArchived ? "default" : "outline"}
          onClick={handleToggleArchived}
          className="gap-2 shrink-0"
          aria-pressed={includeArchived}
          aria-label={includeArchived ? "Hide archived notes" : "Show archived notes"}
        >
          <Archive className="h-4 w-4" />
          {includeArchived ? "Hide Archived" : "Show Archived"}
        </Button>
      </div>
    </header>
  );
}


