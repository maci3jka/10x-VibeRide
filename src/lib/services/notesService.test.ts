import { describe, it, expect, vi } from "vitest";
import { listNotes, createNote, getNoteById, updateNote, deleteNote, archiveNote, unarchiveNote } from "./notesService";
import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateNoteInput, UpdateNoteInput, ListNotesQueryInput } from "../validators/notes";

// Helper to create a mock query builder chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createQueryBuilder = (finalResult: any, isItinerariesQuery = false) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    is: vi.fn(function (this: any) {
      // For itineraries query, is() is terminal and returns a promise
      // For notes query, is() returns the builder for further chaining
      if (isItinerariesQuery) {
        return Promise.resolve(finalResult);
      }
      return this;
    }),
    not: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(finalResult),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  };
  return builder;
};

describe("notesService", () => {
  describe("listNotes", () => {
    const userId = "test-user-id";

    it("should successfully list notes with default parameters", async () => {
      const mockNotes = [
        {
          note_id: "note-1",
          title: "Test Note 1",
          note_text: "This is a test note for our ride.",
          trip_prefs: {},
          distance_km: null,
          duration_h: null,
          terrain: null,
          road_type: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          archived_at: null,
        },
      ];

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNotes, error: null, count: 1 }, false);
          } else {
            // itineraries table
            return createQueryBuilder({ data: [], error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const params: ListNotesQueryInput = {
        page: 1,
        limit: 20,
        archived: false,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listNotes(mockSupabase, userId, params);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].note_id).toBe("note-1");
      expect(result.data[0].has_itinerary).toBe(false);
      expect(result.data[0].itinerary_count).toBe(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        total_pages: 1,
      });
    });

    it("should include itinerary counts", async () => {
      const mockNotes = [
        {
          note_id: "note-1",
          title: "Test Note 1",
          note_text: "This is a test note for our ride.",
          trip_prefs: {},
          distance_km: null,
          duration_h: null,
          terrain: null,
          road_type: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          archived_at: null,
        },
      ];

      const mockItineraries = [{ note_id: "note-1" }, { note_id: "note-1" }, { note_id: "note-1" }];

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: notes query
            return createQueryBuilder({ data: mockNotes, error: null, count: 1 }, false);
          } else {
            // Second call: itineraries query
            return createQueryBuilder({ data: mockItineraries, error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const params: ListNotesQueryInput = {
        page: 1,
        limit: 20,
        archived: false,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listNotes(mockSupabase, userId, params);

      expect(result.data[0].has_itinerary).toBe(true);
      expect(result.data[0].itinerary_count).toBe(3);
    });

    it("should handle pagination correctly", async () => {
      const mockNotes = Array.from({ length: 10 }, (_, i) => ({
        note_id: `note-${i}`,
        title: `Test Note ${i}`,
        note_text: "This is a test note for our ride.",
        trip_prefs: {},
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      }));

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockNotes, error: null, count: 45 }, false);
          } else {
            return createQueryBuilder({ data: [], error: null }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const params: ListNotesQueryInput = {
        page: 2,
        limit: 10,
        archived: false,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listNotes(mockSupabase, userId, params);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        total_pages: 5,
      });
    });

    it("should handle empty results", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: [], error: null, count: 0 }, false)),
      } as unknown as SupabaseClient;

      const params: ListNotesQueryInput = {
        page: 1,
        limit: 20,
        archived: false,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listNotes(mockSupabase, userId, params);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.total_pages).toBe(0);
    });

    it("should throw error on database failure", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { message: "Database error" }, count: null }, false)),
      } as unknown as SupabaseClient;

      const params: ListNotesQueryInput = {
        page: 1,
        limit: 20,
        archived: false,
        sort: "updated_at",
        order: "desc",
      };

      await expect(listNotes(mockSupabase, userId, params)).rejects.toThrow("Failed to list notes");
    });

    it("should throw error when itinerary count query fails", async () => {
      const mockNotes = [
        {
          note_id: "note-1",
          title: "Test Note 1",
          note_text: "This is a test note for our ride.",
          trip_prefs: {},
          distance_km: null,
          duration_h: null,
          terrain: null,
          road_type: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          archived_at: null,
        },
      ];

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: notes query succeeds
            return createQueryBuilder({ data: mockNotes, error: null, count: 1 }, false);
          } else {
            // Second call: itineraries query fails
            return createQueryBuilder({ data: null, error: { message: "Database error" } }, true);
          }
        }),
      } as unknown as SupabaseClient;

      const params: ListNotesQueryInput = {
        page: 1,
        limit: 20,
        archived: false,
        sort: "updated_at",
        order: "desc",
      };

      await expect(listNotes(mockSupabase, userId, params)).rejects.toThrow("Failed to fetch itinerary counts");
    });
  });

  describe("createNote", () => {
    const userId = "test-user-id";

    it("should successfully create a note", async () => {
      const input: CreateNoteInput = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains with stops at various viewpoints.",
        trip_prefs: {
          terrain: "paved",
          road_type: "scenic",
        },
      };

      const mockCreatedNote = {
        note_id: "new-note-id",
        user_id: userId,
        title: input.title,
        note_text: input.note_text,
        trip_prefs: input.trip_prefs,
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
        deleted_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // Preferences check
            return createQueryBuilder({ data: { user_id: userId }, error: null });
          } else {
            // Note insert
            return createQueryBuilder({ data: mockCreatedNote, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await createNote(mockSupabase, userId, input);

      expect(result.note_id).toBe("new-note-id");
      expect(result.title).toBe(input.title);
      expect(result.note_text).toBe(input.note_text);
      expect(result.trip_prefs).toEqual(input.trip_prefs);
      expect(result).not.toHaveProperty("deleted_at");
    });

    it("should create note with empty trip_prefs when not provided", async () => {
      const input: CreateNoteInput = {
        title: "Quick Loop",
        note_text: "Short evening ride around the local area for some fresh air.",
        trip_prefs: {},
      };

      const mockCreatedNote = {
        note_id: "new-note-id",
        user_id: userId,
        title: input.title,
        note_text: input.note_text,
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
        deleted_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: { user_id: userId }, error: null });
          } else {
            return createQueryBuilder({ data: mockCreatedNote, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await createNote(mockSupabase, userId, input);

      expect(result.trip_prefs).toEqual({});
    });

    it("should throw PREFERENCES_INCOMPLETE when user has no preferences", async () => {
      const input: CreateNoteInput = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains with stops at various viewpoints.",
        trip_prefs: {},
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(createNote(mockSupabase, userId, input)).rejects.toThrow("PREFERENCES_INCOMPLETE");
    });

    it("should throw NOTE_TITLE_CONFLICT on duplicate title", async () => {
      const input: CreateNoteInput = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains with stops at various viewpoints.",
        trip_prefs: {},
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: { user_id: userId }, error: null });
          } else {
            return createQueryBuilder({
              data: null,
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "notes_user_id_title_key"',
              },
            });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(createNote(mockSupabase, userId, input)).rejects.toThrow("NOTE_TITLE_CONFLICT");
    });

    it("should throw generic error on database failure during preferences check", async () => {
      const input: CreateNoteInput = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains with stops at various viewpoints.",
        trip_prefs: {},
      };

      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database connection failed" } })
        ),
      } as unknown as SupabaseClient;

      await expect(createNote(mockSupabase, userId, input)).rejects.toThrow("Failed to check user preferences");
    });

    it("should throw generic error on database failure during insert", async () => {
      const input: CreateNoteInput = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains with stops at various viewpoints.",
        trip_prefs: {},
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: { user_id: userId }, error: null });
          } else {
            return createQueryBuilder({
              data: null,
              error: { code: "OTHER_ERROR", message: "Database connection failed" },
            });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(createNote(mockSupabase, userId, input)).rejects.toThrow("Failed to create note");
    });

    it("should throw error when no data returned from insert", async () => {
      const input: CreateNoteInput = {
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains with stops at various viewpoints.",
        trip_prefs: {},
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: { user_id: userId }, error: null });
          } else {
            return createQueryBuilder({ data: null, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(createNote(mockSupabase, userId, input)).rejects.toThrow("No data returned from insert operation");
    });
  });

  describe("getNoteById", () => {
    const userId = "test-user-id";
    const noteId = "test-note-id";

    it("should successfully retrieve a note by ID", async () => {
      const mockNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: { terrain: "paved" },
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockNote, error: null })),
      } as unknown as SupabaseClient;

      const result = await getNoteById(mockSupabase, noteId, userId);

      expect(result.note_id).toBe(noteId);
      expect(result.title).toBe("Weekend Ride");
      expect(result).not.toHaveProperty("deleted_at");
    });

    it("should throw NOTE_NOT_FOUND when note does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(getNoteById(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw NOTE_NOT_FOUND when note is deleted", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(getNoteById(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw NOTE_NOT_FOUND when note belongs to another user", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(getNoteById(mockSupabase, noteId, "different-user-id")).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw generic error on database failure", async () => {
      const mockSupabase = {
        from: vi.fn(() =>
          createQueryBuilder({ data: null, error: { code: "OTHER_ERROR", message: "Database connection failed" } })
        ),
      } as unknown as SupabaseClient;

      await expect(getNoteById(mockSupabase, noteId, userId)).rejects.toThrow("Failed to fetch note");
    });

    it("should throw NOTE_NOT_FOUND when data is null without error", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: null })),
      } as unknown as SupabaseClient;

      await expect(getNoteById(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });
  });

  describe("updateNote", () => {
    const userId = "test-user-id";
    const noteId = "test-note-id";

    it("should successfully update a note", async () => {
      const input: UpdateNoteInput = {
        title: "Updated Weekend Ride",
        note_text: "Updated description of the scenic ride through the mountains.",
        trip_prefs: {
          terrain: "mixed",
          road_type: "twisty",
        },
      };

      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Original text",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      const mockUpdatedNote = {
        ...mockExistingNote,
        title: input.title,
        note_text: input.note_text,
        trip_prefs: input.trip_prefs,
        updated_at: "2024-01-02T00:00:00Z",
        deleted_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: getNoteById verification
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            // Second call: update
            return createQueryBuilder({ data: mockUpdatedNote, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await updateNote(mockSupabase, noteId, userId, input);

      expect(result.note_id).toBe(noteId);
      expect(result.title).toBe(input.title);
      expect(result.note_text).toBe(input.note_text);
      expect(result.trip_prefs).toEqual(input.trip_prefs);
      expect(result).not.toHaveProperty("deleted_at");
    });

    it("should throw NOTE_NOT_FOUND when note does not exist", async () => {
      const input: UpdateNoteInput = {
        title: "Updated Title",
        note_text: "Updated text for the note.",
        trip_prefs: {},
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(updateNote(mockSupabase, noteId, userId, input)).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw NOTE_TITLE_CONFLICT on duplicate title", async () => {
      const input: UpdateNoteInput = {
        title: "Existing Title",
        note_text: "Updated text for the note.",
        trip_prefs: {},
      };

      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Original Title",
        note_text: "Original text",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: getNoteById verification
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            // Second call: update with conflict
            return createQueryBuilder({
              data: null,
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "notes_user_id_title_key"',
              },
            });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(updateNote(mockSupabase, noteId, userId, input)).rejects.toThrow("NOTE_TITLE_CONFLICT");
    });

    it("should throw generic error on database failure during update", async () => {
      const input: UpdateNoteInput = {
        title: "Updated Title",
        note_text: "Updated text for the note.",
        trip_prefs: {},
      };

      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Original Title",
        note_text: "Original text",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            return createQueryBuilder({
              data: null,
              error: { code: "OTHER_ERROR", message: "Database connection failed" },
            });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(updateNote(mockSupabase, noteId, userId, input)).rejects.toThrow("Failed to update note");
    });

    it("should throw NOTE_NOT_FOUND when update returns no data", async () => {
      const input: UpdateNoteInput = {
        title: "Updated Title",
        note_text: "Updated text for the note.",
        trip_prefs: {},
      };

      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Original Title",
        note_text: "Original text",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            return createQueryBuilder({ data: null, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(updateNote(mockSupabase, noteId, userId, input)).rejects.toThrow("NOTE_NOT_FOUND");
    });
  });

  describe("deleteNote", () => {
    const userId = "test-user-id";
    const noteId = "test-note-id";

    it("should successfully soft-delete a note", async () => {
      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      const mockDeletedNote = {
        note_id: noteId,
        deleted_at: "2024-01-02T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: getNoteById verification
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            // Second call: soft delete
            return createQueryBuilder({ data: mockDeletedNote, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await deleteNote(mockSupabase, noteId, userId);

      expect(result.success).toBe(true);
      expect(result.note_id).toBe(noteId);
      expect(result.deleted_at).toBe("2024-01-02T00:00:00Z");
    });

    it("should throw NOTE_NOT_FOUND when note does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(deleteNote(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw NOTE_NOT_FOUND when note belongs to another user", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(deleteNote(mockSupabase, noteId, "different-user-id")).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw generic error on database failure during delete", async () => {
      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockExistingNote, error: null });
          }
          return createQueryBuilder({
            data: null,
            error: { code: "OTHER_ERROR", message: "Database connection failed" },
          });
        }),
      } as unknown as SupabaseClient;

      await expect(deleteNote(mockSupabase, noteId, userId)).rejects.toThrow("Failed to delete note");
    });

    it("should throw NOTE_NOT_FOUND when delete returns no data", async () => {
      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            return createQueryBuilder({ data: null, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(deleteNote(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });
  });

  describe("archiveNote", () => {
    const userId = "test-user-id";
    const noteId = "test-note-id";

    it("should successfully archive a note", async () => {
      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      const mockArchivedNote = {
        note_id: noteId,
        archived_at: "2024-01-02T00:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: getNoteById verification
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            // Second call: archive
            return createQueryBuilder({ data: mockArchivedNote, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await archiveNote(mockSupabase, noteId, userId);

      expect(result.note_id).toBe(noteId);
      expect(result.archived_at).toBe("2024-01-02T00:00:00Z");
    });

    it("should return current state if note is already archived (idempotent)", async () => {
      const mockArchivedNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: "2024-01-01T12:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockArchivedNote, error: null })),
      } as unknown as SupabaseClient;

      const result = await archiveNote(mockSupabase, noteId, userId);

      expect(result.note_id).toBe(noteId);
      expect(result.archived_at).toBe("2024-01-01T12:00:00Z");
      // Should only call getNoteById, not perform update
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should throw NOTE_NOT_FOUND when note does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(archiveNote(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw NOTE_NOT_FOUND when note belongs to another user", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(archiveNote(mockSupabase, noteId, "different-user-id")).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw generic error on database failure during archive", async () => {
      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockExistingNote, error: null });
          }
          return createQueryBuilder({
            data: null,
            error: { code: "OTHER_ERROR", message: "Database connection failed" },
          });
        }),
      } as unknown as SupabaseClient;

      await expect(archiveNote(mockSupabase, noteId, userId)).rejects.toThrow("Failed to archive note");
    });

    it("should throw NOTE_NOT_FOUND when archive returns no data", async () => {
      const mockExistingNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockExistingNote, error: null });
          } else {
            return createQueryBuilder({ data: null, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(archiveNote(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });
  });

  describe("unarchiveNote", () => {
    const userId = "test-user-id";
    const noteId = "test-note-id";

    it("should successfully unarchive a note", async () => {
      const mockArchivedNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: "2024-01-01T12:00:00Z",
      };

      const mockUnarchivedNote = {
        note_id: noteId,
        archived_at: null,
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: getNoteById verification
            return createQueryBuilder({ data: mockArchivedNote, error: null });
          } else {
            // Second call: unarchive
            return createQueryBuilder({ data: mockUnarchivedNote, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      const result = await unarchiveNote(mockSupabase, noteId, userId);

      expect(result.note_id).toBe(noteId);
      expect(result.archived_at).toBeNull();
    });

    it("should return current state if note is already unarchived (idempotent)", async () => {
      const mockUnarchivedNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: mockUnarchivedNote, error: null })),
      } as unknown as SupabaseClient;

      const result = await unarchiveNote(mockSupabase, noteId, userId);

      expect(result.note_id).toBe(noteId);
      expect(result.archived_at).toBeNull();
      // Should only call getNoteById, not perform update
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should throw NOTE_NOT_FOUND when note does not exist", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(unarchiveNote(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw NOTE_NOT_FOUND when note belongs to another user", async () => {
      const mockSupabase = {
        from: vi.fn(() => createQueryBuilder({ data: null, error: { code: "PGRST116", message: "No rows found" } })),
      } as unknown as SupabaseClient;

      await expect(unarchiveNote(mockSupabase, noteId, "different-user-id")).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw generic error on database failure during unarchive", async () => {
      const mockArchivedNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: "2024-01-01T12:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockArchivedNote, error: null });
          }
          return createQueryBuilder({
            data: null,
            error: { code: "OTHER_ERROR", message: "Database connection failed" },
          });
        }),
      } as unknown as SupabaseClient;

      await expect(unarchiveNote(mockSupabase, noteId, userId)).rejects.toThrow("Failed to unarchive note");
    });

    it("should throw NOTE_NOT_FOUND when unarchive returns no data", async () => {
      const mockArchivedNote = {
        note_id: noteId,
        user_id: userId,
        title: "Weekend Ride",
        note_text: "Planning a scenic ride through the mountains.",
        trip_prefs: {},
        ai_summary: null,
        distance_km: null,
        duration_h: null,
        terrain: null,
        road_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: "2024-01-01T12:00:00Z",
      };

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return createQueryBuilder({ data: mockArchivedNote, error: null });
          } else {
            return createQueryBuilder({ data: null, error: null });
          }
        }),
      } as unknown as SupabaseClient;

      await expect(unarchiveNote(mockSupabase, noteId, userId)).rejects.toThrow("NOTE_NOT_FOUND");
    });
  });
});
