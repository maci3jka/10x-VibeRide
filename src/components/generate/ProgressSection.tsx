import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpinnerWheel } from "./SpinnerWheel";
import { ProgressBar } from "./ProgressBar";

interface ProgressSectionProps {
  progress?: number;
  onCancel: () => void;
  showCancelButton: boolean;
}

/**
 * ProgressSection - displays generation progress
 * Shows spinner when awaiting first progress, then progress bar
 */
export function ProgressSection({ progress, onCancel, showCancelButton }: ProgressSectionProps) {
  const hasProgress = progress !== undefined && progress > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generating Itinerary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show spinner when no progress yet, otherwise show progress bar */}
        {!hasProgress ? (
          <div className="flex flex-col items-center justify-center py-8">
            <SpinnerWheel />
            <p className="mt-4 text-sm text-muted-foreground">Starting generation...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <ProgressBar progress={progress} />
            <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
          </div>
        )}
      </CardContent>
      {showCancelButton && (
        <CardFooter>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel Generation
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}


