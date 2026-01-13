import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "./index";
import type { APIContext } from "astro";
import type { SupabaseClient } from "../../../../db/supabase.client";

// Mock the service functions
vi.mock("../../../../lib/services/notesService", () => ({
  getNoteById: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

// Mock the logger
vi.mock("../../../../lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { getNoteById, updateNote, deleteNote } from "../../../../lib/services/notesService";

describe("GET /api/notes/:noteId", () => {
  const mockSupabase = {} as SupabaseClient;
  const mockUser = { id: "550e8400-e29b-41d4-a716-446655440001" };
  const noteId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: null,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthenticated");
  });

  it("should return 400 if noteId is not a valid UUID", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId: "invalid-uuid" },
    } as unknown as APIContext;

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_parameter");
  });

  it("should return 200 with note data on success", async () => {
    const mockNote = {
      note_id: noteId,
      user_id: mockUser.id,
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

    vi.mocked(getNoteById).mockResolvedValue(mockNote);

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockNote);
    expect(getNoteById).toHaveBeenCalledWith(mockSupabase, noteId, mockUser.id);
  });

  it("should return 404 if note is not found", async () => {
    vi.mocked(getNoteById).mockRejectedValue(new Error("NOTE_NOT_FOUND"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("note_not_found");
  });

  it("should return 500 on unexpected errors", async () => {
    vi.mocked(getNoteById).mockRejectedValue(new Error("Database connection failed"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("server_error");
  });
});

describe("PUT /api/notes/:noteId", () => {
  const mockSupabase = {} as SupabaseClient;
  const mockUser = { id: "550e8400-e29b-41d4-a716-446655440001" };
  const noteId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: null,
      },
      params: { noteId },
      request: new Request(`http://localhost/api/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title",
          note_text: "Updated text for the note.",
          trip_prefs: {},
        }),
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthenticated");
  });

  it("should return 400 if noteId is not a valid UUID", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId: "invalid-uuid" },
      request: new Request("http://localhost/api/notes/invalid-uuid", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title",
          note_text: "Updated text for the note.",
          trip_prefs: {},
        }),
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_parameter");
  });

  it("should return 400 if request body is malformed JSON", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
      request: new Request(`http://localhost/api/notes/${noteId}`, {
        method: "PUT",
        body: "invalid json",
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_json");
  });

  it("should return 400 if validation fails", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
      request: new Request(`http://localhost/api/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: "", // Invalid: empty title
          note_text: "Updated text for the note.",
          trip_prefs: {},
        }),
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation_failed");
    expect(body.details).toBeDefined();
  });

  it("should return 200 with updated note on success", async () => {
    const updateInput = {
      title: "Updated Weekend Ride",
      note_text: "Updated description of the scenic ride through the mountains.",
      trip_prefs: {
        terrain: "mixed" as const,
        road_type: "twisty" as const,
      },
    };

    const mockUpdatedNote = {
      note_id: noteId,
      user_id: mockUser.id,
      title: updateInput.title,
      note_text: updateInput.note_text,
      trip_prefs: updateInput.trip_prefs,
      ai_summary: null,
      distance_km: null,
      duration_h: null,
      terrain: null,
      road_type: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      archived_at: null,
    };

    vi.mocked(updateNote).mockResolvedValue(mockUpdatedNote);

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
      request: new Request(`http://localhost/api/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify(updateInput),
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockUpdatedNote);
    expect(updateNote).toHaveBeenCalledWith(mockSupabase, noteId, mockUser.id, updateInput);
  });

  it("should return 404 if note is not found", async () => {
    vi.mocked(updateNote).mockRejectedValue(new Error("NOTE_NOT_FOUND"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
      request: new Request(`http://localhost/api/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title",
          note_text: "Updated text for the note.",
          trip_prefs: {},
        }),
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("note_not_found");
  });

  it("should return 409 on title conflict", async () => {
    vi.mocked(updateNote).mockRejectedValue(new Error("NOTE_TITLE_CONFLICT"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
      request: new Request(`http://localhost/api/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: "Existing Title",
          note_text: "Updated text for the note.",
          trip_prefs: {},
        }),
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("note_title_conflict");
  });

  it("should return 500 on unexpected errors", async () => {
    vi.mocked(updateNote).mockRejectedValue(new Error("Database connection failed"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
      request: new Request(`http://localhost/api/notes/${noteId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Title",
          note_text: "Updated text for the note.",
          trip_prefs: {},
        }),
      }),
    } as unknown as APIContext;

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("server_error");
  });
});

describe("DELETE /api/notes/:noteId", () => {
  const mockSupabase = {} as SupabaseClient;
  const mockUser = { id: "550e8400-e29b-41d4-a716-446655440001" };
  const noteId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: null,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthenticated");
  });

  it("should return 400 if noteId is not a valid UUID", async () => {
    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId: "invalid-uuid" },
    } as unknown as APIContext;

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_parameter");
  });

  it("should return 200 with delete confirmation on success", async () => {
    const mockDeleteResult = {
      success: true as const,
      note_id: noteId,
      deleted_at: "2024-01-02T00:00:00Z",
    };

    vi.mocked(deleteNote).mockResolvedValue(mockDeleteResult);

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockDeleteResult);
    expect(deleteNote).toHaveBeenCalledWith(mockSupabase, noteId, mockUser.id);
  });

  it("should return 404 if note is not found", async () => {
    vi.mocked(deleteNote).mockRejectedValue(new Error("NOTE_NOT_FOUND"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("note_not_found");
  });

  it("should return 500 on unexpected errors", async () => {
    vi.mocked(deleteNote).mockRejectedValue(new Error("Database connection failed"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("server_error");
  });
});
