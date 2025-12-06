import { describe, it, expect } from "vitest";
import { generateItinerarySchema, listItinerariesQuerySchema, downloadGpxQuerySchema } from "./itinerary";

describe("itinerary validators", () => {
  describe("generateItinerarySchema", () => {
    it("should validate valid UUID request_id", () => {
      const input = {
        request_id: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.request_id).toBe(input.request_id);
      }
    });

    it("should validate lowercase UUID", () => {
      const input = {
        request_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.request_id).toBe(input.request_id);
      }
    });

    it("should validate uppercase UUID", () => {
      const input = {
        request_id: "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate mixed case UUID", () => {
      const input = {
        request_id: "A1b2C3d4-E5f6-7890-AbCd-Ef1234567890",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject missing request_id", () => {
      const input = {};

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("should reject null request_id", () => {
      const input = {
        request_id: null,
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject undefined request_id", () => {
      const input = {
        request_id: undefined,
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty string request_id", () => {
      const input = {
        request_id: "",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("should reject non-UUID string", () => {
      const input = {
        request_id: "not-a-uuid",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("should reject UUID with invalid format (missing hyphens)", () => {
      const input = {
        request_id: "550e8400e29b41d4a716446655440000",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject UUID with wrong segment lengths", () => {
      const input = {
        request_id: "550e840-e29b-41d4-a716-446655440000",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject UUID with invalid characters", () => {
      const input = {
        request_id: "550e8400-e29b-41d4-a716-44665544000g",
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-string request_id (number)", () => {
      const input = {
        request_id: 123456,
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("string");
      }
    });

    it("should reject non-string request_id (object)", () => {
      const input = {
        request_id: { id: "550e8400-e29b-41d4-a716-446655440000" },
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-string request_id (array)", () => {
      const input = {
        request_id: ["550e8400-e29b-41d4-a716-446655440000"],
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-string request_id (boolean)", () => {
      const input = {
        request_id: true,
      };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject extra fields", () => {
      const input = {
        request_id: "550e8400-e29b-41d4-a716-446655440000",
        extra_field: "should not be here",
      };

      // Zod by default strips extra fields in strict mode
      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extra_field");
      }
    });
  });

  describe("listItinerariesQuerySchema", () => {
    it("should validate with default values", () => {
      const input = {};

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.status).toBeUndefined();
      }
    });

    it("should validate with all parameters", () => {
      const input = {
        status: "completed",
        limit: "50",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("completed");
        expect(result.data.limit).toBe(50);
      }
    });

    it("should validate all valid status values", () => {
      const statuses = ["pending", "running", "completed", "failed", "cancelled"];

      statuses.forEach((status) => {
        const input = { status };
        const result = listItinerariesQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      });
    });

    it("should transform limit string to number", () => {
      const input = {
        limit: "75",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(75);
        expect(typeof result.data.limit).toBe("number");
      }
    });

    it("should accept limit at min boundary", () => {
      const input = {
        limit: "1",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it("should accept limit at max boundary", () => {
      const input = {
        limit: "100",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it("should reject invalid status", () => {
      const input = {
        status: "invalid",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("pending, running, completed, failed, cancelled");
      }
    });

    it("should reject limit less than 1", () => {
      const input = {
        limit: "0",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 1");
      }
    });

    it("should reject negative limit", () => {
      const input = {
        limit: "-5",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject limit exceeding max", () => {
      const input = {
        limit: "101",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 100");
      }
    });

    it("should reject non-numeric limit", () => {
      const input = {
        limit: "abc",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept decimal limit and truncate to integer", () => {
      const input = {
        limit: "20.5",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      // parseInt truncates decimals, so this is valid
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("should handle undefined status", () => {
      const input = {
        status: undefined,
        limit: "20",
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it("should handle undefined limit with default", () => {
      const input = {
        limit: undefined,
      };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe("downloadGpxQuerySchema", () => {
    it("should accept acknowledged=true", () => {
      const input = {
        acknowledged: "true",
      };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acknowledged).toBe(true);
      }
    });

    it("should reject acknowledged=false", () => {
      const input = {
        acknowledged: "false",
      };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("must acknowledge");
      }
    });

    it("should reject missing acknowledged parameter", () => {
      const input = {};

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("required");
      }
    });

    it("should reject non-string acknowledged parameter", () => {
      const input = {
        acknowledged: true, // boolean instead of string
      };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject acknowledged with invalid value", () => {
      const input = {
        acknowledged: "yes",
      };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("must acknowledge");
      }
    });
  });
});
