import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./archive";
import type { APIContext } from "astro";
import type { SupabaseClient } from "../../../../db/supabase.client";

// Mock the service functions
vi.mock("../../../../lib/services/notesService", () => ({
  archiveNote: vi.fn(),
}));

// Mock the logger
vi.mock("../../../../lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { archiveNote } from "../../../../lib/services/notesService";

describe("POST /api/notes/:noteId/archive", () => {
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

    const response = await POST(context);
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

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_parameter");
  });

  it("should return 200 with archived note data on success", async () => {
    const mockArchivedNote = {
      note_id: noteId,
      archived_at: "2024-01-02T00:00:00Z",
    };

    vi.mocked(archiveNote).mockResolvedValue(mockArchivedNote);

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockArchivedNote);
    expect(archiveNote).toHaveBeenCalledWith(mockSupabase, noteId, mockUser.id);
  });

  it("should return 200 with current state if note is already archived (idempotent)", async () => {
    const mockArchivedNote = {
      note_id: noteId,
      archived_at: "2024-01-01T12:00:00Z",
    };

    vi.mocked(archiveNote).mockResolvedValue(mockArchivedNote);

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockArchivedNote);
  });

  it("should return 404 if note is not found", async () => {
    vi.mocked(archiveNote).mockRejectedValue(new Error("NOTE_NOT_FOUND"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("note_not_found");
  });

  it("should return 404 if note belongs to another user", async () => {
    vi.mocked(archiveNote).mockRejectedValue(new Error("NOTE_NOT_FOUND"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("note_not_found");
  });

  it("should return 500 on unexpected errors", async () => {
    vi.mocked(archiveNote).mockRejectedValue(new Error("Database connection failed"));

    const context = {
      locals: {
        supabase: mockSupabase,
        user: mockUser,
      },
      params: { noteId },
    } as unknown as APIContext;

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("server_error");
  });
});
