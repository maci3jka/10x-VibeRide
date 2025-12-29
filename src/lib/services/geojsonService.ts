import type { RouteGeoJSON, GeoJSONFeature, GeoJSONGeometry } from "../../types";
import { logger } from "../logger";

/**
 * Service for GeoJSON validation, extraction, and conversion
 */

/**
 * Error thrown when GeoJSON validation fails
 */
export class GeoJSONValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoJSONValidationError";
  }
}

/**
 * Error thrown when GPX conversion fails
 */
export class GPXConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GPXConversionError";
  }
}

/**
 * Error thrown when KML conversion fails
 */
export class KMLConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KMLConversionError";
  }
}

/**
 * Extracted summary data from GeoJSON properties
 */
export interface ExtractedSummary {
  title: string;
  total_distance_km: number;
  total_duration_h: number;
  highlights: string[];
}

/**
 * Options for GPX conversion
 */
export interface GPXConversionOptions {
  includeWaypoints?: boolean; // Include Point features as waypoints (default: true)
  includeRoutes?: boolean; // Include LineString features as routes (default: true)
  includeTracks?: boolean; // Include LineString features as tracks (default: false)
  creator?: string; // GPX creator metadata (default: "VibeRide")
}

/**
 * Validates GeoJSON structure and required properties
 * Performs comprehensive structural and semantic validation
 *
 * @param geojson GeoJSON object to validate
 * @returns true if valid
 * @throws GeoJSONValidationError if validation fails
 */
