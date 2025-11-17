import type { APIRoute } from "astro";
import { updateUserPreferencesSchema } from "../../../lib/validators/userPreferences";
import {
  upsertUserPreferences,
  getUserPreferences,
} from "../../../lib/services/userPreferencesService";
import { jsonResponse, errorResponse } from "../../../lib/http";
import { logger } from "../../../lib/logger";

/**
 * GET /api/user/preferences
 * Retrieves user preferences
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @returns 200 UserPreferencesResponse | 404 ErrorResponse | 401/500 ErrorResponse
 */
export const GET: APIRoute = async ({ locals }) => {
  // Check authentication
  if (!locals.user) {
    return errorResponse(401, "unauthenticated", "Login required");
  }

  try {
    const prefs = await getUserPreferences(locals.supabase, locals.user.id);

    if (!prefs) {
      return errorResponse(
        404,
        "not_found",
        "User preferences not found. Please create preferences first."
      );
    }

    return jsonResponse(200, prefs);
  } catch (err) {
    logger.error(
      { err, userId: locals.user.id },
      "Failed to fetch user preferences"
    );
    return errorResponse(500, "server_error", "Failed to fetch preferences");
  }
};

/**
 * PUT /api/user/preferences
 * Creates or updates user preferences (upsert operation)
 *
 * @requires Authentication (JWT) - unless DEVENV=true
 * @body UpdateUserPreferencesRequest
 * @returns 200/201 UserPreferencesResponse | 400/401/500 ErrorResponse
 */
export const PUT: APIRoute = async ({ locals, request }) => {
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
  const parseResult = updateUserPreferencesSchema.safeParse(body);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};
    
    // Convert Zod error format to our error response format
    for (const [field, messages] of Object.entries(fieldErrors)) {
      details[field] = Array.isArray(messages) ? messages.join(", ") : String(messages);
    }

    return errorResponse(400, "validation_failed", "Validation errors", details);
  }

  // Upsert preferences
  try {
    const prefs = await upsertUserPreferences(
      locals.supabase,
      locals.user.id,
      parseResult.data
    );

    // Determine status code based on created_at vs updated_at
    // If they're equal, it was just created (201), otherwise updated (200)
    const status = prefs.created_at === prefs.updated_at ? 201 : 200;

    return jsonResponse(status, prefs);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(
      { err, userId: locals.user.id, errorMessage: errorMsg },
      "Failed to upsert user preferences"
    );
    // Return detailed error in dev mode
    if (import.meta.env.DEVENV) {
      return errorResponse(500, "server_error", `Failed to save preferences: ${errorMsg}`);
    }
    return errorResponse(500, "server_error", "Failed to save preferences");
  }
};

export const prerender = false;

