import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { UserPreferencesResponse } from "@/types";

interface ConflictDialogProps {
  isOpen: boolean;
  serverPrefs: UserPreferencesResponse;
  onOverwrite: () => void;
  onReload: () => void;
}

/**
 * Dialog shown when preferences have been updated elsewhere (409 conflict)
 * Allows user to choose between overwriting server data or reloading
 */
export function ConflictDialog({ isOpen, serverPrefs, onOverwrite, onReload }: ConflictDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-warning" />
            <DialogTitle>Preferences Updated Elsewhere</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your preferences have been updated from another device or browser. You can either reload to see the latest
            changes or overwrite them with your current changes.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Current Server Values:</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Terrain:</dt>
              <dd className="font-medium capitalize">{serverPrefs.terrain}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Road Type:</dt>
              <dd className="font-medium capitalize">{serverPrefs.road_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Duration:</dt>
              <dd className="font-medium">{serverPrefs.typical_duration_h}h</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Distance:</dt>
              <dd className="font-medium">{serverPrefs.typical_distance_km}km</dd>
            </div>
          </dl>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onReload}>
            Reload Latest
          </Button>
          <Button variant="default" onClick={onOverwrite}>
            Overwrite with Mine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
