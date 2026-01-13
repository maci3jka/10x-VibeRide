import type { RouteGeoJSON } from "../../types";
import { logger } from "../logger";

/**
 * Service for generating Google Maps links from GeoJSON routes
 */

/**
 * Error thrown when route has too many points for Google Maps (max 25)
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
 * Transport mode for Google Maps routing
 * Maps to Google Maps travelmode parameter
 */
export type GoogleMapsTransportMode = "driving" | "bicycling" | "walking";

/**
 * Builds a Google Maps URL with route parameters from GeoJSON
 * Uses the Google Maps Directions API URL format
 * 
 * Algorithm:
 * 1. Extract all coordinates from LineString features (merge multi-day segments)
 * 2. Sample points to stay within maxPoints limit (first + last + evenly-spaced middle)
 * 3. Swap coordinates from [lon, lat] to [lat, lon] (Google requirement)
 * 4. Build URL with origin, destination, and waypoints parameters
 * 5. URL-encode and assemble final Google Maps URL
 * 
 * @param geojson Valid GeoJSON FeatureCollection with route data
 * @param transport Transport mode (default: "driving")
 * @param maxPoints Maximum number of points (default: 25, Google Maps limit)
 * @returns Fully-formed Google Maps URL
 * @throws TooManyPointsError if route exceeds maxPoints after sampling
 * @throws LinkGenerationError if route data is invalid or missing
 */
export function buildLink(
  geojson: RouteGeoJSON,
  transport: GoogleMapsTransportMode = "driving",
  maxPoints: number = 25
): string {
  try {
    // Step 1: Find all LineString features and merge their coordinates
    const lineStringFeatures = geojson.features.filter((f) => f.geometry.type === "LineString");

    if (lineStringFeatures.length === 0) {
      throw new LinkGenerationError("No LineString feature found in GeoJSON");
    }

    // Merge all LineString coordinates into a single array
    // For multi-day routes, we have multiple segments that need to be combined
    let allCoordinates: [number, number][] = [];
    
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
        `Route has ${sampledPoints.length} points after sampling, exceeds Google Maps limit of ${maxPoints}`
      );
    }

    // Step 3: Swap coordinates from [lon, lat] to [lat, lon] (Google requirement)
    // GeoJSON uses [longitude, latitude] but Google Maps uses [latitude, longitude]
    const swappedPoints = sampledPoints.map(([lon, lat]) => [lat, lon] as [number, number]);

    // Step 4: Build Google Maps URL
    // Format: https://www.google.com/maps/dir/?api=1&origin=lat,lon&destination=lat,lon&waypoints=lat,lon|lat,lon&travelmode=driving
    
    if (swappedPoints.length < 2) {
      throw new LinkGenerationError("Route must have at least 2 points after sampling");
    }

    // First point is origin, last point is destination, middle points are waypoints
    const [startLat, startLon] = swappedPoints[0];
    const [endLat, endLon] = swappedPoints[swappedPoints.length - 1];
    
    // Round to 6 decimal places (~0.1m precision)
    const originCoord = `${startLat.toFixed(6)},${startLon.toFixed(6)}`;
    const destinationCoord = `${endLat.toFixed(6)},${endLon.toFixed(6)}`;
    
    // Build URL parameters
    const params = new URLSearchParams();
    params.set("api", "1");
    params.set("origin", originCoord);
    params.set("destination", destinationCoord);
    params.set("travelmode", transport);
    
    // Add waypoints if there are middle points
    // Google Maps uses pipe (|) separator for waypoints
    if (swappedPoints.length > 2) {
      const waypoints = swappedPoints
        .slice(1, -1) // Exclude first and last
        .map(([lat, lon]) => `${lat.toFixed(6)},${lon.toFixed(6)}`)
        .join("|");
      params.set("waypoints", waypoints);
    }

    // Step 5: Assemble final URL
    const googleMapsUrl = `https://www.google.com/maps/dir/?${params.toString()}`;

    logger.debug(
      {
        lineStringFeatures: lineStringFeatures.length,
        originalPoints: coordinates.length,
        sampledPoints: sampledPoints.length,
        transport,
        urlLength: googleMapsUrl.length,
      },
      "Generated Google Maps link"
    );

    return googleMapsUrl;
  } catch (error) {
    if (error instanceof TooManyPointsError || error instanceof LinkGenerationError) {
      throw error;
    }
    throw new LinkGenerationError(
      `Failed to build Google Maps link: ${error instanceof Error ? error.message : String(error)}`
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

