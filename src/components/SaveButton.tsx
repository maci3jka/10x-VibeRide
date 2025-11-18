import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

type SaveButtonState = "idle" | "saving" | "success" | "error";

interface SaveButtonProps {
  disabled: boolean;
  state: SaveButtonState;
  onClick: () => void;
}

/**
 * Save button with loading and success states
 * Handles optimistic UI feedback during save operations
 */
export function SaveButton({ disabled, state, onClick }: SaveButtonProps) {
  const isLoading = state === "saving";
  const isSuccess = state === "success";

  return (
    <Button onClick={onClick} disabled={disabled || isLoading} className="min-w-[120px]" aria-busy={isLoading}>
      {isLoading && <Loader2 className="animate-spin" />}
      {isSuccess && <Check />}
      {isLoading ? "Saving..." : isSuccess ? "Saved!" : "Save Preferences"}
    </Button>
  );
}
