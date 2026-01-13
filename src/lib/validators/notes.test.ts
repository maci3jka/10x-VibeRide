import { describe, it, expect } from "vitest";
import { createNoteSchema, listNotesQuerySchema, tripPreferencesSchema } from "./notes";

describe("notes validators", () => {
  describe("tripPreferencesSchema", () => {
    it("should validate complete trip preferences", () => {
      const input = {
        terrain: "paved",
        road_type: "scenic",
        duration_h: 2.5,
        distance_km: 150.0,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it("should validate partial trip preferences", () => {
      const input = {
        terrain: "gravel",
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it("should validate empty trip preferences", () => {
      const input = {};

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it("should reject invalid terrain", () => {
      const input = {
        terrain: "invalid",
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid road_type", () => {
      const input = {
        road_type: "invalid",
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative duration", () => {
      const input = {
        duration_h: -1,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject zero duration", () => {
      const input = {
        duration_h: 0,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject duration exceeding max", () => {
      const input = {
        duration_h: 1000.0,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept duration at max boundary", () => {
      const input = {
        duration_h: 999.9,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject negative distance", () => {
      const input = {
        distance_km: -100,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject distance exceeding max", () => {
      const input = {
        distance_km: 1000000.0,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept distance at max boundary", () => {
      const input = {
        distance_km: 999999.9,
      };

      const result = tripPreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("createNoteSchema", () => {
    it("should validate complete note with trip_prefs", () => {
      const input = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains with stops at various viewpoints.",
        trip_prefs: {
          terrain: "paved",
          road_type: "scenic",
          duration_h: 4.0,
          distance_km: 200.0,
        },
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(input.title);
        expect(result.data.note_text).toBe(input.note_text);
        expect(result.data.trip_prefs).toEqual(input.trip_prefs);
      }
    });

    it("should validate note without trip_prefs", () => {
      const input = {
        title: "Quick Loop",
        note_text: "Short evening ride around the local area for some fresh air.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(input.title);
        expect(result.data.note_text).toBe(input.note_text);
        expect(result.data.trip_prefs).toEqual({});
      }
    });

    it("should trim title whitespace", () => {
      const input = {
        title: "  Weekend Ride  ",
        note_text: "Planning a scenic ride through the mountains.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Weekend Ride");
      }
    });

    it("should trim note_text whitespace", () => {
      const input = {
        title: "Weekend Ride",
        note_text: "  Planning a scenic ride through the mountains.  ",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note_text).toBe("Planning a scenic ride through the mountains.");
      }
    });

    it("should reject missing title", () => {
      const input = {
        note_text: "Planning a scenic ride through the mountains.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty title", () => {
      const input = {
        title: "",
        note_text: "Planning a scenic ride through the mountains.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject title with only whitespace", () => {
      const input = {
        title: "   ",
        note_text: "Planning a scenic ride through the mountains.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept title at max length", () => {
      const input = {
        title: "A".repeat(120),
        note_text: "Planning a scenic ride through the mountains.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject title exceeding max length", () => {
      const input = {
        title: "A".repeat(121),
        note_text: "Planning a scenic ride through the mountains.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject missing note_text", () => {
      const input = {
        title: "Weekend Ride",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject note_text below min length", () => {
      const input = {
        title: "Weekend Ride",
        note_text: "Short",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept note_text at min length", () => {
      const input = {
        title: "Weekend Ride",
        note_text: "1234567890", // exactly 10 chars
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept note_text at max length", () => {
      const input = {
        title: "Weekend Ride",
        note_text: "A".repeat(1500),
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject note_text exceeding max length", () => {
      const input = {
        title: "Weekend Ride",
        note_text: "A".repeat(1501),
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid trip_prefs", () => {
      const input = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {
          terrain: "invalid",
        },
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-string title", () => {
      const input = {
        title: 123,
        note_text: "Planning a scenic ride through the mountains.",
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-string note_text", () => {
      const input = {
        title: "Weekend Ride",
        note_text: 123,
      };

      const result = createNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("listNotesQuerySchema", () => {
    it("should validate with default values", () => {
      const input = {};

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.archived).toBe(false);
        expect(result.data.sort).toBe("updated_at");
        expect(result.data.order).toBe("desc");
      }
    });

    it("should validate with all parameters", () => {
      const input = {
        page: "2",
        limit: "50",
        search: "mountain ride",
        archived: "true",
        sort: "created_at",
        order: "asc",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(result.data.search).toBe("mountain ride");
        expect(result.data.archived).toBe(true);
        expect(result.data.sort).toBe("created_at");
        expect(result.data.order).toBe("asc");
      }
    });

    it("should transform page string to number", () => {
      const input = {
        page: "5",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(typeof result.data.page).toBe("number");
      }
    });

    it("should transform limit string to number", () => {
      const input = {
        limit: "100",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
        expect(typeof result.data.limit).toBe("number");
      }
    });

    it("should transform archived string to boolean", () => {
      const input = {
        archived: "true",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.archived).toBe(true);
      }
    });

    it("should treat non-true archived as false", () => {
      const input = {
        archived: "false",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.archived).toBe(false);
      }
    });

    it("should trim search query", () => {
      const input = {
        search: "  mountain ride  ",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("mountain ride");
      }
    });

    it("should reject page less than 1", () => {
      const input = {
        page: "0",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const input = {
        page: "-1",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject limit less than 1", () => {
      const input = {
        limit: "0",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject limit exceeding max", () => {
      const input = {
        limit: "101",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept limit at max boundary", () => {
      const input = {
        limit: "100",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject search exceeding max length", () => {
      const input = {
        search: "A".repeat(251),
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept search at max length", () => {
      const input = {
        search: "A".repeat(250),
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid sort field", () => {
      const input = {
        sort: "invalid",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept valid sort fields", () => {
      const sortFields = ["updated_at", "created_at", "title"];

      sortFields.forEach((sort) => {
        const input = { sort };
        const result = listNotesQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe(sort);
        }
      });
    });

    it("should reject invalid order", () => {
      const input = {
        order: "invalid",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept valid order values", () => {
      const orders = ["asc", "desc"];

      orders.forEach((order) => {
        const input = { order };
        const result = listNotesQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe(order);
        }
      });
    });

    it("should reject non-numeric page", () => {
      const input = {
        page: "abc",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric limit", () => {
      const input = {
        limit: "abc",
      };

      const result = listNotesQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
