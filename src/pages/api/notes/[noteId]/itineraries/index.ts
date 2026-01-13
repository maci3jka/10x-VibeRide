import type { APIRoute } from "astro";
import { generateItinerarySchema, listItinerariesQuerySchema } from "../../../../../lib/validators/itinerary";
import {
  startGeneration,
  listByNote,
  GenerationInProgressError,
  NoteNotFoundError,
  PreferencesMissingError,
  SpendCapExceededError,
} from "../../../../../lib/services/itineraryService";
import { jsonResponse, errorResponse } from "../../../../../lib/http";
import { logger } from "../../../../../lib/logger";

/**
 * GET /api/notes/:noteId/itineraries
 * Lists all itinerary versions for a specific note
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param noteId UUID of the note (path parameter)
 * @query status Optional status filter (pending|running|completed|failed|cancelled)
 * @query limit Optional limit (default: 20, max: 100)
 * @returns 200 ItinerariesListResponse | 400/401/403/404/500 ErrorResponse
 */
export const GET: APIRoute = async ({ locals, params, url }) => {
  // Check authentication
  if (!locals.user) {
    return errorResponse(401, "unauthenticated", "Login required");
  }

  // Validate noteId path parameter
  const { noteId } = params;
  if (!noteId) {
    return errorResponse(400, "invalid_parameter", "Note ID is required");
  }

  // Validate UUID format for noteId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(noteId)) {
    return errorResponse(400, "invalid_parameter", "Note ID must be a valid UUID");
  }

  // Parse and validate query parameters
  const queryParams = {
    status: url.searchParams.get("status") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  };

  const parseResult = listItinerariesQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};

    for (const [field, messages] of Object.entries(fieldErrors)) {
      details[field] = Array.isArray(messages) ? messages.join(", ") : String(messages);
    }

    return errorResponse(400, "validation_failed", "Validation errors", details);
  }

  // List itineraries
  try {
    const result = await listByNote(locals.supabase, locals.user.id, noteId, parseResult.data);

    logger.info(
      {
        userId: locals.user.id,
        noteId,
        count: result.data.length,
        status: parseResult.data.status,
        limit: parseResult.data.limit,
      },
      "Listed itineraries for note"
    );

    return jsonResponse(200, result);
  } catch (err) {
    // Handle specific error types
    if (err instanceof NoteNotFoundError) {
      logger.info({ userId: locals.user.id, noteId }, "Note not found or access denied");
      return errorResponse(404, "note_not_found", err.message);
    }

    // Generic error
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId: locals.user.id, noteId, errorMessage: errorMsg }, "Failed to list itineraries");

    // Return detailed error in dev mode
    if (process.env.DEVENV === "true") {
      return errorResponse(500, "server_error", `Failed to list itineraries: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to list itineraries");
  }
};

/**
 * POST /api/notes/:noteId/itineraries
 * Starts AI-powered itinerary generation for an existing note
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @param noteId UUID of the note (path parameter)
 * @body GenerateItineraryRequest { request_id: uuid }
 * @returns 202 GenerateItineraryResponse | 400/401/403/404/409/429/500 ErrorResponse
 */
export const POST: APIRoute = async ({ locals, params, request }) => {
  // Check authentication
  if (!locals.user) {
    return errorResponse(401, "unauthenticated", "Login required");
  }

  // Validate noteId path parameter
  const { noteId } = params;
  if (!noteId) {
    return errorResponse(400, "invalid_parameter", "Note ID is required");
  }

  // Validate UUID format for noteId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(noteId)) {
    return errorResponse(400, "invalid_parameter", "Note ID must be a valid UUID");
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON body");
  }

  // Validate request body with Zod
  const parseResult = generateItinerarySchema.safeParse(body);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};

    // Convert Zod error format to our error response format
    for (const [field, messages] of Object.entries(fieldErrors)) {
      details[field] = Array.isArray(messages) ? messages.join(", ") : String(messages);
    }

    return errorResponse(400, "validation_failed", "Validation errors", details);
  }

  // Start generation
  try {
    const result = await startGeneration(locals.supabase, locals.user.id, noteId, parseResult.data.request_id);

    logger.info(
      {
        userId: locals.user.id,
        noteId,
        itineraryId: result.itinerary_id,
        requestId: parseResult.data.request_id,
      },
      "Itinerary generation started"
    );

    return jsonResponse(202, result);
  } catch (err) {
    // Handle specific error types
    if (err instanceof NoteNotFoundError) {
      logger.info({ userId: locals.user.id, noteId }, "Note not found or access denied");
      return errorResponse(404, "note_not_found", err.message);
    }

    if (err instanceof PreferencesMissingError) {
      logger.info({ userId: locals.user.id }, "User preferences missing");
      return errorResponse(403, "profile_incomplete", err.message);
    }

    if (err instanceof GenerationInProgressError) {
      logger.info({ userId: locals.user.id, activeRequestId: err.activeRequestId }, "Generation already in progress");
      return errorResponse(409, "generation_in_progress", err.message, {
        active_request_id: err.activeRequestId || "unknown",
      });
    }

    if (err instanceof SpendCapExceededError) {
      logger.info({ userId: locals.user.id }, "Monthly spend cap exceeded");
      return errorResponse(429, "service_limit_reached", err.message);
    }

    // Generic error
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId: locals.user.id, noteId, errorMessage: errorMsg }, "Failed to start generation");

    // Return detailed error in dev mode
    if (process.env.DEVENV === "true") {
      return errorResponse(500, "server_error", `Failed to start generation: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to start generation");
  }
};

export const prerender = false;
