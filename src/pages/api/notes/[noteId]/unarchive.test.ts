import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./unarchive";
import type { APIContext } from "astro";
import type { SupabaseClient } from "../../../../db/supabase.client";

// Mock the service functions
vi.mock("../../../../lib/services/notesService", () => ({
  unarchiveNote: vi.fn(),
}));

// Mock the logger
vi.mock("../../../../lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { unarchiveNote } from "../../../../lib/services/notesService";

describe("POST /api/notes/:noteId/unarchive", () => {
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

  it("should return 200 with unarchived note data on success", async () => {
    const mockUnarchivedNote = {
      note_id: noteId,
      archived_at: null,
    };

    vi.mocked(unarchiveNote).mockResolvedValue(mockUnarchivedNote);

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
    expect(body).toEqual(mockUnarchivedNote);
    expect(unarchiveNote).toHaveBeenCalledWith(mockSupabase, noteId, mockUser.id);
  });

  it("should return 200 with current state if note is already unarchived (idempotent)", async () => {
    const mockUnarchivedNote = {
      note_id: noteId,
      archived_at: null,
    };

    vi.mocked(unarchiveNote).mockResolvedValue(mockUnarchivedNote);

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
    expect(body).toEqual(mockUnarchivedNote);
  });

  it("should return 404 if note is not found", async () => {
    vi.mocked(unarchiveNote).mockRejectedValue(new Error("NOTE_NOT_FOUND"));

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
    vi.mocked(unarchiveNote).mockRejectedValue(new Error("NOTE_NOT_FOUND"));

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
    vi.mocked(unarchiveNote).mockRejectedValue(new Error("Database connection failed"));

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

