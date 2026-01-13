import type { APIRoute } from "astro";
import { noteIdParamSchema, updateNoteSchema } from "../../../../lib/validators/notes";
import { getNoteById, updateNote, deleteNote } from "../../../../lib/services/notesService";
import { jsonResponse, errorResponse } from "../../../../lib/http";
import { logger } from "../../../../lib/logger";

/**
 * GET /api/notes/:noteId
 * Retrieves a single note by ID
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param noteId - UUID of the note to retrieve
 * @returns 200 NoteResponse | 400/401/403/404/500 ErrorResponse
 */
export const GET: APIRoute = async ({ locals, params }) => {
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
    const note = await getNoteById(locals.supabase, noteId, locals.user.id);
    return jsonResponse(200, note);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Handle specific error cases
    if (errorMsg === "NOTE_NOT_FOUND") {
      return errorResponse(404, "note_not_found", "Note not found or has been deleted");
    }

    logger.error({ err, noteId, userId: locals.user.id }, "Failed to fetch note");
    return errorResponse(500, "server_error", "Failed to fetch note");
  }
};

/**
 * PUT /api/notes/:noteId
 * Updates an existing note
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param noteId - UUID of the note to update
 * @body UpdateNoteRequest
 * @returns 200 NoteResponse | 400/401/403/404/409/500 ErrorResponse
 */
export const PUT: APIRoute = async ({ locals, params, request }) => {
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

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON body");
  }

  // Validate request body with Zod
  const parseResult = updateNoteSchema.safeParse(body);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};

    // Convert Zod error format to our error response format
    for (const [field, messages] of Object.entries(fieldErrors)) {
      details[field] = Array.isArray(messages) ? messages.join(", ") : String(messages);
    }

    return errorResponse(400, "validation_failed", "Validation errors", details);
  }

  // Update note
  try {
    const note = await updateNote(locals.supabase, noteId, locals.user.id, parseResult.data);
    return jsonResponse(200, note);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Handle specific error cases
    if (errorMsg === "NOTE_NOT_FOUND") {
      return errorResponse(404, "note_not_found", "Note not found or has been deleted");
    }

    if (errorMsg === "NOTE_TITLE_CONFLICT") {
      return errorResponse(
        409,
        "note_title_conflict",
        "A note with this title already exists. Please choose a different title."
      );
    }

    logger.error({ err, noteId, userId: locals.user.id, errorMessage: errorMsg }, "Failed to update note");

    // Return detailed error in dev mode
    if (import.meta.env.DEVENV) {
      return errorResponse(500, "server_error", `Failed to update note: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to update note");
  }
};

/**
 * DELETE /api/notes/:noteId
 * Soft-deletes a note (sets deleted_at timestamp)
 * Cascades delete to associated itineraries via database trigger
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param noteId - UUID of the note to delete
 * @returns 200 DeleteNoteResponse | 400/401/403/404/500 ErrorResponse
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
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
    const result = await deleteNote(locals.supabase, noteId, locals.user.id);
    return jsonResponse(200, result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Handle specific error cases
    if (errorMsg === "NOTE_NOT_FOUND") {
      return errorResponse(404, "note_not_found", "Note not found or has been deleted");
    }

    logger.error({ err, noteId, userId: locals.user.id }, "Failed to delete note");
    return errorResponse(500, "server_error", "Failed to delete note");
  }
};

export const prerender = false;
