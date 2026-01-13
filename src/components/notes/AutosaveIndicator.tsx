import type { SaveState } from "@/lib/hooks/useNoteEditor";
import { AlertCircle } from "lucide-react";

interface AutosaveIndicatorProps {
  state: SaveState;
  lastSavedAt?: Date | null;
}

/**
 * Shows autosave status and last saved time
 */
export function AutosaveIndicator({ state, lastSavedAt }: AutosaveIndicatorProps) {
  if (state === "saving") {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Saving…
      </p>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive" role="alert" aria-live="assertive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span>Failed to save. Changes will be saved on next attempt.</span>
      </div>
    );
  }

  if (lastSavedAt) {
    const now = new Date();
    const diffMs = now.getTime() - lastSavedAt.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    let timeAgo = "";
    if (diffSeconds < 60) {
      timeAgo = `${diffSeconds} second${diffSeconds !== 1 ? "s" : ""} ago`;
    } else {
      const diffMinutes = Math.floor(diffSeconds / 60);
      timeAgo = `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    }

    return (
      <p className="text-sm text-muted-foreground" role="status">
        Autosaved {timeAgo}
      </p>
    );
  }

  return null;
}



