import type { SaveState } from "@/lib/hooks/useNoteEditor";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface SaveStatusChipProps {
  state: SaveState;
}

/**
 * Visual indicator for save status
 * Shows different icons and colors based on save state
 */
export function SaveStatusChip({ state }: SaveStatusChipProps) {
  if (state === "idle") {
    return null;
  }

  if (state === "saving") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Saving…</span>
      </div>
    );
  }

  if (state === "saved") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500" role="status" aria-live="polite">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        <span>Saved</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive" role="alert" aria-live="assertive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span>Error</span>
      </div>
    );
  }

  return null;
}



