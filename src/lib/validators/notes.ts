import { z } from "zod";

/**
 * Zod schema for validating trip preferences
 * Used as part of note creation/update
 */
export const tripPreferencesSchema = z
  .object({
    terrain: z.enum(["paved", "gravel", "mixed"], {
      errorMap: () => ({ message: "Terrain must be one of: paved, gravel, mixed" }),
    }),
    road_type: z.enum(["scenic", "twisty", "highway"], {
      errorMap: () => ({ message: "Road type must be one of: scenic, twisty, highway" }),
    }),
    duration_h: z
      .number({
        invalid_type_error: "Duration must be a number",
      })
      .positive("Duration must be greater than 0")
      .max(999.9, "Duration cannot exceed 999.9 hours"),
    distance_km: z
      .number({
        invalid_type_error: "Distance must be a number",
      })
      .positive("Distance must be greater than 0")
      .max(999999.9, "Distance cannot exceed 999999.9 km"),
  })
  .partial();

/**
 * Zod schema for validating note creation requests
 * Used in POST /api/notes
 */
export const createNoteSchema = z.object({
  title: z
    .string({
      required_error: "Title is required",
      invalid_type_error: "Title must be a string",
    })
    .trim()
    .min(1, "Title must be at least 1 character")
    .max(120, "Title cannot exceed 120 characters"),
  note_text: z
    .string({
      required_error: "Note text is required",
      invalid_type_error: "Note text must be a string",
    })
    .trim()
    .min(10, "Note text must be at least 10 characters")
    .max(1500, "Note text cannot exceed 1500 characters"),
  trip_prefs: tripPreferencesSchema.optional().default({}),
});

/**
 * Zod schema for validating list notes query parameters
 * Used in GET /api/notes
 */
export const listNotesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, "Page must be at least 1")),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100")),
  search: z
    .string()
    .max(250, "Search query cannot exceed 250 characters")
    .optional()
    .transform((val) => val?.trim()),
  archived: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  sort: z
    .enum(["updated_at", "created_at", "title"], {
      errorMap: () => ({ message: "Sort must be one of: updated_at, created_at, title" }),
    })
    .optional()
    .default("updated_at"),
  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "Order must be one of: asc, desc" }),
    })
    .optional()
    .default("desc"),
});

/**
 * Zod schema for validating note update requests
 * Used in PUT /api/notes/:noteId
 * Same structure as createNoteSchema
 */
export const updateNoteSchema = createNoteSchema;

/**
 * Zod schema for validating noteId path parameter
 * Used in GET/PUT/DELETE /api/notes/:noteId
 */
export const noteIdParamSchema = z.string().uuid("Invalid note ID format");

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQueryInput = z.infer<typeof listNotesQuerySchema>;
