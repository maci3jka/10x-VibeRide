import { describe, it, expect } from "vitest";
import { buildLink, TooManyPointsError, LinkGenerationError } from "./mapyLinkService";
import type { RouteGeoJSON } from "../../types";

describe("mapyLinkService", () => {
  describe("buildLink", () => {
    it("should generate valid Mapy.cz URL for simple route", () => {
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
                [20.9419, 49.4208], // Szczawnica
                [20.4142, 49.3952], // Bialka
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

      expect(url).toContain("https://mapy.com/fnc/v1/route");
      expect(url).toContain("start=20.941900%2C49.420800"); // lon,lat format (URL encoded)
      expect(url).toContain("end=20.414200%2C49.395200");
      expect(url).toContain("routeType=car_fast"); // Default transport mode
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

      const carUrl = buildLink(geojson, "car");
      const bikeUrl = buildLink(geojson, "bike");
      const footUrl = buildLink(geojson, "foot");

      expect(carUrl).toContain("routeType=car_fast");
      expect(bikeUrl).toContain("routeType=bike_road");
      expect(footUrl).toContain("routeType=foot_fast");
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
                [20.123456789, 49.987654321],
                [21.111111111, 50.222222222],
              ],
            },
            properties: {},
          },
        ],
      };

      const url = buildLink(geojson);

      expect(url).toContain("start=20.123457%2C49.987654"); // Rounded (lon,lat)
      expect(url).toContain("end=21.111111%2C50.222222"); // Rounded (lon,lat)
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

      // Should have start, end, and waypoints
      expect(url).toContain("start=20.000000%2C50.000000");
      expect(url).toContain("end=21.000000%2C51.000000");
      expect(url).toContain("waypoints=20.500000%2C50.500000"); // Middle point as waypoint
    });

    it("should sample points when route has more than maxPoints", () => {
      // Create route with 20 points
      const coordinates: [number, number][] = [];
      for (let i = 0; i < 20; i++) {
        coordinates.push([20.0 + i * 0.1, 50.0 + i * 0.1]);
      }

      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Long Route",
          total_distance_km: 200,
          total_duration_h: 4,
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

      const url = buildLink(geojson, "bike", 10);

      // Should sample down to 10 points (start + 8 waypoints + end)
      expect(url).toContain("routeType=bike_road");
      expect(url).toContain("start=20.000000%2C50.000000"); // First point
      expect(url).toContain("end=21.900000%2C51.900000"); // Last point
      expect(url).toContain("waypoints="); // Should have waypoints

      // Count waypoints (should be 8 middle points)
      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split(";");
      expect(waypoints.length).toBe(8); // 10 total - 2 (start/end)
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

      const url = buildLink(geojson, "bike", 15);

      // Should keep all 3 points (start + 1 waypoint + end)
      expect(url).toContain("start=20.000000%2C50.000000");
      expect(url).toContain("end=21.000000%2C51.000000");
      expect(url).toContain("waypoints=20.500000%2C50.500000");
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
      const url = buildLink(geojson, "bike", 15);

      // Should sample down to 15 points (start + 13 waypoints + end)
      expect(url).toContain("start=20.000000%2C50.000000");
      expect(url).toContain("end=20.990000%2C50.990000");

      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split(";");
      expect(waypoints.length).toBe(13); // 15 total - 2 (start/end)
    });

    it("should handle route with exactly maxPoints", () => {
      const coordinates: [number, number][] = [];
      for (let i = 0; i < 15; i++) {
        coordinates.push([20.0 + i * 0.1, 50.0 + i * 0.1]);
      }

      const geojson: RouteGeoJSON = {
        type: "FeatureCollection",
        properties: {
          title: "Exact Route",
          total_distance_km: 150,
          total_duration_h: 3,
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

      const url = buildLink(geojson, "bike", 15);

      // Should keep all 15 points (start + 13 waypoints + end)
      expect(url).toContain("start=20.000000%2C50.000000");
      expect(url).toContain("end=21.400000%2C51.400000");

      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split(";");
      expect(waypoints.length).toBe(13); // 15 total - 2 (start/end)
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

      // Verify URL structure (new fnc/v1/route format)
      expect(url).toMatch(/^https:\/\/mapy\.com\/fnc\/v1\/route\?/);
      expect(url).toContain("start=");
      expect(url).toContain("end=");
      expect(url).toContain("routeType=");

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
      expect(url).toContain("start=20.000000%2C50.000000"); // First point of Day 1
      expect(url).toContain("end=23.000000%2C53.000000"); // Last point of Day 3

      // Should have waypoints from all segments
      const waypointsMatch = url.match(/waypoints=([^&]+)/);
      expect(waypointsMatch).toBeTruthy();
      const waypoints = decodeURIComponent(waypointsMatch![1]).split(";");
      expect(waypoints.length).toBe(5); // 7 total - 2 (start/end)

      // Verify some middle waypoints are included
      const waypointsStr = decodeURIComponent(waypointsMatch![1]);
      expect(waypointsStr).toContain("20.500000,50.500000"); // Day 1 middle
      expect(waypointsStr).toContain("21.000000,51.000000"); // Day 1 end / Day 2 start
      expect(waypointsStr).toContain("22.000000,52.000000"); // Day 2 end / Day 3 start
    });
  });
});
