import { describe, it, expect } from "vitest";
import { buildLink, TooManyPointsError, LinkGenerationError } from "./googleMapsLinkService";
import type { RouteGeoJSON } from "../../types";

describe("googleMapsLinkService", () => {
  describe("buildLink", () => {
    it("should generate valid Google Maps URL for simple route", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Test Route",
          total_distance_km: 100,
          total_duration_h: 2,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.941900, 49.420800], // Szczawnica (lon, lat)
                [20.414200, 49.395200], // Bialka (lon, lat)
              ],
            },
            properties: {
              name: "Test Segment",
              type: "route",
            },
          },
        ],
      };

      const url = buildLink(geojson);

      expect(url).toContain("https://www.google.com/maps/dir/");
      expect(url).toContain("api=1");
      // Google Maps uses lat,lon format (swapped from GeoJSON lon,lat)
      expect(url).toContain("origin=49.420800%2C20.941900"); // lat,lon format (URL encoded)
      expect(url).toContain("destination=49.395200%2C20.414200");
      expect(url).toContain("travelmode=driving"); // Default transport mode
    });

    it("should use specified transport mode", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Test Route",
          total_distance_km: 100,
          total_duration_h: 2,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0],
                [21.0, 51.0],
              ],
            },
            properties: {},
          },
        ],
      };

      const drivingUrl = buildLink(geojson, "driving");
      const bicyclingUrl = buildLink(geojson, "bicycling");
      const walkingUrl = buildLink(geojson, "walking");

      expect(drivingUrl).toContain("travelmode=driving");
      expect(bicyclingUrl).toContain("travelmode=bicycling");
      expect(walkingUrl).toContain("travelmode=walking");
    });

    it("should round coordinates to 6 decimal places", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Test Route",
          total_distance_km: 100,
          total_duration_h: 2,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.123456789, 49.987654321], // lon, lat
                [21.111111111, 50.222222222],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson);

      // Coordinates should be swapped to lat,lon and rounded to 6 decimals
      expect(url).toContain("origin=49.987654%2C20.123457"); // Rounded (lat,lon)
      expect(url).toContain("destination=50.222222%2C21.111111"); // Rounded (lat,lon)
    });

    it("should swap coordinates from lon,lat to lat,lon", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Test Route",
          total_distance_km: 100,
          total_duration_h: 2,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0], // GeoJSON: lon, lat
                [21.0, 51.0],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson);

      // Google Maps expects lat,lon (swapped from GeoJSON)
      expect(url).toContain("origin=50.000000%2C20.000000"); // lat,lon
      expect(url).toContain("destination=51.000000%2C21.000000"); // lat,lon
    });

    it("should handle waypoints for routes with multiple points", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Test Route",
          total_distance_km: 100,
          total_duration_h: 2,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0],
                [20.5, 50.5],
                [21.0, 51.0],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson);

      // Should have origin, destination, and waypoints
      expect(url).toContain("origin=50.000000%2C20.000000");
      expect(url).toContain("destination=51.000000%2C21.000000");
      expect(url).toContain("waypoints=50.500000%2C20.500000"); // Middle point as waypoint (lat,lon)
    });

    it("should use pipe separator for multiple waypoints", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Test Route",
          total_distance_km: 100,
          total_duration_h: 2,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0],
                [20.3, 50.3],
                [20.6, 50.6],
                [21.0, 51.0],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson);

      // Google Maps uses pipe (|) separator for waypoints
      expect(url).toContain("waypoints=50.300000%2C20.300000%7C50.600000%2C20.600000"); // %7C is URL-encoded pipe
    });

    it("should sample points when route has more than maxPoints", () => {
      // Create route with 30 points
      const coordinates: [number, number][] = [];
      for (let i = 0; i < 30; i++) {
        coordinates.push([20.0 + i * 0.1, 50.0 + i * 0.1]);
      }

      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Long Route",
          total_distance_km: 300,
          total_duration_h: 6,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates,
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson, "driving", 15);

      // Should sample down to 15 points (origin + 13 waypoints + destination)
      expect(url).toContain("travelmode=driving");
      expect(url).toContain("origin=50.000000%2C20.000000"); // First point (lat,lon)
      expect(url).toContain("destination=52.900000%2C22.900000"); // Last point (lat,lon)
      expect(url).toContain("waypoints="); // Should have waypoints
      
      // Count waypoints (should be 13 middle points)
      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split("|");
      expect(waypoints.length).toBe(13); // 15 total - 2 (origin/destination)
    });

    it("should keep all points when route has fewer than maxPoints", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Short Route",
          total_distance_km: 50,
          total_duration_h: 1,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0],
                [20.5, 50.5],
                [21.0, 51.0],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson, "driving", 25);

      // Should keep all 3 points (origin + 1 waypoint + destination)
      expect(url).toContain("origin=50.000000%2C20.000000");
      expect(url).toContain("destination=51.000000%2C21.000000");
      expect(url).toContain("waypoints=50.500000%2C20.500000");
    });

    it("should throw LinkGenerationError when no LineString feature found", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "No Route",
          total_distance_km: 0,
          total_duration_h: 0,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [20.0, 50.0],
            },
            properties: {},
          },
        ],
      };

      expect(() => buildLink(geojson)).toThrow(LinkGenerationError);
      expect(() => buildLink(geojson)).toThrow("No LineString feature found");
    });

    it("should throw LinkGenerationError when route has fewer than 2 coordinates", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Invalid Route",
          total_distance_km: 0,
          total_duration_h: 0,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[20.0, 50.0]], // Only 1 point
            },
            properties: {},
          },
        ],
      };

      expect(() => buildLink(geojson)).toThrow(LinkGenerationError);
      expect(() => buildLink(geojson)).toThrow("at least 2 coordinates");
    });

    it("should handle very long routes by sampling down to maxPoints", () => {
      // Create a very long route with 100 points
      const coordinates: [number, number][] = [];
      for (let i = 0; i < 100; i++) {
        coordinates.push([20.0 + i * 0.01, 50.0 + i * 0.01]);
      }

      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Very Long Route",
          total_distance_km: 1000,
          total_duration_h: 20,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates,
            },
            properties: {},
          },
        ],
      };

      // With proper sampling, this should not throw
      const url = buildLink(geojson, "driving", 25);
      
      // Should sample down to 25 points (origin + 23 waypoints + destination)
      expect(url).toContain("origin=50.000000%2C20.000000");
      expect(url).toContain("destination=50.990000%2C20.990000");
      
      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split("|");
      expect(waypoints.length).toBe(23); // 25 total - 2 (origin/destination)
    });

    it("should handle route with exactly maxPoints", () => {
      const coordinates: [number, number][] = [];
      for (let i = 0; i < 25; i++) {
        coordinates.push([20.0 + i * 0.1, 50.0 + i * 0.1]);
      }

      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Exact Route",
          total_distance_km: 250,
          total_duration_h: 5,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates,
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson, "driving", 25);

      // Should keep all 25 points (origin + 23 waypoints + destination)
      expect(url).toContain("origin=50.000000%2C20.000000");
      expect(url).toContain("destination=52.400000%2C22.400000");
      
      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split("|");
      expect(waypoints.length).toBe(23); // 25 total - 2 (origin/destination)
    });

    it("should generate valid URL structure", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Test Route",
          total_distance_km: 100,
          total_duration_h: 2,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0],
                [21.0, 51.0],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson);

      // Verify URL structure
      expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?/);
      expect(url).toContain("api=1");
      expect(url).toContain("origin=");
      expect(url).toContain("destination=");
      expect(url).toContain("travelmode=");
      
      // Verify it's a valid URL
      expect(() => new URL(url)).not.toThrow();
    });

    it("should merge multiple LineString features for multi-day routes", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Multi-Day Route",
          total_distance_km: 300,
          total_duration_h: 6,
          days: 3,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0], // Day 1 start
                [20.5, 50.5], // Day 1 middle
                [21.0, 51.0], // Day 1 end
              ],
            },
            properties: { name: "Day 1", day: 1 },
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [21.0, 51.0], // Day 2 start (same as Day 1 end)
                [21.5, 51.5], // Day 2 middle
                [22.0, 52.0], // Day 2 end
              ],
            },
            properties: { name: "Day 2", day: 2 },
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [22.0, 52.0], // Day 3 start (same as Day 2 end)
                [22.5, 52.5], // Day 3 middle
                [23.0, 53.0], // Day 3 end
              ],
            },
            properties: { name: "Day 3", day: 3 },
          },
        ],
      };

      const url = buildLink(geojson);

      // Should merge all segments into one route
      // Total: 3 + 2 + 2 = 7 unique points (duplicates at segment boundaries removed)
      expect(url).toContain("origin=50.000000%2C20.000000"); // First point of Day 1 (lat,lon)
      expect(url).toContain("destination=53.000000%2C23.000000"); // Last point of Day 3 (lat,lon)
      
      // Should have waypoints from all segments
      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split("|");
      expect(waypoints.length).toBe(5); // 7 total - 2 (origin/destination)
      
      // Verify some middle waypoints are included (lat,lon format)
      const waypointsStr = decodeURIComponent(waypointsMatch![1]);
      expect(waypointsStr).toContain("50.500000,20.500000"); // Day 1 middle
      expect(waypointsStr).toContain("51.000000,21.000000"); // Day 1 end / Day 2 start
      expect(waypointsStr).toContain("52.000000,22.000000"); // Day 2 end / Day 3 start
    });

    it("should not include waypoints parameter for 2-point route", () => {
      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Simple Route",
          total_distance_km: 50,
          total_duration_h: 1,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [20.0, 50.0],
                [21.0, 51.0],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson);

      // Should only have origin and destination, no waypoints
      expect(url).toContain("origin=50.000000%2C20.000000");
      expect(url).toContain("destination=51.000000%2C21.000000");
      expect(url).not.toContain("waypoints=");
    });

    it("should handle default maxPoints of 25", () => {
      // Create route with 30 points (exceeds default max of 25)
      const coordinates: [number, number][] = [];
      for (let i = 0; i < 30; i++) {
        coordinates.push([20.0 + i * 0.1, 50.0 + i * 0.1]);
      }

      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Long Route",
          total_distance_km: 300,
          total_duration_h: 6,
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates,
            },
            properties: {},
          },
        ],
      };

      // Should use default maxPoints of 25
      const url = buildLink(geojson);
      
      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split("|");
      expect(waypoints.length).toBe(23); // 25 total - 2 (origin/destination)
    });
  });
});

