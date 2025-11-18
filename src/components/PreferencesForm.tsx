import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PreferencesFormValues } from "@/lib/hooks/useProfileState";

interface PreferencesFormProps {
  value: PreferencesFormValues;
  onUpdate: (field: keyof PreferencesFormValues, value: string) => void;
  errors: Partial<Record<keyof PreferencesFormValues, string>>;
  disabled?: boolean;
}

/**
 * Form component for capturing user riding preferences
 * Uses shadcn/ui components with real-time validation
 */
export function PreferencesForm({ value, onUpdate, errors, disabled = false }: PreferencesFormProps) {
  return (
    <div className="space-y-6">
      {/* Terrain Selection */}
      <div className="space-y-2">
        <Label htmlFor="terrain">
          Terrain <span className="text-destructive">*</span>
        </Label>
        <Select value={value.terrain} onValueChange={(val) => onUpdate("terrain", val)} disabled={disabled}>
          <SelectTrigger
            id="terrain"
            aria-invalid={!!errors.terrain}
            aria-describedby={errors.terrain ? "terrain-error" : undefined}
          >
            <SelectValue placeholder="Select terrain type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paved">Paved</SelectItem>
            <SelectItem value="gravel">Gravel</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
        {errors.terrain && (
          <p id="terrain-error" className="text-sm text-destructive" role="alert">
            {errors.terrain}
          </p>
        )}
      </div>

      {/* Road Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="road_type">
          Road Type <span className="text-destructive">*</span>
        </Label>
        <Select value={value.road_type} onValueChange={(val) => onUpdate("road_type", val)} disabled={disabled}>
          <SelectTrigger
            id="road_type"
            aria-invalid={!!errors.road_type}
            aria-describedby={errors.road_type ? "road_type-error" : undefined}
          >
            <SelectValue placeholder="Select road type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scenic">Scenic</SelectItem>
            <SelectItem value="twisty">Twisty</SelectItem>
            <SelectItem value="highway">Highway</SelectItem>
          </SelectContent>
        </Select>
        {errors.road_type && (
          <p id="road_type-error" className="text-sm text-destructive" role="alert">
            {errors.road_type}
          </p>
        )}
      </div>

      {/* Typical Duration */}
      <div className="space-y-2">
        <Label htmlFor="typical_duration_h">
          Typical Duration (hours) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="typical_duration_h"
          type="number"
          step="0.1"
          min="0.1"
          max="999.9"
          placeholder="e.g., 2.5"
          value={value.typical_duration_h}
          onChange={(e) => onUpdate("typical_duration_h", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.typical_duration_h}
          aria-describedby={errors.typical_duration_h ? "typical_duration_h-error" : undefined}
        />
        {errors.typical_duration_h && (
          <p id="typical_duration_h-error" className="text-sm text-destructive" role="alert">
            {errors.typical_duration_h}
          </p>
        )}
        <p className="text-sm text-muted-foreground">Maximum 999.9 hours</p>
      </div>

      {/* Typical Distance */}
      <div className="space-y-2">
        <Label htmlFor="typical_distance_km">
          Typical Distance (km) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="typical_distance_km"
          type="number"
          step="0.1"
          min="0.1"
          max="999999.9"
          placeholder="e.g., 250.0"
          value={value.typical_distance_km}
          onChange={(e) => onUpdate("typical_distance_km", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.typical_distance_km}
          aria-describedby={errors.typical_distance_km ? "typical_distance_km-error" : undefined}
        />
        {errors.typical_distance_km && (
          <p id="typical_distance_km-error" className="text-sm text-destructive" role="alert">
            {errors.typical_distance_km}
          </p>
        )}
        <p className="text-sm text-muted-foreground">Maximum 999,999.9 km</p>
      </div>
    </div>
  );
}
