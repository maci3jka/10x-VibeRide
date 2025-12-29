import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

/**
 * GenerateButton - triggers itinerary generation
 * Shows loading state during initial POST request
 */
export function GenerateButton({ disabled, loading, onClick }: GenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full"
      size="lg"
      aria-busy={loading}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? "Starting generation..." : "Generate Itinerary"}
    </Button>
  );
}


