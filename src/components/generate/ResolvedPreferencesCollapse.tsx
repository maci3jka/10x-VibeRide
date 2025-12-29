import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TripPreferences } from "@/types";

interface ResolvedPreferencesCollapseProps {
  preferences: Required<TripPreferences>;
}

/**
 * ResolvedPreferencesCollapse - displays resolved preference values
 * Shows the actual values that will be used for generation (overrides → defaults)
 */
export function ResolvedPreferencesCollapse({ preferences }: ResolvedPreferencesCollapseProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTerrain = (terrain: string) => {
    return terrain.charAt(0).toUpperCase() + terrain.slice(1);
  };

  const formatRoadType = (roadType: string) => {
    return roadType.charAt(0).toUpperCase() + roadType.slice(1);
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Generation Preferences</CardTitle>
          <Button variant="ghost" size="sm" aria-expanded={isExpanded} aria-label="Toggle preferences">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-muted-foreground">Terrain</dt>
              <dd className="mt-1">{formatTerrain(preferences.terrain)}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Road Type</dt>
              <dd className="mt-1">{formatRoadType(preferences.road_type)}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Duration</dt>
              <dd className="mt-1">{preferences.duration_h} hours</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Distance</dt>
              <dd className="mt-1">{preferences.distance_km} km</dd>
            </div>
          </dl>
        </CardContent>
      )}
    </Card>
  );
}


