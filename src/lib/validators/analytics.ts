import { z } from "zod";

/**
 * Zod schema for validating analytics query parameters
 * Used in GET /api/analytics/users/stats and GET /api/analytics/generations/stats
 */
export const statsQuerySchema = z
  .object({
    from: z.string().datetime({ message: "Invalid ISO 8601 date format for 'from' parameter" }).optional(),
    to: z.string().datetime({ message: "Invalid ISO 8601 date format for 'to' parameter" }).optional(),
  })
  .refine(
    (data) => {
      // If both from and to are provided, ensure from <= to
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: "'from' date must be before or equal to 'to' date",
      path: ["from"],
    }
  );

export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
