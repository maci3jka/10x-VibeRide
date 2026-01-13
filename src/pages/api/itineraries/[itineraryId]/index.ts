import type { APIRoute } from "astro";
import {
  getById,
  softDelete,
  ItineraryNotFoundError,
  CannotDeleteNonTerminalError,
} from "../../../../lib/services/itineraryService";
import { jsonResponse, errorResponse } from "../../../../lib/http";
import { logger } from "../../../../lib/logger";

/**
 * GET /api/itineraries/:itineraryId
 * Retrieves a single itinerary by ID
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param itineraryId UUID of the itinerary (path parameter)
 * @returns 200 ItineraryResponse | 400/401/403/404/500 ErrorResponse
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

  // Get itinerary
  try {
    const result = await getById(locals.supabase, locals.user.id, itineraryId);

    logger.info(
      {
        userId: locals.user.id,
        itineraryId,
        noteId: result.note_id,
        version: result.version,
        status: result.status,
      },
      "Retrieved itinerary"
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
    logger.error({ err, userId: locals.user.id, itineraryId, errorMessage: errorMsg }, "Failed to fetch itinerary");

    // Return detailed error in dev mode
    if (process.env.DEVENV === "true") {
      return errorResponse(500, "server_error", `Failed to fetch itinerary: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to fetch itinerary");
  }
};

/**
 * DELETE /api/itineraries/:itineraryId
 * Soft-deletes an itinerary (sets deleted_at timestamp)
 * Only allows deletion of terminal status itineraries (completed, failed, cancelled)
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param itineraryId UUID of the itinerary (path parameter)
 * @returns 200 DeleteItineraryResponse | 400/401/404/500 ErrorResponse
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
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

  // Delete itinerary
  try {
    const result = await softDelete(locals.supabase, locals.user.id, itineraryId);

    logger.info(
      {
        userId: locals.user.id,
        itineraryId,
        deletedAt: result.deleted_at,
      },
      "Itinerary soft-deleted"
    );

    return jsonResponse(200, result);
  } catch (err) {
    // Handle specific error types
    if (err instanceof ItineraryNotFoundError) {
      logger.info({ userId: locals.user.id, itineraryId }, "Itinerary not found or access denied");
      return errorResponse(404, "itinerary_not_found", err.message);
    }

    if (err instanceof CannotDeleteNonTerminalError) {
      logger.info({ userId: locals.user.id, itineraryId }, "Cannot delete non-terminal itinerary");
      return errorResponse(400, "cannot_delete_nonterminal", err.message);
    }

    // Generic error
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId: locals.user.id, itineraryId, errorMessage: errorMsg }, "Failed to delete itinerary");

    // Return detailed error in dev mode
    if (process.env.DEVENV === "true") {
      return errorResponse(500, "server_error", `Failed to delete itinerary: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to delete itinerary");
  }
};

export const prerender = false;
