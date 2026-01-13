import type { APIRoute } from "astro";
import { cancelGeneration, ItineraryNotFoundError, CannotCancelError } from "../../../../lib/services/itineraryService";
import { jsonResponse, errorResponse } from "../../../../lib/http";
import { logger } from "../../../../lib/logger";

/**
 * POST /api/itineraries/:itineraryId/cancel
 * Cancels a pending or running itinerary generation
 * Only allows cancellation of itineraries with pending or running status
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param itineraryId UUID of the itinerary (path parameter)
 * @returns 200 CancelItineraryResponse | 400/401/404/500 ErrorResponse
 */
export const POST: APIRoute = async ({ locals, params }) => {
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

  // Cancel itinerary generation
  try {
    const result = await cancelGeneration(locals.supabase, locals.user.id, itineraryId);

    logger.info(
      {
        userId: locals.user.id,
        itineraryId,
        cancelledAt: result.cancelled_at,
      },
      "Itinerary generation cancelled"
    );

    return jsonResponse(200, result);
  } catch (err) {
    // Handle specific error types
    if (err instanceof ItineraryNotFoundError) {
      logger.info({ userId: locals.user.id, itineraryId }, "Itinerary not found or access denied");
      return errorResponse(404, "itinerary_not_found", err.message);
    }

    if (err instanceof CannotCancelError) {
      logger.info({ userId: locals.user.id, itineraryId }, "Cannot cancel non-cancellable itinerary");
      return errorResponse(400, "cannot_cancel", err.message);
    }

    // Generic error
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId: locals.user.id, itineraryId, errorMessage: errorMsg }, "Failed to cancel itinerary");

    // Return detailed error in dev mode
    if (process.env.DEVENV === "true") {
      return errorResponse(500, "server_error", `Failed to cancel itinerary: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to cancel itinerary");
  }
};

export const prerender = false;
