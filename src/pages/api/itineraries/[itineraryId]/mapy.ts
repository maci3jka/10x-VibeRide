import type { APIRoute } from "astro";
import { z } from "zod";
import { logger } from "../../../../lib/logger";
import { getById, ItineraryNotFoundError } from "../../../../lib/services/itineraryService";
import { buildLink, TooManyPointsError, LinkGenerationError } from "../../../../lib/services/mapyLinkService";
import type { RouteGeoJSON, MapyLinkResponse } from "../../../../types";

export const prerender = false;

/**
 * GET /api/itineraries/:itineraryId/mapy
 * Generates a Mapy.cz URL for the itinerary route
 *
 * Query Parameters:
 * - acknowledged: "true" (required) - Safety disclaimer acknowledgment
 *
 * Response:
 * - 200: JSON with Mapy.cz URL
 * - 400: Invalid parameters or missing acknowledgment
 * - 401: Not authenticated
 * - 404: Itinerary not found
 * - 422: Itinerary not completed or too many points
 * - 500: Link generation error
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  const startTime = Date.now();

  try {
    // Step 1: Authentication check (handled by middleware)
    if (!locals.user) {
      logger.warn({}, "Unauthorized mapy link attempt - no user in context");
      return new Response(JSON.stringify({ error: "unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = locals.user.id;

    // Step 2: Validate path parameter
    const { itineraryId } = params;

    if (!itineraryId) {
      return new Response(JSON.stringify({ error: "missing_parameter", message: "Itinerary ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const uuidValidation = uuidSchema.safeParse(itineraryId);

    if (!uuidValidation.success) {
      logger.warn({ itineraryId, errors: uuidValidation.error.errors }, "Invalid itinerary ID format");
      return new Response(JSON.stringify({ error: "invalid_id", message: "Invalid itinerary ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Validate query parameters
    const querySchema = z.object({
      acknowledged: z.enum(["true"]),
    });

    const queryValidation = querySchema.safeParse({
      acknowledged: url.searchParams.get("acknowledged"),
    });

    if (!queryValidation.success) {
      logger.warn({ itineraryId, userId }, "Mapy link attempted without acknowledgment");
      return new Response(
        JSON.stringify({
          error: "acknowledgment_required",
          message: "You must acknowledge the GPS accuracy disclaimer by setting acknowledged=true",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Fetch itinerary
    let itinerary;
    try {
      itinerary = await getById(locals.supabase, userId, itineraryId);
    } catch (error) {
      if (error instanceof ItineraryNotFoundError) {
        logger.warn({ itineraryId, userId }, "Itinerary not found for mapy link");
        return new Response(
          JSON.stringify({ error: "not_found", message: "Itinerary not found or has been deleted" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Step 5: Verify itinerary is completed
    if (itinerary.status !== "completed") {
      logger.warn(
        { itineraryId, userId, status: itinerary.status },
        "Attempted to generate mapy link for non-completed itinerary"
      );
      return new Response(
        JSON.stringify({
          error: "itinerary_not_completed",
          message: `Cannot generate Mapy.cz link for itinerary with status '${itinerary.status}'. Only completed itineraries can be shared.`,
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Verify route_geojson exists
    if (!itinerary.route_geojson) {
      logger.error({ itineraryId, userId }, "Completed itinerary missing route_geojson");
      return new Response(
        JSON.stringify({
          error: "incomplete_data",
          message: "Itinerary data is incomplete. Please regenerate the itinerary.",
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const routeGeoJSON = itinerary.route_geojson as RouteGeoJSON;

    // Step 7: Generate Mapy.cz link
    let mapyUrl: string;
    try {
      // Use "car" transport mode for motorcycle routes
      // Note: Mapy.cz "bike" mode is for bicycles, not motorcycles
      mapyUrl = buildLink(routeGeoJSON, "car");
    } catch (error) {
      if (error instanceof TooManyPointsError) {
        logger.warn({ itineraryId, userId, error: error.message }, "Route has too many points for Mapy.cz");
        return new Response(
          JSON.stringify({
            error: "too_many_points",
            message: "Route has too many points for Mapy.cz (max 15). Please try downloading GPX instead.",
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error instanceof LinkGenerationError) {
        logger.error({ itineraryId, userId, error: error.message }, "Failed to generate Mapy.cz link");
        return new Response(
          JSON.stringify({
            error: "link_generation_error",
            message: `Failed to generate Mapy.cz link: ${error.message}`,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      throw error;
    }

    // Step 8: Return success response
    const response: MapyLinkResponse = {
      url: mapyUrl,
    };

    logger.info(
      {
        itineraryId,
        userId,
        urlLength: mapyUrl.length,
        duration: Date.now() - startTime,
      },
      "Mapy.cz link generated successfully"
    );

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        err: error,
        itineraryId: params.itineraryId,
        errorMessage,
        duration: Date.now() - startTime,
      },
      "Mapy link endpoint error"
    );

    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "An unexpected error occurred while generating the Mapy.cz link",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
