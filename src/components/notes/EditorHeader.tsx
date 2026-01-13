import { Button } from "@/components/ui/button";
import { SaveStatusChip } from "./SaveStatusChip";
import type { SaveState } from "@/lib/hooks/useNoteEditor";
import { ArrowLeft } from "lucide-react";

interface EditorHeaderProps {
  title: string;
  saveState: SaveState;
  onSave: () => void;
  onBack: () => void;
  disabled?: boolean;
}

/**
 * Sticky header for note editor with title, save button, and status
 */
export function EditorHeader({ title, saveState, onSave, onBack, disabled = false }: EditorHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <SaveStatusChip state={saveState} />
        <Button onClick={onSave} disabled={disabled || saveState === "saving"} size="sm">
          Save
        </Button>
      </div>
    </header>
  );
}



