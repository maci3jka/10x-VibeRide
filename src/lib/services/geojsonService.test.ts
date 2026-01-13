import { describe, it, expect } from "vitest";
import {
  validateGeoJSON,
  extractSummary,
  geoJsonToGPX,
  geoJsonToKML,
  sanitizeFilename,
  GeoJSONValidationError,
  GPXConversionError,
  KMLConversionError,
} from "./geojsonService";
import type { RouteGeoJSON } from "@/types";

describe("geojsonService", () => {
  const validGeoJSON: RouteGeoJSON = {
    type: "FeatureCollection",
    properties: {
      title: "Test Route",
      total_distance_km: 100.5,
      total_duration_h: 2.5,
      highlights: ["Mountain views", "Scenic overlook"],
      days: 1,
    },
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        properties: {
          name: "Start Point",
          description: "Starting location",
          type: "waypoint",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4084, 37.7849],
            [-122.3974, 37.7949],
          ],
        },
        properties: {
          name: "Route Segment",
          description: "Main route",
          type: "route",
          day: 1,
          segment: 1,
          distance_km: 100.5,
          duration_h: 2.5,
        },
      },
    ],
  };

  describe("validateGeoJSON", () => {
    describe("Type Validation", () => {
      it("should validate a valid GeoJSON", () => {
        expect(() => validateGeoJSON(validGeoJSON)).not.toThrow();
        expect(validateGeoJSON(validGeoJSON)).toBe(true);
      });

      it("should reject null input", () => {
        expect(() => validateGeoJSON(null)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(null)).toThrow("GeoJSON must be an object");
      });

      it("should reject undefined input", () => {
        expect(() => validateGeoJSON(undefined)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(undefined)).toThrow("GeoJSON must be an object");
      });

      it("should reject non-object input", () => {
        expect(() => validateGeoJSON("string")).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(123)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON([])).toThrow(GeoJSONValidationError);
      });

      it("should reject incorrect type field", () => {
        const invalid = { ...validGeoJSON, type: "Feature" };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow('GeoJSON type must be "FeatureCollection"');
      });

      it("should reject missing type field", () => {
        const { type, ...invalid } = validGeoJSON;
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });
    });

    describe("Features Validation", () => {
      it("should reject missing features array", () => {
        const { features, ...invalid } = validGeoJSON;
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("GeoJSON must have a features array");
      });

      it("should reject non-array features", () => {
        const invalid = { ...validGeoJSON, features: "not an array" };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject empty features array", () => {
        const invalid = { ...validGeoJSON, features: [] };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("GeoJSON must have at least one feature");
      });

      it("should reject invalid feature type", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "InvalidType",
              geometry: { type: "Point", coordinates: [0, 0] },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow('must have type "Feature"');
      });

      it("should reject feature without geometry", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature",
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must have a geometry object");
      });
    });

    describe("Properties Validation", () => {
      it("should reject missing properties object", () => {
        const { properties, ...invalid } = validGeoJSON;
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("GeoJSON must have a properties object");
      });

      it("should reject non-object properties", () => {
        const invalid = { ...validGeoJSON, properties: "not an object" };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject missing title", () => {
        const { title, ...props } = validGeoJSON.properties;
        const invalid = { ...validGeoJSON, properties: props };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must include a non-empty title string");
      });

      it("should reject empty title", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, title: "" },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject title exceeding 60 characters", () => {
        const invalid = {
          ...validGeoJSON,
          properties: {
            ...validGeoJSON.properties,
            title: "a".repeat(61),
          },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("title must not exceed 60 characters");
      });

      it("should accept title with exactly 60 characters", () => {
        const valid = {
          ...validGeoJSON,
          properties: {
            ...validGeoJSON.properties,
            title: "a".repeat(60),
          },
        };
        expect(() => validateGeoJSON(valid)).not.toThrow();
      });

      it("should reject missing total_distance_km", () => {
        const { total_distance_km, ...props } = validGeoJSON.properties;
        const invalid = { ...validGeoJSON, properties: props };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must include a positive total_distance_km number");
      });

      it("should reject non-numeric total_distance_km", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, total_distance_km: "100" as any },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject zero total_distance_km", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, total_distance_km: 0 },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject negative total_distance_km", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, total_distance_km: -10 },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject missing total_duration_h", () => {
        const { total_duration_h, ...props } = validGeoJSON.properties;
        const invalid = { ...validGeoJSON, properties: props };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must include a positive total_duration_h number");
      });

      it("should reject non-numeric total_duration_h", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, total_duration_h: "2.5" as any },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject zero total_duration_h", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, total_duration_h: 0 },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should reject negative total_duration_h", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, total_duration_h: -1 },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
      });

      it("should accept missing highlights (optional)", () => {
        const { highlights, ...props } = validGeoJSON.properties;
        const valid = { ...validGeoJSON, properties: props };
        expect(() => validateGeoJSON(valid)).not.toThrow();
      });

      it("should reject non-array highlights", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, highlights: "not an array" as any },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("highlights must be an array");
      });

      it("should reject highlights with non-string elements", () => {
        const invalid = {
          ...validGeoJSON,
          properties: { ...validGeoJSON.properties, highlights: ["valid", 123, "valid"] as any },
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("highlights must be an array of strings");
      });
    });

    describe("Geometry Validation - Point", () => {
      it("should validate Point geometry", () => {
        const valid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [-122.4194, 37.7749],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(valid)).not.toThrow();
      });

      it("should reject Point with invalid coordinate count", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [-122.4194] as any,
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must have exactly 2 coordinates");
      });

      it("should reject Point with non-numeric coordinates", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: ["122", "37"] as any,
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("coordinates must be numbers");
      });

      it("should reject Point with longitude out of range", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [-181, 37.7749],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("longitude must be between -180 and 180");
      });

      it("should reject Point with latitude out of range", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [-122.4194, 91],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("latitude must be between -90 and 90");
      });

      it("should accept Point with boundary longitude values", () => {
        const valid1 = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [-180, 0],
              },
              properties: {},
            },
          ],
        };
        const valid2 = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [180, 0],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(valid1)).not.toThrow();
        expect(() => validateGeoJSON(valid2)).not.toThrow();
      });

      it("should accept Point with boundary latitude values", () => {
        const valid1 = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [0, -90],
              },
              properties: {},
            },
          ],
        };
        const valid2 = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [0, 90],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(valid1)).not.toThrow();
        expect(() => validateGeoJSON(valid2)).not.toThrow();
      });
    });

    describe("Geometry Validation - LineString", () => {
      it("should validate LineString geometry", () => {
        const valid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: [
                  [-122.4194, 37.7749],
                  [-122.4084, 37.7849],
                ],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(valid)).not.toThrow();
      });

      it("should reject LineString with less than 2 coordinates", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: [[-122.4194, 37.7749]],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must have at least 2 coordinates");
      });

      it("should reject LineString with invalid coordinate format", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: [[-122.4194, 37.7749], [-122.4084] as any],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must be [lon, lat] array");
      });

      it("should reject LineString with non-numeric coordinates", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: [[-122.4194, 37.7749], ["122", 37.7849] as any],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("must contain numbers");
      });

      it("should reject LineString with coordinates out of range", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: [
                  [-122.4194, 37.7749],
                  [-181, 37.7849],
                ],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("longitude must be between -180 and 180");
      });
    });

    describe("Geometry Validation - Invalid Types", () => {
      it("should reject unsupported geometry types", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Polygon" as any,
                coordinates: [[[-122.4194, 37.7749]]],
              },
              properties: {},
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("Must be Point or LineString");
      });
    });

    describe("Feature Properties Validation", () => {
      it("should accept null properties", () => {
        const valid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [0, 0],
              },
              properties: null,
            },
          ],
        };
        expect(() => validateGeoJSON(valid)).not.toThrow();
      });

      it("should accept undefined properties", () => {
        const valid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [0, 0],
              },
              properties: undefined,
            },
          ],
        };
        expect(() => validateGeoJSON(valid)).not.toThrow();
      });

      it("should reject non-object properties", () => {
        const invalid = {
          ...validGeoJSON,
          features: [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [0, 0],
              },
              properties: "not an object" as any,
            },
          ],
        };
        expect(() => validateGeoJSON(invalid)).toThrow(GeoJSONValidationError);
        expect(() => validateGeoJSON(invalid)).toThrow("properties must be an object or null");
      });
    });
  });

  describe("extractSummary", () => {
    it("should extract summary from valid GeoJSON", () => {
      const summary = extractSummary(validGeoJSON);

      expect(summary).toEqual({
        title: "Test Route",
        total_distance_km: 100.5,
        total_duration_h: 2.5,
        highlights: ["Mountain views", "Scenic overlook"],
      });
    });

    it("should return empty highlights array when not present", () => {
      const { highlights, ...props } = validGeoJSON.properties;
      const geoJsonWithoutHighlights = { ...validGeoJSON, properties: props };

      const summary = extractSummary(geoJsonWithoutHighlights);

      expect(summary.highlights).toEqual([]);
    });

    it("should throw validation error for invalid GeoJSON", () => {
      const invalid = { ...validGeoJSON, type: "Invalid" };
      expect(() => extractSummary(invalid as any)).toThrow(GeoJSONValidationError);
    });
  });

  describe("geoJsonToGPX", () => {
    it("should generate valid GPX 1.1 XML", () => {
      const gpx = geoJsonToGPX(validGeoJSON);

      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpx).toContain('version="1.1"');
      expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
      expect(gpx).toContain('creator="VibeRide - https://viberide.com"');
    });

    it("should include metadata with title and description", () => {
      const gpx = geoJsonToGPX(validGeoJSON);

      expect(gpx).toContain("<metadata>");
      expect(gpx).toContain("<name>Test Route</name>");
      expect(gpx).toContain("<desc>Motorcycle route generated by VibeRide</desc>");
      expect(gpx).toContain("<time>");
    });

    it("should generate waypoints for Point features", () => {
      const gpx = geoJsonToGPX(validGeoJSON);

      expect(gpx).toContain('<wpt lat="37.7749" lon="-122.4194">');
      expect(gpx).toContain("<name>Start Point</name>");
      expect(gpx).toContain("<desc>Starting location</desc>");
    });

    it("should generate route from LineString features", () => {
      const gpx = geoJsonToGPX(validGeoJSON);

      expect(gpx).toContain("<rte>");
      expect(gpx).toContain("<rtept lat=");
      expect(gpx).toContain("Total distance: 100.5km");
      expect(gpx).toContain("Duration: 2.5h");
    });

    it("should escape XML special characters", () => {
      const geoJsonWithSpecialChars = {
        ...validGeoJSON,
        properties: {
          ...validGeoJSON.properties,
          title: 'Route with <tags> & "quotes"',
        },
        features: [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [0, 0],
            },
            properties: {
              name: "Point <A>",
              description: 'Description with & and "quotes"',
            },
          },
        ],
      };

      const gpx = geoJsonToGPX(geoJsonWithSpecialChars);

      expect(gpx).toContain("&lt;tags&gt;");
      expect(gpx).toContain("&amp;");
      expect(gpx).toContain("&quot;");
      expect(gpx).not.toContain("<tags>");
      expect(gpx).not.toContain('& "');
    });

    it("should use custom creator when provided", () => {
      const gpx = geoJsonToGPX(validGeoJSON, { creator: "Custom Creator" });

      expect(gpx).toContain('creator="Custom Creator"');
    });

    it("should exclude waypoints when includeWaypoints is false", () => {
      const gpx = geoJsonToGPX(validGeoJSON, { includeWaypoints: false });

      expect(gpx).not.toContain("<wpt lat=");
    });

    it("should exclude routes when includeRoutes is false", () => {
      const gpx = geoJsonToGPX(validGeoJSON, { includeRoutes: false });

      expect(gpx).not.toContain("<rte>");
    });

    it("should include tracks when includeTracks is true", () => {
      const gpx = geoJsonToGPX(validGeoJSON, { includeTracks: true });

      expect(gpx).toContain("<trk>");
      expect(gpx).toContain("<trkseg>");
      expect(gpx).toContain("<trkpt lat=");
    });

    it("should throw GPXConversionError for invalid GeoJSON", () => {
      const invalid = { ...validGeoJSON, type: "Invalid" };
      expect(() => geoJsonToGPX(invalid as any)).toThrow(GPXConversionError);
      expect(() => geoJsonToGPX(invalid as any)).toThrow("Invalid GeoJSON");
    });
  });

  describe("geoJsonToKML", () => {
    it("should generate valid KML 2.2 XML", () => {
      const kml = geoJsonToKML(validGeoJSON);

      expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
      expect(kml).toContain("<Document>");
    });

    it("should include document name and description", () => {
      const kml = geoJsonToKML(validGeoJSON);

      expect(kml).toContain("<name>Test Route</name>");
      expect(kml).toContain("<description>");
      expect(kml).toContain("Total Distance: 100.5km");
      expect(kml).toContain("Total Duration: 2.5h");
    });

    it("should include highlights as snippet", () => {
      const kml = geoJsonToKML(validGeoJSON);

      expect(kml).toContain("<Snippet");
      expect(kml).toContain("Mountain views, Scenic overlook");
    });

    it("should define styles for waypoints and routes", () => {
      const kml = geoJsonToKML(validGeoJSON);

      expect(kml).toContain('<Style id="routeStyle">');
      expect(kml).toContain('<Style id="waypointStyle">');
      expect(kml).toContain('<Style id="poiStyle">');
    });

    it("should generate placemarks for waypoints", () => {
      const kml = geoJsonToKML(validGeoJSON);

      expect(kml).toContain("<Folder>");
      expect(kml).toContain("<name>Waypoints</name>");
      expect(kml).toContain("<Placemark>");
      expect(kml).toContain("<Point>");
      expect(kml).toContain("<coordinates>-122.4194,37.7749,0</coordinates>");
    });

    it("should generate placemarks for routes", () => {
      const kml = geoJsonToKML(validGeoJSON);

      expect(kml).toContain("<name>Route</name>");
      expect(kml).toContain("<LineString>");
      expect(kml).toContain("<tessellate>1</tessellate>");
    });

    it("should escape XML special characters", () => {
      const geoJsonWithSpecialChars = {
        ...validGeoJSON,
        properties: {
          ...validGeoJSON.properties,
          title: 'Route with <tags> & "quotes"',
        },
      };

      const kml = geoJsonToKML(geoJsonWithSpecialChars);

      expect(kml).toContain("&lt;tags&gt;");
      expect(kml).toContain("&amp;");
      expect(kml).toContain("&quot;");
    });

    it("should throw KMLConversionError for invalid GeoJSON", () => {
      const invalid = { ...validGeoJSON, type: "Invalid" };
      expect(() => geoJsonToKML(invalid as any)).toThrow(KMLConversionError);
      expect(() => geoJsonToKML(invalid as any)).toThrow("Invalid GeoJSON");
    });
  });

  describe("sanitizeFilename", () => {
    it("should replace special characters with dashes and collapse them", () => {
      expect(sanitizeFilename("route@#$%name")).toBe("route-name");
    });

    it("should replace spaces with dashes", () => {
      expect(sanitizeFilename("my route name")).toBe("my-route-name");
    });

    it("should collapse multiple dashes", () => {
      expect(sanitizeFilename("route---name")).toBe("route-name");
    });

    it("should remove leading and trailing dashes", () => {
      expect(sanitizeFilename("-route-name-")).toBe("route-name");
    });

    it("should convert to lowercase", () => {
      expect(sanitizeFilename("MyRouteNAME")).toBe("myroutename");
    });

    it("should limit length to 100 characters", () => {
      const longName = "a".repeat(150);
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBe(100);
    });

    it("should preserve alphanumeric characters and allowed symbols", () => {
      expect(sanitizeFilename("route-name_123.gpx")).toBe("route-name_123.gpx");
    });

    it("should handle empty string", () => {
      expect(sanitizeFilename("")).toBe("");
    });

    it("should handle string with only special characters", () => {
      expect(sanitizeFilename("@#$%^&*()")).toBe("");
    });
  });
});
