import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ConfirmAction } from "@/lib/types/notesView.types";

interface ConfirmDialogProps {
  isOpen: boolean;
  action: ConfirmAction | null;
  noteTitle: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * ConfirmDialog - generic confirmation dialog for destructive actions
 * Supports delete, archive, and unarchive actions
 */
export function ConfirmDialog({
  isOpen,
  action,
  noteTitle,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!action) return null;

  // Configure dialog content based on action
  const config = getDialogConfig(action, noteTitle);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {config.isDestructive && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            )}
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{config.description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={config.isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get dialog configuration based on action type
 */
function getDialogConfig(action: ConfirmAction, noteTitle: string | null) {
  const title = noteTitle ? `"${noteTitle}"` : "this note";

  switch (action) {
    case "delete":
      return {
        title: "Delete Note",
        description: `Are you sure you want to delete ${title}? This action cannot be undone. All associated itineraries will also be deleted.`,
        confirmLabel: "Delete",
        isDestructive: true,
      };
    case "archive":
      return {
        title: "Archive Note",
        description: `Archive ${title}? You can restore it later from the archived notes.`,
        confirmLabel: "Archive",
        isDestructive: false,
      };
    case "unarchive":
      return {
        title: "Unarchive Note",
        description: `Restore ${title} to your active notes?`,
        confirmLabel: "Unarchive",
        isDestructive: false,
      };
  }
}