export function validateGeoJSON(geojson: unknown): geojson is RouteGeoJSON {
  // Type guard: check if it's an object
  if (!geojson || typeof geojson !== "object") {
    throw new GeoJSONValidationError("GeoJSON must be an object");
  }

  const geo = geojson as Record<string, unknown>;

  // Validate type field
  if (geo.type !== "FeatureCollection") {
    throw new GeoJSONValidationError('GeoJSON type must be "FeatureCollection"');
  }

  // Validate features array
  if (!Array.isArray(geo.features)) {
    throw new GeoJSONValidationError("GeoJSON must have a features array");
  }

  // Validate properties object
  if (!geo.properties || typeof geo.properties !== "object") {
    throw new GeoJSONValidationError("GeoJSON must have a properties object");
  }

  const props = geo.properties as Record<string, unknown>;

  // Validate required properties
  if (typeof props.title !== "string" || props.title.length === 0) {
    throw new GeoJSONValidationError("GeoJSON properties must include a non-empty title string");
  }

  if (props.title.length > 60) {
    throw new GeoJSONValidationError("GeoJSON title must not exceed 60 characters");
  }

  if (typeof props.total_distance_km !== "number" || props.total_distance_km <= 0) {
    throw new GeoJSONValidationError("GeoJSON properties must include a positive total_distance_km number");
  }

  if (typeof props.total_duration_h !== "number" || props.total_duration_h <= 0) {
    throw new GeoJSONValidationError("GeoJSON properties must include a positive total_duration_h number");
  }

  // Validate highlights if present
  if (props.highlights !== undefined) {
    if (!Array.isArray(props.highlights)) {
      throw new GeoJSONValidationError("GeoJSON highlights must be an array");
    }
    if (!props.highlights.every((h) => typeof h === "string")) {
      throw new GeoJSONValidationError("GeoJSON highlights must be an array of strings");
    }
  }

  // Validate features
  if (geo.features.length === 0) {
    throw new GeoJSONValidationError("GeoJSON must have at least one feature");
  }

  for (let i = 0; i < geo.features.length; i++) {
    const feature = geo.features[i];
    if (!feature || typeof feature !== "object") {
      throw new GeoJSONValidationError(`Feature at index ${i} is not an object`);
    }

    const feat = feature as Record<string, unknown>;

    if (feat.type !== "Feature") {
      throw new GeoJSONValidationError(`Feature at index ${i} must have type "Feature"`);
    }

    if (!feat.geometry || typeof feat.geometry !== "object") {
      throw new GeoJSONValidationError(`Feature at index ${i} must have a geometry object`);
    }

    const geom = feat.geometry as Record<string, unknown>;
    const validTypes = ["Point", "LineString"];

    if (!validTypes.includes(geom.type as string)) {
      throw new GeoJSONValidationError(
        `Feature at index ${i} has invalid geometry type "${geom.type}". Must be Point or LineString`
      );
    }

    if (!Array.isArray(geom.coordinates)) {
      throw new GeoJSONValidationError(`Feature at index ${i} geometry must have coordinates array`);
    }

    // Validate coordinate structure based on geometry type
    if (geom.type === "Point") {
      if (geom.coordinates.length !== 2) {
        throw new GeoJSONValidationError(`Point feature at index ${i} must have exactly 2 coordinates [lon, lat]`);
      }
      const [lon, lat] = geom.coordinates as number[];
      if (typeof lon !== "number" || typeof lat !== "number") {
        throw new GeoJSONValidationError(`Point feature at index ${i} coordinates must be numbers`);
      }
      if (lon < -180 || lon > 180) {
        throw new GeoJSONValidationError(`Point feature at index ${i} longitude must be between -180 and 180`);
      }
      if (lat < -90 || lat > 90) {
        throw new GeoJSONValidationError(`Point feature at index ${i} latitude must be between -90 and 90`);
      }
    } else if (geom.type === "LineString") {
      if (geom.coordinates.length < 2) {
        throw new GeoJSONValidationError(`LineString feature at index ${i} must have at least 2 coordinates`);
      }
      for (let j = 0; j < geom.coordinates.length; j++) {
        const coord = (geom.coordinates as unknown[])[j];
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new GeoJSONValidationError(
            `LineString feature at index ${i}, coordinate ${j} must be [lon, lat] array`
          );
        }
        const [lon, lat] = coord as number[];
        if (typeof lon !== "number" || typeof lat !== "number") {
          throw new GeoJSONValidationError(
            `LineString feature at index ${i}, coordinate ${j} must contain numbers`
          );
        }
        if (lon < -180 || lon > 180) {
          throw new GeoJSONValidationError(
            `LineString feature at index ${i}, coordinate ${j} longitude must be between -180 and 180`
          );
        }
        if (lat < -90 || lat > 90) {
          throw new GeoJSONValidationError(
            `LineString feature at index ${i}, coordinate ${j} latitude must be between -90 and 90`
          );
        }
      }
    }

    // Validate properties if present
    if (feat.properties !== null && feat.properties !== undefined && typeof feat.properties !== "object") {
      throw new GeoJSONValidationError(`Feature at index ${i} properties must be an object or null`);
    }
  }

  return true;
}

/**
 * Extracts summary data from GeoJSON properties
 * Used by API endpoints and UI components for quick access to metadata
 *
 * @param geojson Valid GeoJSON FeatureCollection
 * @returns Extracted summary data
 * @throws GeoJSONValidationError if GeoJSON is invalid
 */
export function extractSummary(geojson: RouteGeoJSON): ExtractedSummary {
  // Validate first
  validateGeoJSON(geojson);

  return {
    title: geojson.properties.title,
    total_distance_km: geojson.properties.total_distance_km,
    total_duration_h: geojson.properties.total_duration_h,
    highlights: geojson.properties.highlights || [],
  };
}

/**
 * Converts GeoJSON to GPX 1.1 format
 * Generates GPX XML on-demand for downloads
 *
 * @param geojson Valid GeoJSON FeatureCollection
 * @param options Conversion options
 * @returns GPX 1.1 XML string
 * @throws GPXConversionError if conversion fails
 */
