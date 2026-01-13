import type { APIRoute } from "astro";
import { createNoteSchema, listNotesQuerySchema } from "../../../lib/validators/notes";
import { createNote, listNotes } from "../../../lib/services/notesService";
import { jsonResponse, errorResponse } from "../../../lib/http";
import { logger } from "../../../lib/logger";

/**
 * GET /api/notes
 * Retrieves paginated list of user's notes with optional filtering
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20, max: 100)
 * @query search - Full-text search query (max 250 chars)
 * @query archived - Include archived notes (default: false)
 * @query sort - Sort field: updated_at | created_at | title (default: updated_at)
 * @query order - Sort order: asc | desc (default: desc)
 * @returns 200 NotesPaginatedResponse | 400/401/404/500 ErrorResponse
 */
export const GET: APIRoute = async ({ locals, url }) => {
  // Check authentication
  if (!locals.user) {
    return errorResponse(401, "unauthenticated", "Login required");
  }

  // Parse and validate query parameters
  const queryParams = {
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
    search: url.searchParams.get("search") || undefined,
    archived: url.searchParams.get("archived") || undefined,
    sort: url.searchParams.get("sort") || undefined,
    order: url.searchParams.get("order") || undefined,
  };

  const parseResult = listNotesQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};

    // Convert Zod error format to our error response format
    for (const [field, messages] of Object.entries(fieldErrors)) {
      details[field] = Array.isArray(messages) ? messages.join(", ") : String(messages);
    }

    return errorResponse(400, "validation_failed", "Invalid query parameters", details);
  }

  try {
    const result = await listNotes(locals.supabase, locals.user.id, parseResult.data);

    // Check if requested page exceeds total pages
    if (result.pagination.page > result.pagination.total_pages && result.pagination.total > 0) {
      return errorResponse(
        404,
        "page_not_found",
        `Page ${result.pagination.page} exceeds total pages (${result.pagination.total_pages})`
      );
    }

    return jsonResponse(200, result);
  } catch (err) {
    logger.error({ err, userId: locals.user.id }, "Failed to list notes");
    return errorResponse(500, "server_error", "Failed to fetch notes");
  }
};

/**
 * POST /api/notes
 * Creates a new note for the authenticated user
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @requires User preferences must be set
 * @body CreateNoteRequest
 * @returns 201 NoteResponse | 400/401/403/409/500 ErrorResponse
 */
export const POST: APIRoute = async ({ locals, request }) => {
  // Check authentication
  if (!locals.user) {
    return errorResponse(401, "unauthenticated", "Login required");
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON body");
  }

  // Validate request body with Zod
  const parseResult = createNoteSchema.safeParse(body);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};

    // Convert Zod error format to our error response format
    for (const [field, messages] of Object.entries(fieldErrors)) {
      details[field] = Array.isArray(messages) ? messages.join(", ") : String(messages);
    }

    return errorResponse(400, "validation_failed", "Validation errors", details);
  }

  // Create note
  try {
    const note = await createNote(locals.supabase, locals.user.id, parseResult.data);
    return jsonResponse(201, note);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Handle specific error cases
    if (errorMsg === "PREFERENCES_INCOMPLETE") {
      return errorResponse(
        403,
        "preferences_incomplete",
        "User preferences must be set before creating notes. Please complete your profile first."
      );
    }

    if (errorMsg === "NOTE_TITLE_CONFLICT") {
      return errorResponse(
        409,
        "note_title_conflict",
        "A note with this title already exists. Please choose a different title."
      );
    }

    logger.error({ err, userId: locals.user.id, errorMessage: errorMsg }, "Failed to create note");

    // Return detailed error in dev mode
    if (import.meta.env.DEVENV) {
      return errorResponse(500, "server_error", `Failed to create note: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to create note");
  }
};

export const prerender = false;
