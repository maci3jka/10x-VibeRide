import type { APIRoute } from "astro";
import { getStatus, ItineraryNotFoundError } from "../../../../lib/services/itineraryService";
import { jsonResponse, errorResponse } from "../../../../lib/http";
import { logger } from "../../../../lib/logger";

/**
 * GET /api/itineraries/:itineraryId/status
 * Retrieves the generation status of an itinerary
 * Returns different response structure based on current status (pending/running/completed/failed/cancelled)
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param itineraryId UUID of the itinerary (path parameter)
 * @returns 200 ItineraryStatusResponse | 400/401/404/500 ErrorResponse
 */
export const GET: APIRoute = async ({ locals, params }) => {
  // Check authentication
  if (!locals.user) {
    return errorResponse(401, "unauthenticated", "Login required");
  }

  // Validate itineraryId path parameter
  const { itineraryId } = params;
  if (!itineraryId) {
    return errorResponse(400, "invalid_parameter", "Itinerary ID is required");
  }

  // Validate UUID format for itineraryId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itineraryId)) {
    return errorResponse(400, "invalid_parameter", "Itinerary ID must be a valid UUID");
  }

  // Get itinerary status
  try {
    const result = await getStatus(locals.supabase, locals.user.id, itineraryId);

    logger.info(
      {
        userId: locals.user.id,
        itineraryId,
        status: result.status,
      },
      "Retrieved itinerary status"
    );

    return jsonResponse(200, result);
  } catch (err) {
    // Handle specific error types
    if (err instanceof ItineraryNotFoundError) {
      logger.info({ userId: locals.user.id, itineraryId }, "Itinerary not found or access denied");
      return errorResponse(404, "itinerary_not_found", err.message);
    }

    // Generic error
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(
      { err, userId: locals.user.id, itineraryId, errorMessage: errorMsg },
      "Failed to fetch itinerary status"
    );

    // Return detailed error in dev mode
    if (process.env.DEVENV === "true") {
      return errorResponse(500, "server_error", `Failed to fetch itinerary status: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to fetch itinerary status");
  }
};

export const prerender = false;
