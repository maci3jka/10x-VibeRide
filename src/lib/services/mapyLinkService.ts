import type { RouteGeoJSON } from "../../types";
import { logger } from "../logger";

/**
 * Service for generating Mapy.cz links from GeoJSON routes
 */

/**
 * Error thrown when route has too many points for Mapy.cz (max 15)
 */
export class TooManyPointsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TooManyPointsError";
  }
}

/**
 * Error thrown when link generation fails
 */
export class LinkGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkGenerationError";
  }
}

/**
 * Transport mode for Mapy.cz routing
 * Maps to Mapy.cz routeType parameter
 */
export type MapyTransportMode = "car" | "bike" | "foot";

/**
 * Mapy.cz route type mapping
 */
const ROUTE_TYPE_MAP: Record<MapyTransportMode, string> = {
  car: "car_fast",
  bike: "bike_road",
  foot: "foot_fast",
};

/**
 * Builds a Mapy.cz URL with route parameters from GeoJSON
 * Uses the Mapy.cz fnc/v1/route API format
 *
 * Algorithm:
 * 1. Extract coordinates from the first LineString feature
 * 2. Sample points to stay within maxPoints limit (first + last + evenly-spaced middle)
 * 3. Build route URL with start, end, and waypoints parameters
 * 4. URL-encode and assemble final Mapy.cz URL
 *
 * @param geojson Valid GeoJSON FeatureCollection with route data
 * @param transport Transport mode (default: "car")
 * @param maxPoints Maximum number of points (default: 15, Mapy.cz limit)
 * @returns Fully-formed Mapy.cz URL
 * @throws TooManyPointsError if route exceeds maxPoints after sampling
 * @throws LinkGenerationError if route data is invalid or missing
 */
export function buildLink(geojson: RouteGeoJSON, transport: MapyTransportMode = "car", maxPoints = 15): string {
  try {
    // Step 1: Find all LineString features and merge their coordinates
    const lineStringFeatures = geojson.features.filter((f) => f.geometry.type === "LineString");

    if (lineStringFeatures.length === 0) {
      throw new LinkGenerationError("No LineString feature found in GeoJSON");
    }

    // Merge all LineString coordinates into a single array
    // For multi-day routes, we have multiple segments that need to be combined
    const allCoordinates: [number, number][] = [];

    for (const feature of lineStringFeatures) {
      if (feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates;

        // If this is not the first segment, skip the first coordinate to avoid duplicates
        // (the last point of previous segment should match the first point of next segment)
        if (allCoordinates.length > 0 && coords.length > 0) {
          allCoordinates.push(...coords.slice(1));
        } else {
          allCoordinates.push(...coords);
        }
      }
    }

    if (allCoordinates.length < 2) {
      throw new LinkGenerationError("Route must have at least 2 coordinates");
    }

    const coordinates = allCoordinates;

    // Step 2: Sample points to fit within maxPoints limit
    const sampledPoints = samplePoints(coordinates, maxPoints);

    if (sampledPoints.length > maxPoints) {
      throw new TooManyPointsError(
        `Route has ${sampledPoints.length} points after sampling, exceeds Mapy.cz limit of ${maxPoints}`
      );
    }

    // Step 3: Build route URL using Mapy.cz fnc/v1/route API
    // Format: start=lon,lat&end=lon,lat&waypoints=lon,lat;lon,lat;...&routeType=bike_road

    if (sampledPoints.length < 2) {
      throw new LinkGenerationError("Route must have at least 2 points after sampling");
    }

    // First point is start, last point is end, middle points are waypoints
    const [startLon, startLat] = sampledPoints[0];
    const [endLon, endLat] = sampledPoints[sampledPoints.length - 1];

    // Round to 6 decimal places (~0.1m precision)
    const startCoord = `${startLon.toFixed(6)},${startLat.toFixed(6)}`;
    const endCoord = `${endLon.toFixed(6)},${endLat.toFixed(6)}`;

    // Build URL parameters
    const params = new URLSearchParams();
    params.set("start", startCoord);
    params.set("end", endCoord);
    params.set("routeType", ROUTE_TYPE_MAP[transport]);

    // Add waypoints if there are middle points
    if (sampledPoints.length > 2) {
      const waypoints = sampledPoints
        .slice(1, -1) // Exclude first and last
        .map(([lon, lat]) => `${lon.toFixed(6)},${lat.toFixed(6)}`)
        .join(";");
      params.set("waypoints", waypoints);
    }

    // Step 4: Assemble final URL
    // Using mapy.com (recommended for new integrations, backward compatible with mapy.cz)
    const mapyUrl = `https://mapy.com/fnc/v1/route?${params.toString()}`;

    logger.debug(
      {
        lineStringFeatures: lineStringFeatures.length,
        originalPoints: coordinates.length,
        sampledPoints: sampledPoints.length,
        transport,
        urlLength: mapyUrl.length,
      },
      "Generated Mapy.cz link"
    );

    return mapyUrl;
  } catch (error) {
    if (error instanceof TooManyPointsError || error instanceof LinkGenerationError) {
      throw error;
    }
    throw new LinkGenerationError(
      `Failed to build Mapy.cz link: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Samples points from a coordinate array to fit within maxPoints limit
 * Always includes first and last point, then evenly spaces middle points
 *
 * @param coordinates Array of [lon, lat] coordinates
 * @param maxPoints Maximum number of points to return
 * @returns Sampled array of coordinates
 */
function samplePoints(coordinates: [number, number][], maxPoints: number): [number, number][] {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }

  const sampled: [number, number][] = [];

  // Always include first point
  sampled.push(coordinates[0]);

  // Calculate how many middle points we can include
  const middlePointsCount = maxPoints - 2; // Reserve space for first and last

  if (middlePointsCount > 0) {
    // Calculate step size for even spacing
    const step = (coordinates.length - 1) / (middlePointsCount + 1);

    // Sample middle points at even intervals
    for (let i = 1; i <= middlePointsCount; i++) {
      const index = Math.round(step * i);
      sampled.push(coordinates[index]);
    }
  }

  // Always include last point
  sampled.push(coordinates[coordinates.length - 1]);

  return sampled;
}
