import { z } from "zod";

/**
 * Zod schema for validating generate itinerary requests
 * Used in POST /api/notes/:noteId/itineraries
 */
export const generateItinerarySchema = z.object({
  request_id: z
    .string({
      required_error: "Request ID is required",
      invalid_type_error: "Request ID must be a string",
    })
    .uuid("Request ID must be a valid UUID"),
});

export type GenerateItineraryInput = z.infer<typeof generateItinerarySchema>;

/**
 * Zod schema for validating list itineraries query parameters
 * Used in GET /api/notes/:noteId/itineraries
 */
export const listItinerariesQuerySchema = z.object({
  status: z
    .enum(["pending", "running", "completed", "failed", "cancelled"], {
      errorMap: () => ({ message: "Status must be one of: pending, running, completed, failed, cancelled" }),
    })
    .optional(),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number({
          invalid_type_error: "Limit must be a number",
        })
        .int("Limit must be an integer")
        .min(1, "Limit must be at least 1")
        .max(100, "Limit cannot exceed 100")
    ),
});

export type ListItinerariesQueryInput = z.infer<typeof listItinerariesQuerySchema>;

/**
 * Zod schema for validating GPX download query parameters
 * Used in GET /api/itineraries/:itineraryId/gpx
 * Requires user to acknowledge GPS accuracy disclaimer
 */
export const downloadGpxQuerySchema = z.object({
  acknowledged: z
    .string({
      required_error: "Acknowledged parameter is required",
      invalid_type_error: "Acknowledged must be a string",
    })
    .refine((val) => val === "true", {
      message: "You must acknowledge the GPS accuracy disclaimer by setting acknowledged=true",
    })
    .transform(() => true),
});

export type DownloadGpxQueryInput = z.infer<typeof downloadGpxQuerySchema>;

