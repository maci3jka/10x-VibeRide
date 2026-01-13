import { describe, it, expect } from "vitest";
import { statsQuerySchema } from "./analytics";

describe("statsQuerySchema", () => {
  describe("valid inputs", () => {
    it("should accept empty object (no date filters)", () => {
      const result = statsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it("should accept valid 'from' date only", () => {
      const result = statsQuerySchema.safeParse({
        from: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBe("2024-01-01T00:00:00.000Z");
        expect(result.data.to).toBeUndefined();
      }
    });

    it("should accept valid 'to' date only", () => {
      const result = statsQuerySchema.safeParse({
        to: "2024-12-31T23:59:59.999Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBeUndefined();
        expect(result.data.to).toBe("2024-12-31T23:59:59.999Z");
      }
    });

    it("should accept valid date range where from <= to", () => {
      const result = statsQuerySchema.safeParse({
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-12-31T23:59:59.999Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBe("2024-01-01T00:00:00.000Z");
        expect(result.data.to).toBe("2024-12-31T23:59:59.999Z");
      }
    });

    it("should accept date range where from equals to", () => {
      const sameDate = "2024-06-15T12:00:00.000Z";
      const result = statsQuerySchema.safeParse({
        from: sameDate,
        to: sameDate,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBe(sameDate);
        expect(result.data.to).toBe(sameDate);
      }
    });
  });

  describe("invalid inputs", () => {
    it("should reject invalid ISO 8601 format for 'from'", () => {
      const result = statsQuerySchema.safeParse({
        from: "2024-01-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Invalid ISO 8601 date format");
      }
    });

    it("should reject invalid ISO 8601 format for 'to'", () => {
      const result = statsQuerySchema.safeParse({
        to: "not-a-date",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Invalid ISO 8601 date format");
      }
    });

    it("should reject when 'from' is after 'to'", () => {
      const result = statsQuerySchema.safeParse({
        from: "2024-12-31T23:59:59.999Z",
        to: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("'from' date must be before or equal to 'to' date");
        expect(result.error.issues[0]?.path).toEqual(["from"]);
      }
    });

    it("should reject non-string values", () => {
      const result = statsQuerySchema.safeParse({
        from: 12345,
      });
      expect(result.success).toBe(false);
    });

    it("should reject null values", () => {
      const result = statsQuerySchema.safeParse({
        from: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle dates with milliseconds", () => {
      const result = statsQuerySchema.safeParse({
        from: "2024-01-01T00:00:00.123Z",
        to: "2024-12-31T23:59:59.999Z",
      });
      expect(result.success).toBe(true);
    });

    it("should handle dates with Z timezone", () => {
      const result = statsQuerySchema.safeParse({
        from: "2024-01-01T00:00:00Z",
        to: "2024-12-31T23:59:59Z",
      });
      expect(result.success).toBe(true);
    });

    it("should ignore extra properties", () => {
      const result = statsQuerySchema.safeParse({
        from: "2024-01-01T00:00:00.000Z",
        extra: "ignored",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extra");
      }
    });
  });
});
