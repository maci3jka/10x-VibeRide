import { describe, it, expect } from "vitest";
import { z } from "zod";

// Analytics validators
import { statsQuerySchema } from "./analytics";

// Itinerary validators
import {
  generateItinerarySchema,
  listItinerariesQuerySchema,
  downloadGpxQuerySchema,
} from "./itinerary";

// Notes validators
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  noteIdParamSchema,
  tripPreferencesSchema,
} from "./notes";

describe("Validators", () => {
  describe("Analytics - statsQuerySchema", () => {
    it("should accept valid date range", () => {
      const input = {
        from: "2024-01-01T00:00:00Z",
        to: "2024-01-31T23:59:59Z",
      };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it("should accept only from date", () => {
      const input = { from: "2024-01-01T00:00:00Z" };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept only to date", () => {
      const input = { to: "2024-01-31T23:59:59Z" };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = statsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject invalid ISO 8601 format for from", () => {
      const input = { from: "2024-01-01" };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid ISO 8601");
      }
    });

    it("should reject invalid ISO 8601 format for to", () => {
      const input = { to: "2024-01-31" };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid ISO 8601");
      }
    });

    it("should reject when from is after to", () => {
      const input = {
        from: "2024-02-01T00:00:00Z",
        to: "2024-01-01T00:00:00Z",
      };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("before or equal to");
      }
    });

    it("should accept when from equals to", () => {
      const input = {
        from: "2024-01-01T00:00:00Z",
        to: "2024-01-01T00:00:00Z",
      };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject non-string dates", () => {
      const input = { from: 123456789 };

      const result = statsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Itinerary - generateItinerarySchema", () => {
    it("should accept valid UUID request_id", () => {
      const input = { request_id: "550e8400-e29b-41d4-a716-446655440000" };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject missing request_id", () => {
      const result = generateItinerarySchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("should reject invalid UUID format", () => {
      const input = { request_id: "not-a-uuid" };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("valid UUID");
      }
    });

    it("should reject non-string request_id", () => {
      const input = { request_id: 123 };

      const result = generateItinerarySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must be a string");
      }
    });
  });

  describe("Itinerary - listItinerariesQuerySchema", () => {
    it("should accept valid status", () => {
      const statuses = ["pending", "running", "completed", "failed", "cancelled"];

      for (const status of statuses) {
        const result = listItinerariesQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it("should use default limit of 20", () => {
      const result = listItinerariesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("should parse string limit to number", () => {
      const input = { limit: "50" };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(typeof result.data.limit).toBe("number");
      }
    });

    it("should reject limit less than 1", () => {
      const input = { limit: "0" };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 1");
      }
    });

    it("should reject limit greater than 100", () => {
      const input = { limit: "101" };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 100");
      }
    });

    it("should reject invalid status", () => {
      const input = { status: "invalid" };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("one of");
      }
    });

    it("should reject non-numeric limit", () => {
      const input = { limit: "abc" };

      const result = listItinerariesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept limit at boundaries", () => {
      const result1 = listItinerariesQuerySchema.safeParse({ limit: "1" });
      const result100 = listItinerariesQuerySchema.safeParse({ limit: "100" });

      expect(result1.success).toBe(true);
      expect(result100.success).toBe(true);
    });
  });

  describe("Itinerary - downloadGpxQuerySchema", () => {
    it("should accept acknowledged=true", () => {
      const input = { acknowledged: "true" };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acknowledged).toBe(true);
      }
    });

    it("should reject acknowledged=false", () => {
      const input = { acknowledged: "false" };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("acknowledge");
      }
    });

    it("should reject missing acknowledged", () => {
      const result = downloadGpxQuerySchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("should reject non-string acknowledged", () => {
      const input = { acknowledged: true };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should transform string 'true' to boolean true", () => {
      const input = { acknowledged: "true" };

      const result = downloadGpxQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acknowledged).toBe(true);
        expect(typeof result.data.acknowledged).toBe("boolean");
      }
    });
  });

  describe("Notes - tripPreferencesSchema", () => {
    it("should accept valid trip preferences", () => {
      const input = {
        terrain: "paved",
        road_type: "scenic",
        duration_h: 2.5,
        distance_km: 150.0,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept partial preferences", () => {
      const input = { terrain: "gravel" };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = tripPreferencesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject invalid terrain", () => {
      const input = { terrain: "invalid" };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("one of");
      }
    });

    it("should reject invalid road_type", () => {
      const input = { road_type: "invalid" };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("one of");
      }
    });

    it("should reject zero duration", () => {
      const input = { duration_h: 0 };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("greater than 0");
      }
    });

    it("should reject negative duration", () => {
      const input = { duration_h: -1 };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject duration exceeding max", () => {
      const input = { duration_h: 1000 };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 999.9");
      }
    });

    it("should accept duration at max boundary", () => {
      const input = { duration_h: 999.9 };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject zero distance", () => {
      const input = { distance_km: 0 };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject distance exceeding max", () => {
      const input = { distance_km: 1000000 };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 999999.9");
      }
    });

    it("should accept distance at max boundary", () => {
      const input = { distance_km: 999999.9 };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject non-numeric duration", () => {
      const input = { duration_h: "2.5" };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Notes - createNoteSchema", () => {
    it("should accept valid note", () => {
      const input = {
        title: "Test Note",
        note_text: "This is a test note with enough characters.",
        trip_prefs: {},
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from title", () => {
      const input = {
        title: "  Test Note  ",
        note_text: "This is a test note with enough characters.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Test Note");
      }
    });

    it("should trim whitespace from note_text", () => {
      const input = {
        title: "Test Note",
        note_text: "  This is a test note with enough characters.  ",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note_text).toBe("This is a test note with enough characters.");
      }
    });

    it("should default trip_prefs to empty object", () => {
      const input = {
        title: "Test Note",
        note_text: "This is a test note with enough characters.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trip_prefs).toEqual({});
      }
    });

    it("should reject missing title", () => {
      const input = {
        note_text: "This is a test note with enough characters.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("should reject empty title after trim", () => {
      const input = {
        title: "   ",
        note_text: "This is a test note with enough characters.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 1 character");
      }
    });

    it("should reject title exceeding 120 characters", () => {
      const input = {
        title: "a".repeat(121),
        note_text: "This is a test note with enough characters.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 120");
      }
    });

    it("should accept title with exactly 120 characters", () => {
      const input = {
        title: "a".repeat(120),
        note_text: "This is a test note with enough characters.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject missing note_text", () => {
      const input = {
        title: "Test Note",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("should reject note_text less than 10 characters", () => {
      const input = {
        title: "Test Note",
        note_text: "Short",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 10 characters");
      }
    });

    it("should accept note_text with exactly 10 characters", () => {
      const input = {
        title: "Test Note",
        note_text: "1234567890",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject note_text exceeding 1500 characters", () => {
      const input = {
        title: "Test Note",
        note_text: "a".repeat(1501),
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 1500");
      }
    });

    it("should accept note_text with exactly 1500 characters", () => {
      const input = {
        title: "Test Note",
        note_text: "a".repeat(1500),
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject non-string title", () => {
      const input = {
        title: 123,
        note_text: "This is a test note with enough characters.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-string note_text", () => {
      const input = {
        title: "Test Note",
        note_text: 123,
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Notes - listNotesQuerySchema", () => {
    it("should use default values", () => {
      const result = listNotesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.archived).toBe(false);
        expect(result.data.sort).toBe("updated_at");
        expect(result.data.order).toBe("desc");
      }
    });

    it("should parse string page to number", () => {
      const input = { page: "5" };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(typeof result.data.page).toBe("number");
      }
    });

    it("should parse string limit to number", () => {
      const input = { limit: "50" };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("should parse archived string to boolean", () => {
      const result1 = listNotesQuerySchema.safeParse({ archived: "true" });
      const result2 = listNotesQuerySchema.safeParse({ archived: "false" });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success) expect(result1.data.archived).toBe(true);
      if (result2.success) expect(result2.data.archived).toBe(false);
    });

    it("should trim search query", () => {
      const input = { search: "  test query  " };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("test query");
      }
    });

    it("should reject page less than 1", () => {
      const input = { page: "0" };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 1");
      }
    });

    it("should reject limit less than 1", () => {
      const input = { limit: "0" };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject limit greater than 100", () => {
      const input = { limit: "101" };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 100");
      }
    });

    it("should reject search exceeding 250 characters", () => {
      const input = { search: "a".repeat(251) };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 250");
      }
    });

    it("should reject invalid sort field", () => {
      const input = { sort: "invalid" };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("one of");
      }
    });

    it("should reject invalid order", () => {
      const input = { order: "invalid" };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("one of");
      }
    });

    it("should accept all valid sort fields", () => {
      const sortFields = ["updated_at", "created_at", "title"];

      for (const sort of sortFields) {
        const result = listNotesQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      }
    });

    it("should accept both order values", () => {
      const result1 = listNotesQuerySchema.safeParse({ order: "asc" });
      const result2 = listNotesQuerySchema.safeParse({ order: "desc" });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe("Notes - noteIdParamSchema", () => {
    it("should accept valid UUID", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";

      const result = noteIdParamSchema.safeParse(uuid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID format", () => {
      const result = noteIdParamSchema.safeParse("not-a-uuid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid note ID");
      }
    });

    it("should reject non-string", () => {
      const result = noteIdParamSchema.safeParse(123);
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = noteIdParamSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("Notes - updateNoteSchema", () => {
    it("should have same structure as createNoteSchema", () => {
      const input = {
        title: "Updated Note",
        note_text: "This is an updated note with enough characters.",
        trip_prefs: { terrain: "gravel" },
      };

      const createResult = createNoteSchema.safeParse(input);
      const updateResult = updateNoteSchema.safeParse(input);

      expect(createResult.success).toBe(true);
      expect(updateResult.success).toBe(true);
      expect(createResult.data).toEqual(updateResult.data);
    });
  });
});
