import type { APIRoute } from "astro";
import { statsQuerySchema } from "../../../../lib/validators/analytics";
import { getGenerationStats } from "../../../../lib/services/analyticsService";
import { jsonResponse, errorResponse } from "../../../../lib/http";
import { logger } from "../../../../lib/logger";
import { isServiceRole, isDevelopmentMode } from "../../../../lib/auth-helpers";

/**
 * GET /api/analytics/generations/stats
 * Retrieves aggregated itinerary generation statistics for administrative dashboards
 *
 * @requires Service Role Authentication - unless DEVENV=true
 * @query from (optional) - ISO 8601 date for statistics start date
 * @query to (optional) - ISO 8601 date for statistics end date
 * @returns 200 GenerationStatsResponse | 400/401/403/500 ErrorResponse
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const isDev = isDevelopmentMode();

  // Verify service role authentication
  const hasServiceRole = await isServiceRole(locals.supabase);

  if (!hasServiceRole) {
    logger.warn({ userId: locals.user?.id, isDev }, "Analytics endpoint accessed without service_role authentication");
    return errorResponse(403, "forbidden", "Service role authentication required for analytics endpoints");
  }

  // Parse and validate query parameters
  const queryParams = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  };

  const parseResult = statsQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};

    // Convert Zod error format to our error response format
    for (const [field, messages] of Object.entries(fieldErrors)) {
      details[field] = Array.isArray(messages) ? messages.join(", ") : String(messages);
    }

    return errorResponse(400, "validation_failed", "Invalid query parameters", details);
  }

  // Fetch generation statistics
  try {
    const stats = await getGenerationStats(locals.supabase, parseResult.data);
    return jsonResponse(200, stats);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, errorMessage: errorMsg }, "Failed to fetch generation statistics");

    // Return detailed error in dev mode
    if (isDev) {
      return errorResponse(500, "server_error", `Failed to fetch generation statistics: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to fetch generation statistics");
  }
};

export const prerender = false;
