import type { APIRoute } from "astro";
import { getById, ItineraryNotFoundError } from "../../../../lib/services/itineraryService";
import { generateGPX } from "../../../../lib/services/gpxService";
import { downloadGpxQuerySchema } from "../../../../lib/validators/itinerary";
import { errorResponse } from "../../../../lib/http";
import { logger } from "../../../../lib/logger";
import { ZodError } from "zod";

/**
 * GET /api/itineraries/:itineraryId/gpx
 * Downloads a GPX 1.1 file for a completed itinerary
 * Requires safety disclaimer acknowledgment (acknowledged=true query param)
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param itineraryId UUID of the itinerary (path parameter)
 * @param acknowledged Must be "true" to acknowledge GPS accuracy disclaimer (query parameter)
 * @returns 200 GPX file stream | 400/401/404/422/500 ErrorResponse
 */
export const GET: APIRoute = async ({ locals, params, url }) => {
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

  // Validate acknowledged query parameter
  try {
    const queryParams = {
      acknowledged: url.searchParams.get("acknowledged") || undefined,
    };

    const validatedQuery = downloadGpxQuerySchema.parse(queryParams);

    if (!validatedQuery.acknowledged) {
      return errorResponse(
        400,
        "acknowledgment_required",
        "You must acknowledge the GPS accuracy disclaimer by setting acknowledged=true"
      );
    }
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.errors[0];
      logger.info({ userId: locals.user.id, itineraryId, error: firstError }, "GPX download validation failed");
      return errorResponse(400, "validation_failed", firstError.message);
    }
    throw err;
  }

  // Fetch itinerary and verify it's completed
  try {
    const itinerary = await getById(locals.supabase, locals.user.id, itineraryId);

    // Verify status is completed
    if (itinerary.status !== "completed") {
      logger.info(
        { userId: locals.user.id, itineraryId, status: itinerary.status },
        "Cannot download GPX for non-completed itinerary"
      );
      return errorResponse(
        422,
        "itinerary_not_completed",
        `Cannot download GPX for itinerary with status '${itinerary.status}'. Only completed itineraries can be downloaded.`
      );
    }

    // Verify summary_json exists
    if (!itinerary.summary_json || Object.keys(itinerary.summary_json).length === 0) {
      logger.error({ userId: locals.user.id, itineraryId }, "Completed itinerary missing summary_json");
      return errorResponse(
        422,
        "itinerary_incomplete",
        "Itinerary data is incomplete. Cannot generate GPX file."
      );
    }

    // Generate GPX
    const gpxContent = generateGPX(itinerary.summary_json, itineraryId);

    // Create filename from title (sanitized)
    const sanitizedTitle = itinerary.summary_json.title
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
    const filename = `${sanitizedTitle}-${itineraryId.substring(0, 8)}.gpx`;

    logger.info(
      {
        userId: locals.user.id,
        itineraryId,
        filename,
        size: gpxContent.length,
      },
      "GPX file generated successfully"
    );

    // Return GPX file with proper headers
    return new Response(gpxContent, {
      status: 200,
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": gpxContent.length.toString(),
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (err) {
    // Handle specific error types
    if (err instanceof ItineraryNotFoundError) {
      logger.info({ userId: locals.user.id, itineraryId }, "Itinerary not found or access denied");
      return errorResponse(404, "itinerary_not_found", err.message);
    }

    // Generic error
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId: locals.user.id, itineraryId, errorMessage: errorMsg }, "Failed to generate GPX file");

    // Return detailed error in dev mode
    if (process.env.DEVENV === "true") {
      return errorResponse(500, "server_error", `Failed to generate GPX file: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to generate GPX file");
  }
};

export const prerender = false;

