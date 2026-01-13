import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TripPreferences } from "@/types";

interface PreferencesOverrideFormProps {
  value: TripPreferences;
  onChange: (prefs: TripPreferences) => void;
  disabled?: boolean;
  userDefaults?: unknown; // UserPreferences from types.ts
}

/**
 * Form for optional trip preference overrides
 * All fields are optional - empty values inherit from user defaults
 */
export function PreferencesOverrideForm({
  value,
  onChange,
  disabled = false,
  userDefaults,
}: PreferencesOverrideFormProps) {
  // Ensure value is always an object, even if undefined is passed
  const prefs = value ?? {};

  const updateField = <K extends keyof TripPreferences>(field: K, fieldValue: TripPreferences[K]) => {
    onChange({ ...prefs, [field]: fieldValue });
  };

  const clearField = (field: keyof TripPreferences) => {
    const newPrefs = { ...prefs };
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete newPrefs[field];
    onChange(newPrefs);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Trip Preferences (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Override your default preferences for this specific trip. Leave blank to use your profile defaults.
        </p>
      </div>

      {/* Terrain Selection */}
      <div className="space-y-2">
        <Label htmlFor="trip-terrain">Terrain</Label>
        <Select
          value={prefs.terrain ?? "__default__"}
          onValueChange={(val) =>
            val === "__default__" ? clearField("terrain") : updateField("terrain", val as TripPreferences["terrain"])
          }
          disabled={disabled}
        >
          <SelectTrigger id="trip-terrain">
            <SelectValue placeholder="Use default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">
              Use default {userDefaults?.terrain && `(${userDefaults.terrain})`}
            </SelectItem>
            <SelectItem value="paved">Paved</SelectItem>
            <SelectItem value="gravel">Gravel</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
        {!prefs.terrain && userDefaults?.terrain && (
          <p className="text-xs text-muted-foreground">Default: {userDefaults.terrain}</p>
        )}
      </div>

      {/* Road Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="trip-road-type">Road Type</Label>
        <Select
          value={prefs.road_type ?? "__default__"}
          onValueChange={(val) =>
            val === "__default__"
              ? clearField("road_type")
              : updateField("road_type", val as TripPreferences["road_type"])
          }
          disabled={disabled}
        >
          <SelectTrigger id="trip-road-type">
            <SelectValue placeholder="Use default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">
              Use default {userDefaults?.road_type && `(${userDefaults.road_type})`}
            </SelectItem>
            <SelectItem value="scenic">Scenic</SelectItem>
            <SelectItem value="twisty">Twisty</SelectItem>
            <SelectItem value="highway">Highway</SelectItem>
          </SelectContent>
        </Select>
        {!prefs.road_type && userDefaults?.road_type && (
          <p className="text-xs text-muted-foreground">Default: {userDefaults.road_type}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="trip-duration">Duration (hours)</Label>
        <Input
          id="trip-duration"
          type="number"
          step="0.1"
          min="0.1"
          max="999.9"
          placeholder={userDefaults?.typical_duration_h ? `Default: ${userDefaults.typical_duration_h}` : "Use default"}
          value={prefs.duration_h ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              clearField("duration_h");
            } else {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                updateField("duration_h", num);
              }
            }
          }}
          disabled={disabled}
        />
        {!prefs.duration_h && userDefaults?.typical_duration_h ? (
          <p className="text-xs text-muted-foreground">Default: {userDefaults.typical_duration_h} hours</p>
        ) : (
          <p className="text-xs text-muted-foreground">Maximum 999.9 hours</p>
        )}
      </div>

      {/* Distance */}
      <div className="space-y-2">
        <Label htmlFor="trip-distance">Distance (km)</Label>
        <Input
          id="trip-distance"
          type="number"
          step="0.1"
          min="0.1"
          max="999999.9"
          placeholder={
            userDefaults?.typical_distance_km ? `Default: ${userDefaults.typical_distance_km}` : "Use default"
          }
          value={prefs.distance_km ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              clearField("distance_km");
            } else {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                updateField("distance_km", num);
              }
            }
          }}
          disabled={disabled}
        />
        {!prefs.distance_km && userDefaults?.typical_distance_km ? (
          <p className="text-xs text-muted-foreground">Default: {userDefaults.typical_distance_km} km</p>
        ) : (
          <p className="text-xs text-muted-foreground">Maximum 999,999.9 km</p>
        )}
      </div>
    </div>
  );
}
