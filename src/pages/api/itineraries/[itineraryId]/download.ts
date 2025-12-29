import type { APIRoute } from "astro";
import { z } from "zod";
import { logger } from "../../../../lib/logger";
import { getById, ItineraryNotFoundError } from "../../../../lib/services/itineraryService";
import {
  geoJsonToGPX,
  geoJsonToKML,
  GPXConversionError,
  KMLConversionError,
  sanitizeFilename,
} from "../../../../lib/services/geojsonService";
import type { RouteGeoJSON } from "../../../../types";

export const prerender = false;

/**
 * GET /api/itineraries/:itineraryId/download
 * Downloads itinerary as GPX, KML, or GeoJSON file
 *
 * Query Parameters:
 * - format: "gpx" (default) | "kml" | "geojson"
 * - acknowledged: "true" (required) - Safety disclaimer acknowledgment
 *
 * Response:
 * - 200: File download (GPX XML, KML XML, or GeoJSON)
 * - 400: Invalid parameters or missing acknowledgment
 * - 401: Not authenticated
 * - 404: Itinerary not found
 * - 422: Itinerary not completed or data incomplete
 * - 500: Conversion error
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  const startTime = Date.now();

  try {
    // Step 1: Authentication check (handled by middleware)
    if (!locals.user) {
      logger.warn({}, "Unauthorized download attempt - no user in context");
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
      format: z.enum(["gpx", "kml", "geojson"]).default("gpx"),
      acknowledged: z.enum(["true"]),
    });

    const queryValidation = querySchema.safeParse({
      format: url.searchParams.get("format") || "gpx",
      acknowledged: url.searchParams.get("acknowledged"),
    });

    if (!queryValidation.success) {
      const errors = queryValidation.error.errors;
      const isAcknowledgmentMissing = errors.some((e) => e.path.includes("acknowledged"));

      if (isAcknowledgmentMissing) {
        logger.warn({ itineraryId, userId }, "Download attempted without acknowledgment");
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

      logger.warn({ itineraryId, userId, errors }, "Invalid query parameters");
      return new Response(
        JSON.stringify({
          error: "invalid_parameters",
          message: "Invalid query parameters",
          details: errors.reduce(
            (acc, err) => {
              acc[err.path.join(".")] = err.message;
              return acc;
            },
            {} as Record<string, string>
          ),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { format } = queryValidation.data;

    // Step 4: Fetch itinerary
    let itinerary;
    try {
      itinerary = await getById(locals.supabase, userId, itineraryId);
    } catch (error) {
      if (error instanceof ItineraryNotFoundError) {
        logger.warn({ itineraryId, userId }, "Itinerary not found for download");
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
      logger.warn({ itineraryId, userId, status: itinerary.status }, "Attempted to download non-completed itinerary");
      return new Response(
        JSON.stringify({
          error: "itinerary_not_completed",
          message: `Cannot download ${format.toUpperCase()} for itinerary with status '${itinerary.status}'. Only completed itineraries can be downloaded.`,
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Verify route_geojson exists and is valid
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
    const title = itinerary.title || routeGeoJSON.properties?.title || "route";
    const sanitizedTitle = sanitizeFilename(title);

    // Step 7: Generate response based on format
    if (format === "geojson") {
      // Return GeoJSON as pretty-printed JSON
      const geojsonContent = JSON.stringify(routeGeoJSON, null, 2);
      const filename = `route-${sanitizedTitle}-${itineraryId.slice(0, 8)}.geojson`;

      logger.info(
        {
          itineraryId,
          userId,
          format,
          filename,
          size: geojsonContent.length,
          duration: Date.now() - startTime,
        },
        "GeoJSON download successful"
      );

      return new Response(geojsonContent, {
        status: 200,
        headers: {
          "Content-Type": "application/geo+json",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } else if (format === "kml") {
      // Convert to KML
      let kmlContent: string;
      try {
        kmlContent = geoJsonToKML(routeGeoJSON, {
          creator: "VibeRide - https://viberide.com",
        });
      } catch (error) {
        if (error instanceof KMLConversionError) {
          logger.error({ itineraryId, userId, error: error.message }, "KML conversion failed");
          return new Response(
            JSON.stringify({
              error: "conversion_error",
              message: `Failed to convert to KML: ${error.message}`,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        throw error;
      }

      const filename = `route-${sanitizedTitle}-${itineraryId.slice(0, 8)}.kml`;

      logger.info(
        {
          itineraryId,
          userId,
          format,
          filename,
          size: kmlContent.length,
          duration: Date.now() - startTime,
        },
        "KML download successful"
      );

      return new Response(kmlContent, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.google-earth.kml+xml",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } else {
      // Convert to GPX
      let gpxContent: string;
      try {
        gpxContent = geoJsonToGPX(routeGeoJSON, {
          includeWaypoints: true,
          includeRoutes: true,
          includeTracks: false,
          creator: "VibeRide - https://viberide.com",
        });
      } catch (error) {
        if (error instanceof GPXConversionError) {
          logger.error({ itineraryId, userId, error: error.message }, "GPX conversion failed");
          return new Response(
            JSON.stringify({
              error: "conversion_error",
              message: `Failed to convert to GPX: ${error.message}`,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        throw error;
      }

      const filename = `route-${sanitizedTitle}-${itineraryId.slice(0, 8)}.gpx`;

      logger.info(
        {
          itineraryId,
          userId,
          format,
          filename,
          size: gpxContent.length,
          duration: Date.now() - startTime,
        },
        "GPX download successful"
      );

      return new Response(gpxContent, {
        status: 200,
        headers: {
          "Content-Type": "application/gpx+xml",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        err: error,
        itineraryId: params.itineraryId,
        errorMessage,
        duration: Date.now() - startTime,
      },
      "Download endpoint error"
    );

    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: "An unexpected error occurred while processing the download",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
