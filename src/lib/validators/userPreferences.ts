import { z } from "zod";

/**
 * Zod schema for validating user preferences update requests
 * Used in PUT /api/user/preferences
 */
export const updateUserPreferencesSchema = z.object({
  terrain: z.enum(["paved", "gravel", "mixed"], {
    errorMap: () => ({ message: "Terrain must be one of: paved, gravel, mixed" }),
  }),
  road_type: z.enum(["scenic", "twisty", "highway"], {
    errorMap: () => ({ message: "Road type must be one of: scenic, twisty, highway" }),
  }),
  typical_duration_h: z
    .number({
      required_error: "Typical duration is required",
      invalid_type_error: "Typical duration must be a number",
    })
    .positive("Typical duration must be greater than 0")
    .max(999.9, "Typical duration cannot exceed 999.9 hours"),
  typical_distance_km: z
    .number({
      required_error: "Typical distance is required",
      invalid_type_error: "Typical distance must be a number",
    })
    .positive("Typical distance must be greater than 0")
    .max(999999.9, "Typical distance cannot exceed 999999.9 km"),
});

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;

