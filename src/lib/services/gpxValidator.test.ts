import { describe, it, expect } from "vitest";
import { validateGpx, assertValidGpx } from "./gpxValidator";

describe("gpxValidator", () => {
  const validGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VibeRide" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Test Route</name>
  </metadata>
  <wpt lat="50.0647" lon="19.9450">
    <name>Kraków</name>
  </wpt>
  <rte>
    <name>Day 1</name>
    <rtept lat="50.0647" lon="19.9450">
      <name>Start</name>
    </rtept>
    <rtept lat="49.2992" lon="19.9496">
      <name>End</name>
    </rtept>
  </rte>
</gpx>`;

  describe("validateGpx", () => {
    it("should validate correct GPX", () => {
      const result = validateGpx(validGpx);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty content", () => {
      const result = validateGpx("");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("GPX content is empty");
    });

    it("should reject missing XML declaration", () => {
      const gpx = validGpx.replace('<?xml version="1.0" encoding="UTF-8"?>', "");
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing XML declaration");
    });

    it("should reject missing GPX root element", () => {
      const result = validateGpx('<?xml version="1.0"?><root></root>');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing <gpx> root element");
    });

    it("should reject incorrect GPX version", () => {
      const gpx = validGpx.replace('version="1.1"', 'version="1.0"');
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing or incorrect GPX version (must be 1.1)");
    });

    it("should reject missing namespace", () => {
      const gpx = validGpx.replace('xmlns="http://www.topografix.com/GPX/1/1"', "");
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing or incorrect GPX namespace");
    });

    it("should warn about missing metadata", () => {
      const gpx = validGpx.replace(/<metadata>[\s\S]*?<\/metadata>/, "");
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Missing <metadata> element (recommended)");
    });

    it("should reject GPX without waypoints, routes, or tracks", () => {
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VibeRide" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Empty</name></metadata>
</gpx>`;
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("GPX must contain at least one waypoint, route, or track");
    });

    it("should reject invalid latitude", () => {
      const gpx = validGpx.replace('lat="50.0647"', 'lat="91.0"');
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Invalid latitude"))).toBe(true);
    });

    it("should reject invalid longitude", () => {
      const gpx = validGpx.replace('lon="19.9450"', 'lon="181.0"');
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Invalid longitude"))).toBe(true);
    });

    it("should reject waypoints without lat/lon", () => {
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VibeRide" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt><name>Invalid</name></wpt>
</gpx>`;
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      // The validator will detect either missing lat/lon or no valid waypoints
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject routes without route points", () => {
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VibeRide" xmlns="http://www.topografix.com/GPX/1/1">
  <rte><name>Empty Route</name></rte>
</gpx>`;
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Routes missing route points (<rtept>)");
    });

    it("should reject missing closing tag", () => {
      const gpx = validGpx.replace("</gpx>", "");
      const result = validateGpx(gpx);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing closing </gpx> tag");
    });
  });

  describe("assertValidGpx", () => {
    it("should not throw for valid GPX", () => {
      expect(() => assertValidGpx(validGpx)).not.toThrow();
    });

    it("should throw for invalid GPX", () => {
      expect(() => assertValidGpx("")).toThrow("Invalid GPX file");
    });

    it("should include error details in exception", () => {
      try {
        assertValidGpx("");
      } catch (error) {
        expect((error as Error).message).toContain("GPX content is empty");
      }
    });
  });
});