export function geoJsonToGPX(geojson: RouteGeoJSON, options: GPXConversionOptions = {}): string {
  try {
    // Validate GeoJSON first
    validateGeoJSON(geojson);

    const {
      includeWaypoints = true,
      includeRoutes = true,
      includeTracks = false,
      creator = "VibeRide - https://viberide.com",
    } = options;

    const { title, total_distance_km, total_duration_h } = geojson.properties;
    const timestamp = new Date().toISOString();

    // Start GPX document
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${escapeXml(creator)}"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(title)}</name>
    <desc>Motorcycle route generated by VibeRide</desc>
    <time>${timestamp}</time>
    <keywords>motorcycle,route,${total_distance_km}km,${total_duration_h}h</keywords>
  </metadata>
`;

    // Extract waypoints (Point features)
    const waypoints = geojson.features.filter((f) => f.geometry.type === "Point");
    const routes = geojson.features.filter((f) => f.geometry.type === "LineString");

    // Add waypoints
    if (includeWaypoints && waypoints.length > 0) {
      for (const waypoint of waypoints) {
        const geom = waypoint.geometry as { type: "Point"; coordinates: [number, number] };
        const [lon, lat] = geom.coordinates;
        const name = waypoint.properties?.name || "Waypoint";
        const desc = waypoint.properties?.description || "";

        gpx += `  <wpt lat="${lat}" lon="${lon}">
    <name>${escapeXml(name)}</name>
`;
        if (desc) {
          gpx += `    <desc>${escapeXml(desc)}</desc>
`;
        }
        gpx += `  </wpt>
`;
      }
    }

    // Add routes (LineString features)
    if (includeRoutes && routes.length > 0) {
      gpx += `  <rte>
    <name>${escapeXml(title)}</name>
    <desc>Total distance: ${total_distance_km}km, Duration: ${total_duration_h}h</desc>
`;

      for (const route of routes) {
        const geom = route.geometry as { type: "LineString"; coordinates: [number, number][] };
        const segmentName = route.properties?.name || "Segment";

        for (let i = 0; i < geom.coordinates.length; i++) {
          const [lon, lat] = geom.coordinates[i];
          const isFirst = i === 0;
          const isLast = i === geom.coordinates.length - 1;

          gpx += `    <rtept lat="${lat}" lon="${lon}">
      <name>${escapeXml(segmentName)} - ${isFirst ? "Start" : isLast ? "End" : `Point ${i + 1}`}</name>
    </rtept>
`;
        }
      }

      gpx += `  </rte>
`;
    }

    // Add tracks (alternative representation of LineString features)
    if (includeTracks && routes.length > 0) {
      gpx += `  <trk>
    <name>${escapeXml(title)}</name>
    <desc>Total distance: ${total_distance_km}km, Duration: ${total_duration_h}h</desc>
    <trkseg>
`;

      for (const route of routes) {
        const geom = route.geometry as { type: "LineString"; coordinates: [number, number][] };

        for (const [lon, lat] of geom.coordinates) {
          gpx += `      <trkpt lat="${lat}" lon="${lon}">
      </trkpt>
`;
        }
      }

      gpx += `    </trkseg>
  </trk>
`;
    }

    // Close GPX document
    gpx += `</gpx>`;

    logger.debug(
      {
        title,
        waypointCount: waypoints.length,
        routeCount: routes.length,
        gpxLength: gpx.length,
      },
      "Generated GPX from GeoJSON"
    );

    return gpx;
  } catch (error) {
    if (error instanceof GeoJSONValidationError) {
      throw new GPXConversionError(`Invalid GeoJSON: ${error.message}`);
    }
    throw new GPXConversionError(`Failed to convert GeoJSON to GPX: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Escapes special XML characters
 * Prevents XML injection and ensures valid XML output
 *
 * @param str String to escape
 * @returns Escaped string safe for XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converts GeoJSON to KML 2.2 format
 * Generates KML XML on-demand for downloads
 *
 * @param geojson Valid GeoJSON FeatureCollection
 * @param options Conversion options
 * @returns KML 2.2 XML string
 * @throws KMLConversionError if conversion fails
 */
export function geoJsonToKML(geojson: RouteGeoJSON, options: GPXConversionOptions = {}): string {
  try {
    // Validate GeoJSON first
    validateGeoJSON(geojson);

    const { creator = "VibeRide - https://viberide.com" } = options;
    const { title, total_distance_km, total_duration_h, highlights } = geojson.properties;

    // Start KML document
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(title)}</name>
    <description>Motorcycle route generated by ${escapeXml(creator)}
Total Distance: ${total_distance_km}km
Total Duration: ${total_duration_h}h</description>
`;

    // Add highlights as description if present
    if (highlights && highlights.length > 0) {
      kml += `    <Snippet maxLines="3">${escapeXml(highlights.join(", "))}</Snippet>
`;
    }

    // Define styles for different feature types
    kml += `    <!-- Route line style -->
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    
    <!-- Waypoint style -->
    <Style id="waypointStyle">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <!-- POI style -->
    <Style id="poiStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/star.png</href>
        </Icon>
      </IconStyle>
    </Style>
`;

    // Extract waypoints (Point features) and routes (LineString features)
    const waypoints = geojson.features.filter((f) => f.geometry.type === "Point");
    const routes = geojson.features.filter((f) => f.geometry.type === "LineString");

    // Add waypoints as Placemarks
    if (waypoints.length > 0) {
      kml += `    <Folder>
      <name>Waypoints</name>
      <open>1</open>
`;
      for (const waypoint of waypoints) {
        const geom = waypoint.geometry as { type: "Point"; coordinates: [number, number] };
        const [lon, lat] = geom.coordinates;
        const name = waypoint.properties?.name || "Waypoint";
        const desc = waypoint.properties?.description || "";
        const type = waypoint.properties?.type || "waypoint";
        const styleId = type === "poi" ? "poiStyle" : "waypointStyle";

        kml += `      <Placemark>
        <name>${escapeXml(name)}</name>
`;
        if (desc) {
          kml += `        <description>${escapeXml(desc)}</description>
`;
        }
        kml += `        <styleUrl>#${styleId}</styleUrl>
        <Point>
          <coordinates>${lon},${lat},0</coordinates>
        </Point>
      </Placemark>
`;
      }
      kml += `    </Folder>
`;
    }

    // Add routes as LineString Placemarks
    if (routes.length > 0) {
      kml += `    <Folder>
      <name>Route</name>
      <open>1</open>
`;
      for (const route of routes) {
        const geom = route.geometry as { type: "LineString"; coordinates: [number, number][] };
        const name = route.properties?.name || "Route Segment";
        const desc = route.properties?.description || "";
        const day = route.properties?.day;
        const distance = route.properties?.distance_km;
        const duration = route.properties?.duration_h;

        // Build description with metadata
        let fullDesc = desc;
        if (day || distance || duration) {
          const metadata: string[] = [];
          if (day) metadata.push(`Day ${day}`);
          if (distance) metadata.push(`${distance}km`);
          if (duration) metadata.push(`${duration}h`);
          fullDesc = `${desc}${desc ? "\n" : ""}${metadata.join(" • ")}`;
        }

        kml += `      <Placemark>
        <name>${escapeXml(name)}</name>
`;
        if (fullDesc) {
          kml += `        <description>${escapeXml(fullDesc)}</description>
`;
        }
        kml += `        <styleUrl>#routeStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>
`;

        // Add coordinates (KML format: lon,lat,altitude)
        for (const [lon, lat] of geom.coordinates) {
          kml += `            ${lon},${lat},0\n`;
        }

        kml += `          </coordinates>
        </LineString>
      </Placemark>
`;
      }
      kml += `    </Folder>
`;
    }

    // Close KML document
    kml += `  </Document>
</kml>`;

    logger.debug(
      {
        title,
        waypointCount: waypoints.length,
        routeCount: routes.length,
        kmlLength: kml.length,
      },
      "Generated KML from GeoJSON"
    );

    return kml;
  } catch (error) {
    if (error instanceof GeoJSONValidationError) {
      throw new KMLConversionError(`Invalid GeoJSON: ${error.message}`);
    }
    throw new KMLConversionError(
      `Failed to convert GeoJSON to KML: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Sanitizes filename for safe file downloads
 * Removes or replaces characters that are problematic in filenames
 *
 * @param filename Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_. ]/g, "-") // Replace special chars with dash
    .replace(/\s+/g, "-") // Replace spaces with dash
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Remove leading/trailing dashes
    .toLowerCase()
    .slice(0, 100); // Limit length
}

