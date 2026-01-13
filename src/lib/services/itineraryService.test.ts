import { describe, it, expect, vi } from "vitest";
import {
  startGeneration,
  listByNote,
  getById,
  softDelete,
  getStatus,
  cancelGeneration,
  GenerationInProgressError,
  NoteNotFoundError,
  PreferencesMissingError,
  ItineraryNotFoundError,
  CannotDeleteNonTerminalError,
  CannotCancelError,
} from "./itineraryService";
import type { SupabaseClient } from "../../db/supabase.client";

// Helper to create a mock query builder chain
const createQueryBuilder = (finalResult: any, isListQuery = false) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(function (this: any) {
      // For list queries, limit() is terminal and returns a promise
      // For other queries, it returns the builder for further chaining
      if (isListQuery) {
        return Promise.resolve(finalResult);
      }
      return this;
    }),
    single: vi.fn().mockResolvedValue(finalResult),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
  };
  return builder;
};

describe("itineraryService", () => {
  describe("startGeneration", () => {
    const userId = "test-user-id";
    const noteId = "test-note-id";
    const requestId = "550e8400-e29b-41d4-a716-446655440000";

    it("should successfully start generation for first itinerary", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      const mockNewItinerary = {
        itinerary_id: "new-itinerary-id",
        note_id: noteId,
        version: 1,
        status: "pending",
        request_id: requestId,
        created_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          callCount++;
          if (callCount === 1) {
            // Note verification
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            // Preferences check
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else if (callCount === 3) {
            // Check for running generation
            return createQueryBuilder({ data: null, error: null });
          } else if (callCount === 4) {
            // Get max version (no existing itineraries)
            return createQueryBuilder({ data: null, error: null });
          } else {
            // Insert new itinerary
            return createQueryBuilder({ data: mockNewItinerary, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await startGeneration(mockSupabase, userId, noteId, requestId);

      expect(result.itinerary_id).toBe("new-itinerary-id");
      expect(result.version).toBe(1);
      expect(result.status).toBe("pending");
      expect(result.request_id).toBe(requestId);
    });

    it("should successfully start generation with incremented version", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      const mockMaxVersion = {
        version: 3,
      };

      const mockNewItinerary = {
        itinerary_id: "new-itinerary-id",
        note_id: noteId,
        version: 4,
        status: "pending",
        request_id: requestId,
        created_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else if (callCount === 3) {
            return createQueryBuilder({ data: null, error: null });
          } else if (callCount === 4) {
            return createQueryBuilder({ data: mockMaxVersion, error: null });
          } else {
            return createQueryBuilder({ data: mockNewItinerary, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await startGeneration(mockSupabase, userId, noteId, requestId);

      expect(result.version).toBe(4);
    });

    it("should throw NoteNotFoundError when note does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { message: "Not found" } })),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(NoteNotFoundError);
    });

    it("should throw NoteNotFoundError when note is deleted", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: null })),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(NoteNotFoundError);
      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(
        "Note not found or has been deleted"
      );
    });

    it("should throw NoteNotFoundError when user does not own note", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: "different-user-id",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockNote, error: null })),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(NoteNotFoundError);
      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(
        "Note not found or has been deleted"
      );
    });

    it("should throw PreferencesMissingError when user has no preferences", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else {
            return createQueryBuilder({ data: null, error: { message: "Not found" } });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(PreferencesMissingError);
    });

    it("should throw GenerationInProgressError when another generation is running", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      const mockRunningGeneration = {
        request_id: "existing-request-id",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else {
            return createQueryBuilder({ data: mockRunningGeneration, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      try {
        await startGeneration(mockSupabase, userId, noteId, requestId);
        expect.fail("Should have thrown GenerationInProgressError");
      } catch (err) {
        expect(err).toBeInstanceOf(GenerationInProgressError);
        if (err instanceof GenerationInProgressError) {
          expect(err.activeRequestId).toBe("existing-request-id");
          expect(err.message).toContain("already in progress");
        }
      }
    });

    it("should throw error when checking running generation fails", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else {
            return createQueryBuilder({ data: null, error: { message: "Database error" } });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(
        "Failed to check running generations"
      );
    });

    it("should throw error when version calculation fails", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else if (callCount === 3) {
            return createQueryBuilder({ data: null, error: null });
          } else {
            return createQueryBuilder({ data: null, error: { message: "Database error" } });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(
        "Failed to calculate version"
      );
    });

    it("should throw error when insert fails", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else if (callCount === 3) {
            return createQueryBuilder({ data: null, error: null });
          } else if (callCount === 4) {
            return createQueryBuilder({ data: null, error: null });
          } else {
            return createQueryBuilder({ data: null, error: { message: "Insert failed" } });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow("Failed to create");
    });

    it("should return existing itinerary on duplicate request_id (idempotency)", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      const mockExistingItinerary = {
        itinerary_id: "existing-itinerary-id",
        note_id: noteId,
        version: 2,
        status: "completed",
        request_id: requestId,
        created_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else if (callCount === 3) {
            return createQueryBuilder({ data: null, error: null });
          } else if (callCount === 4) {
            return createQueryBuilder({ data: { version: 1 }, error: null });
          } else if (callCount === 5) {
            // Insert fails with duplicate key
            return createQueryBuilder({ data: null, error: { code: "23505", message: "Duplicate key" } });
          } else {
            // Fetch existing itinerary
            return createQueryBuilder({ data: mockExistingItinerary, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await startGeneration(mockSupabase, userId, noteId, requestId);

      expect(result.itinerary_id).toBe("existing-itinerary-id");
      expect(result.version).toBe(2);
      expect(result.status).toBe("completed");
    });

    it("should throw error when idempotency lookup fails", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else if (callCount === 3) {
            return createQueryBuilder({ data: null, error: null });
          } else if (callCount === 4) {
            return createQueryBuilder({ data: null, error: null });
          } else if (callCount === 5) {
            return createQueryBuilder({ data: null, error: { code: "23505", message: "Duplicate key" } });
          } else {
            return createQueryBuilder({ data: null, error: { message: "Lookup failed" } });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(
        "Failed to retrieve existing itinerary"
      );
    });

    it("should throw error when no data returned from insert", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockPrefs = {
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null });
          } else if (callCount === 2) {
            return createQueryBuilder({ data: mockPrefs, error: null });
          } else if (callCount === 3) {
            return createQueryBuilder({ data: null, error: null });
          } else if (callCount === 4) {
            return createQueryBuilder({ data: null, error: null });
          } else {
            return createQueryBuilder({ data: null, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(startGeneration(mockSupabase, userId, noteId, requestId)).rejects.toThrow(
        "No data returned from insert operation"
      );
    });
  });

  describe("listByNote", () => {
    const userId = "test-user-id";
    const noteId = "test-note-id";

    it("should successfully list itineraries for a note", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockItineraries = [
        {
          itinerary_id: "itinerary-1",
          note_id: noteId,
          user_id: userId,
          version: 3,
          status: "completed",
          summary_json: {},
          gpx_metadata: null,
          request_id: "request-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          itinerary_id: "itinerary-2",
          note_id: noteId,
          user_id: userId,
          version: 2,
          status: "completed",
          summary_json: {},
          gpx_metadata: null,
          request_id: "request-2",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // Note verification
            return createQueryBuilder({ data: mockNote, error: null }, false);
          } else {
            // List itineraries
            return createQueryBuilder({ data: mockItineraries, error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await listByNote(mockSupabase, userId, noteId, { limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].itinerary_id).toBe("itinerary-1");
      expect(result.data[0].version).toBe(3);
      expect(result.data[1].version).toBe(2);
    });

    it("should successfully list itineraries with status filter", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockItineraries = [
        {
          itinerary_id: "itinerary-1",
          note_id: noteId,
          user_id: userId,
          version: 1,
          status: "pending",
          summary_json: {},
          gpx_metadata: null,
          request_id: "request-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null }, false);
          } else {
            return createQueryBuilder({ data: mockItineraries, error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await listByNote(mockSupabase, userId, noteId, { status: "pending", limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe("pending");
    });

    it("should return empty list when no itineraries exist", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null }, false);
          } else {
            return createQueryBuilder({ data: [], error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await listByNote(mockSupabase, userId, noteId, { limit: 20 });

      expect(result.data).toHaveLength(0);
    });

    it("should throw NoteNotFoundError when note does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { message: "Not found" } })),
      } as unknown as SupabaseClient;

      await expect(listByNote(mockSupabase, userId, noteId, { limit: 20 })).rejects.toThrow(NoteNotFoundError);
    });

    it("should throw NoteNotFoundError when note is deleted", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: null })),
      } as unknown as SupabaseClient;

      await expect(listByNote(mockSupabase, userId, noteId, { limit: 20 })).rejects.toThrow(NoteNotFoundError);
      await expect(listByNote(mockSupabase, userId, noteId, { limit: 20 })).rejects.toThrow(
        "Note not found or has been deleted"
      );
    });

    it("should throw NoteNotFoundError when user does not own note", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: "different-user-id",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockNote, error: null })),
      } as unknown as SupabaseClient;

      await expect(listByNote(mockSupabase, userId, noteId, { limit: 20 })).rejects.toThrow(NoteNotFoundError);
    });

    it("should throw error when listing itineraries fails", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: { message: "Database error" } }, true);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(listByNote(mockSupabase, userId, noteId, { limit: 20 })).rejects.toThrow(
        "Failed to list itineraries"
      );
    });

    it("should throw error when no data returned from list", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(listByNote(mockSupabase, userId, noteId, { limit: 20 })).rejects.toThrow(
        "No data returned from list operation"
      );
    });

    it("should respect limit parameter", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
      };

      const mockItineraries = Array.from({ length: 5 }, (_, i) => ({
        itinerary_id: `itinerary-${i}`,
        note_id: noteId,
        user_id: userId,
        version: i + 1,
        status: "completed",
        summary_json: {},
        gpx_metadata: null,
        request_id: `request-${i}`,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }));

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNote, error: null }, false);
          } else {
            return createQueryBuilder({ data: mockItineraries, error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await listByNote(mockSupabase, userId, noteId, { limit: 5 });

      expect(result.data).toHaveLength(5);
    });
  });

  describe("getById", () => {
    const userId = "test-user-id";
    const itineraryId = "test-itinerary-id";

    it("should successfully retrieve an itinerary by id", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        note_id: "test-note-id",
        user_id: userId,
        version: 2,
        status: "completed",
        summary_json: {
          title: "Test Itinerary",
          days: [],
          total_distance_km: 100,
          total_duration_h: 2,
          highlights: [],
        },
        gpx_metadata: {
          waypoint_count: 10,
          route_name: "Test Route",
        },
        request_id: "test-request-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      const result = await getById(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.version).toBe(2);
      expect(result.status).toBe("completed");
      expect(result.summary_json.title).toBe("Test Itinerary");
      expect(result.gpx_metadata?.waypoint_count).toBe(10);
    });

    it("should throw ItineraryNotFoundError when itinerary does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(getById(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
      await expect(getById(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Itinerary not found or has been deleted"
      );
    });

    it("should throw ItineraryNotFoundError when itinerary is deleted", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(getById(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw ItineraryNotFoundError when user does not own itinerary", async () => {
      // RLS will return null for rows the user doesn't own
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(getById(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw error on database failure", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database error" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(getById(mockSupabase, userId, itineraryId)).rejects.toThrow("Failed to fetch itinerary");
    });

    it("should return complete itinerary with all fields", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        note_id: "test-note-id",
        user_id: userId,
        version: 1,
        status: "pending",
        summary_json: {},
        gpx_metadata: null,
        request_id: "test-request-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      const result = await getById(mockSupabase, userId, itineraryId);

      expect(result).toHaveProperty("itinerary_id");
      expect(result).toHaveProperty("note_id");
      expect(result).toHaveProperty("user_id");
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("summary_json");
      expect(result).toHaveProperty("gpx_metadata");
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("updated_at");
      expect(result).not.toHaveProperty("deleted_at");
    });
  });

  describe("softDelete", () => {
    const userId = "test-user-id";
    const itineraryId = "test-itinerary-id";

    it("should successfully soft-delete a completed itinerary", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "completed",
      };

      const mockDeletedItinerary = {
        itinerary_id: itineraryId,
        deleted_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // Fetch itinerary to check status
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            // Update with deleted_at
            return createQueryBuilder({ data: mockDeletedItinerary, error: null }, false);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await softDelete(mockSupabase, userId, itineraryId);

      expect(result.success).toBe(true);
      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.deleted_at).toBe("2024-01-01T00:00:00Z");
    });

    it("should successfully soft-delete a failed itinerary", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "failed",
      };

      const mockDeletedItinerary = {
        itinerary_id: itineraryId,
        deleted_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: mockDeletedItinerary, error: null }, false);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await softDelete(mockSupabase, userId, itineraryId);

      expect(result.success).toBe(true);
      expect(result.itinerary_id).toBe(itineraryId);
    });

    it("should successfully soft-delete a cancelled itinerary", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "cancelled",
      };

      const mockDeletedItinerary = {
        itinerary_id: itineraryId,
        deleted_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: mockDeletedItinerary, error: null }, false);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await softDelete(mockSupabase, userId, itineraryId);

      expect(result.success).toBe(true);
    });

    it("should throw CannotDeleteNonTerminalError when itinerary is pending", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "pending",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(CannotDeleteNonTerminalError);
      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Cannot delete itinerary with status 'pending'"
      );
    });

    it("should throw CannotDeleteNonTerminalError when itinerary is running", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "running",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(CannotDeleteNonTerminalError);
      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Cannot delete itinerary with status 'running'"
      );
    });

    it("should throw ItineraryNotFoundError when itinerary does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Itinerary not found or has been deleted"
      );
    });

    it("should throw ItineraryNotFoundError when itinerary is already deleted", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw ItineraryNotFoundError when user does not own itinerary", async () => {
      // RLS will return null for rows the user doesn't own
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw error when fetch fails with database error", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database error" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow("Failed to fetch itinerary");
    });

    it("should throw error when update fails with database error", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "completed",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database error" } }, false);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow("Failed to delete itinerary");
    });

    it("should throw ItineraryNotFoundError when update returns no data", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "completed",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: null }, false);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw ItineraryNotFoundError when update returns PGRST116 (already deleted)", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "completed",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
      await expect(softDelete(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Itinerary not found or has been deleted"
      );
    });
  });

  describe("getStatus", () => {
    const userId = "test-user-id";
    const itineraryId = "test-itinerary-id";

    it("should return pending status with minimal fields", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "pending",
        summary_json: {},
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      const result = await getStatus(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.status).toBe("pending");
      expect(result).not.toHaveProperty("summary_json");
      expect(result).not.toHaveProperty("progress");
      expect(result).not.toHaveProperty("message");
    });

    it("should return running status with minimal fields", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "running",
        summary_json: {},
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      const result = await getStatus(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.status).toBe("running");
      expect(result).not.toHaveProperty("summary_json");
    });

    it("should return completed status with full summary_json", async () => {
      const mockSummaryJson = {
        title: "Test Itinerary",
        days: [
          {
            day: 1,
            segments: [
              {
                name: "Segment 1",
                description: "Test segment",
                distance_km: 50,
                duration_h: 1.5,
              },
            ],
          },
        ],
        total_distance_km: 50,
        total_duration_h: 1.5,
        highlights: ["Test highlight"],
      };

      const mockRouteGeoJSON = {
        type: "FeatureCollection" as const,
        properties: {
          title: "Test Itinerary",
          total_distance_km: 50,
          total_duration_h: 1.5,
          highlights: ["Test highlight"],
        },
        features: [],
      };

      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "completed",
        route_geojson: mockRouteGeoJSON,
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      const result = await getStatus(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.status).toBe("completed");
      if (result.status === "completed") {
        expect(result.route_geojson).toEqual(mockRouteGeoJSON);
        expect(result.route_geojson.properties.title).toBe("Test Itinerary");
        expect(result.route_geojson.properties.total_distance_km).toBe(50);
        expect(result.route_geojson.properties.total_duration_h).toBe(1.5);
      }
    });

    it("should return failed status with minimal fields", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "failed",
        summary_json: {},
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      const result = await getStatus(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.status).toBe("failed");
      expect(result).not.toHaveProperty("summary_json");
    });

    it("should return cancelled status with cancelled_at timestamp", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "cancelled",
        summary_json: {},
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      const result = await getStatus(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.status).toBe("cancelled");
      if (result.status === "cancelled") {
        expect(result.cancelled_at).toBe("2024-01-01T00:00:00Z");
      }
    });

    it("should throw ItineraryNotFoundError when itinerary does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(getStatus(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
      await expect(getStatus(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Itinerary not found or has been deleted"
      );
    });

    it("should throw ItineraryNotFoundError when itinerary is deleted", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(getStatus(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw ItineraryNotFoundError when user does not own itinerary", async () => {
      // RLS will return null for rows the user doesn't own
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(getStatus(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw error on database failure", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database error" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(getStatus(mockSupabase, userId, itineraryId)).rejects.toThrow("Failed to fetch itinerary status");
    });

    it("should handle all status variants correctly", async () => {
      const statuses: ("pending" | "running" | "completed" | "failed" | "cancelled")[] = [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ];

      for (const status of statuses) {
        const mockItinerary = {
          itinerary_id: itineraryId,
          status,
          summary_json:
            status === "completed"
              ? {
                  title: "Test",
                  days: [],
                  total_distance_km: 100,
                  total_duration_h: 2,
                  highlights: [],
                }
              : {},
          updated_at: "2024-01-01T00:00:00Z",
        };

        const mockSupabase = {
          from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
        } as unknown as SupabaseClient;

        const result = await getStatus(mockSupabase, userId, itineraryId);

        expect(result.status).toBe(status);
        expect(result.itinerary_id).toBe(itineraryId);
      }
    });
  });

  describe("cancelGeneration", () => {
    const userId = "test-user-id";
    const itineraryId = "test-itinerary-id";

    it("should successfully cancel a pending itinerary", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "pending",
      };

      const mockCancelledItinerary = {
        itinerary_id: itineraryId,
        status: "cancelled",
        updated_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // Fetch itinerary to check status
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            // Update status to cancelled
            return createQueryBuilder({ data: mockCancelledItinerary, error: null }, false);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await cancelGeneration(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.status).toBe("cancelled");
      expect(result.cancelled_at).toBe("2024-01-01T00:00:00Z");
    });

    it("should successfully cancel a running itinerary", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "running",
      };

      const mockCancelledItinerary = {
        itinerary_id: itineraryId,
        status: "cancelled",
        updated_at: "2024-01-01T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: mockCancelledItinerary, error: null }, false);
          }
        }),
      } as unknown as SupabaseClient;

      const result = await cancelGeneration(mockSupabase, userId, itineraryId);

      expect(result.itinerary_id).toBe(itineraryId);
      expect(result.status).toBe("cancelled");
    });

    it("should throw CannotCancelError when itinerary is completed", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "completed",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(CannotCancelError);
      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Cannot cancel itinerary with status 'completed'"
      );
    });

    it("should throw CannotCancelError when itinerary is failed", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "failed",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(CannotCancelError);
      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Cannot cancel itinerary with status 'failed'"
      );
    });

    it("should throw CannotCancelError when itinerary is already cancelled", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "cancelled",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockItinerary, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(CannotCancelError);
      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Cannot cancel itinerary with status 'cancelled'"
      );
    });

    it("should throw ItineraryNotFoundError when itinerary does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(
        "Itinerary not found or has been deleted"
      );
    });

    it("should throw ItineraryNotFoundError when itinerary is deleted", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: null }, false)),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw ItineraryNotFoundError when user does not own itinerary", async () => {
      // RLS will return null for rows the user doesn't own
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw error when fetch fails with database error", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database error" } }, false)
        ),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow("Failed to fetch itinerary");
    });

    it("should throw error when update fails with database error", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "pending",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database error" } }, false);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow("Failed to cancel itinerary");
    });

    it("should throw ItineraryNotFoundError when update returns no data", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "pending",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: null }, false);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });

    it("should throw ItineraryNotFoundError when update returns PGRST116", async () => {
      const mockItinerary = {
        itinerary_id: itineraryId,
        status: "running",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockItinerary, error: null }, false);
          } else {
            return createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } }, false);
          }
        }),
      } as unknown as SupabaseClient;

      await expect(cancelGeneration(mockSupabase, userId, itineraryId)).rejects.toThrow(ItineraryNotFoundError);
    });
  });
});
