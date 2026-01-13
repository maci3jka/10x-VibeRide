import type { APIRoute } from "astro";
import { noteIdParamSchema } from "../../../../lib/validators/notes";
import { unarchiveNote } from "../../../../lib/services/notesService";
import { jsonResponse, errorResponse } from "../../../../lib/http";
import { logger } from "../../../../lib/logger";

export const prerender = false;

/**
 * POST /api/notes/:noteId/unarchive
 * Unarchives a note by clearing archived_at timestamp
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param noteId - UUID of the note to unarchive
 * @returns 200 UnarchiveNoteResponse | 400/401/403/404/500 ErrorResponse
 */
export const POST: APIRoute = async ({ locals, params }) => {
  // Check authentication
  if (!locals.user) {
    return errorResponse(401, "unauthenticated", "Login required");
  }

  // Validate noteId parameter
  const noteIdResult = noteIdParamSchema.safeParse(params.noteId);
  if (!noteIdResult.success) {
    return errorResponse(400, "invalid_parameter", "Invalid note ID format");
  }

  const noteId = noteIdResult.data;

  try {
    const result = await unarchiveNote(locals.supabase, noteId, locals.user.id);
    return jsonResponse(200, result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Handle specific error cases
    if (errorMsg === "NOTE_NOT_FOUND") {
      return errorResponse(404, "note_not_found", "Note not found or has been deleted");
    }

    logger.error({ err, noteId, userId: locals.user.id }, "Failed to unarchive note");
    return errorResponse(500, "server_error", "Failed to unarchive note");
  }
};
