import type { SupabaseClient } from "../../db/supabase.client";
import type {
  GenerateItineraryResponse,
  ItinerariesListResponse,
  ItineraryListItemResponse,
  ItineraryResponse,
  DeleteItineraryResponse,
  ItineraryStatusResponse,
  RouteGeoJSON,
  CancelItineraryResponse,
} from "../../types";
import { isTerminalStatus, isCancellable } from "../../types";
import { logger } from "../logger";
import { validateGeoJSON, extractSummary } from "./geojsonService";

/**
 * Service for managing itineraries
 */

/**
 * Error thrown when a generation is already in progress for the user
 */
export class GenerationInProgressError extends Error {
  constructor(
    message: string,
    public activeRequestId?: string
  ) {
    super(message);
    this.name = "GenerationInProgressError";
  }
}

/**
 * Error thrown when note is not found or not owned by user
 */
export class NoteNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoteNotFoundError";
  }
}

/**
 * Error thrown when user preferences are missing
 */
export class PreferencesMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreferencesMissingError";
  }
}

/**
 * Error thrown when monthly spend cap is exceeded
 */
export class SpendCapExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpendCapExceededError";
  }
}

/**
 * Starts AI-powered itinerary generation for an existing note
 * Creates a new itinerary row in "pending" state
 *
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param noteId Note ID from path parameter
 * @param requestId Client-generated idempotency key
 * @returns Minimal generation metadata
 * @throws NoteNotFoundError if note doesn't exist or user doesn't own it
 * @throws PreferencesMissingError if user hasn't completed preferences
 * @throws GenerationInProgressError if another generation is already running
 * @throws SpendCapExceededError if monthly OpenAI spend cap exceeded
 * @throws Error for other database errors
 */
export async function startGeneration(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  requestId: string
): Promise<GenerateItineraryResponse> {
  // Step 1: Verify note exists and user owns it
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("note_id, user_id")
    .eq("note_id", noteId)
    .is("deleted_at", null)
    .single();

  if (noteError || !note) {
    throw new NoteNotFoundError("Note not found or has been deleted");
  }

  if (note.user_id !== userId) {
    throw new NoteNotFoundError("Note not found or has been deleted");
  }

  // Step 2: Verify user has completed preferences
  const { data: prefs, error: prefsError } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  if (prefsError || !prefs) {
    throw new PreferencesMissingError("User preferences must be completed before generating itineraries");
  }

  // Step 3: Check for existing running generation
  const { data: runningGeneration, error: runningError } = await supabase
    .from("itineraries")
    .select("request_id")
    .eq("user_id", userId)
    .eq("status", "running")
    .is("deleted_at", null)
    .maybeSingle();

  if (runningError) {
    throw new Error(`Failed to check running generations: ${runningError.message}`);
  }

  if (runningGeneration) {
    throw new GenerationInProgressError(
      "Another itinerary generation is already in progress",
      runningGeneration.request_id
    );
  }

  // Step 4: Check OpenAI spend cap (if configured)
  const spendCapUsd = process.env.OPENAI_MONTHLY_SPEND_CAP_USD;
  if (spendCapUsd) {
    // TODO: Implement actual spend tracking
    // For MVP, we'll skip this check as cost tracking is out of scope
    // In production, this would query a spend tracking table or external service
  }

  // Step 5: Calculate next version number for this note
  const { data: maxVersionData, error: maxVersionError } = await supabase
    .from("itineraries")
    .select("version")
    .eq("note_id", noteId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxVersionError) {
    throw new Error(`Failed to calculate version: ${maxVersionError.message}`);
  }

  const nextVersion = maxVersionData ? maxVersionData.version + 1 : 1;

  // Step 6: Insert new itinerary row with pending status
  const { data: newItinerary, error: insertError } = await supabase
    .from("itineraries")
    .insert({
      note_id: noteId,
      user_id: userId,
      version: nextVersion,
      status: "pending",
      route_geojson: {
        type: "FeatureCollection",
        properties: {
          title: "Generating...",
          total_distance_km: 0,
          total_duration_h: 0,
        },
        features: [],
      },
      request_id: requestId,
    })
    .select("itinerary_id, note_id, version, status, request_id, created_at")
    .single();

  if (insertError) {
    // Check for unique constraint violation on (user_id, request_id)
    if (insertError.code === "23505") {
      // Idempotency: return existing itinerary with this request_id
      const { data: existing, error: existingError } = await supabase
        .from("itineraries")
        .select("itinerary_id, note_id, version, status, request_id, created_at")
        .eq("user_id", userId)
        .eq("request_id", requestId)
        .single();

      if (existingError || !existing) {
        throw new Error("Failed to retrieve existing itinerary for duplicate request_id");
      }

      return existing as GenerateItineraryResponse;
    }

    throw new Error(`Failed to create itinerary: ${insertError.message}`);
  }

  if (!newItinerary) {
    throw new Error("No data returned from insert operation");
  }

  // Step 7: Trigger immediate generation (async, don't await)
  // This runs in the background while we return the pending response
  processItineraryGeneration(supabase, newItinerary.itinerary_id, noteId, userId).catch((err) => {
    logger.error(
      { err, itineraryId: newItinerary.itinerary_id, noteId, userId },
      "Background itinerary generation failed"
    );
  });

  return newItinerary as GenerateItineraryResponse;
}

/**
 * Lists all itinerary versions for a specific note
 * Returns itineraries ordered by version DESC (newest first)
 *
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param noteId Note ID from path parameter
 * @param options Query options (status filter, limit)
 * @returns List of itineraries for the note
 * @throws NoteNotFoundError if note doesn't exist or user doesn't own it
 * @throws Error for database errors
 */
export async function listByNote(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  options: { status?: string; limit: number }
): Promise<ItinerariesListResponse> {
  // Step 1: Verify note exists and user owns it
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("note_id, user_id")
    .eq("note_id", noteId)
    .is("deleted_at", null)
    .single();

  if (noteError || !note) {
    throw new NoteNotFoundError("Note not found or has been deleted");
  }

  if (note.user_id !== userId) {
    throw new NoteNotFoundError("Note not found or has been deleted");
  }

  // Step 2: Build query for itineraries
  let query = supabase
    .from("itineraries")
    .select(
      `
      itinerary_id,
      note_id,
      user_id,
      version,
      status,
      route_geojson,
      title,
      total_distance_km,
      total_duration_h,
      request_id,
      created_at,
      updated_at
    `
    )
    .eq("note_id", noteId)
    .is("deleted_at", null);

  // Apply status filter if provided
  if (options.status) {
    query = query.eq("status", options.status);
  }

  // Apply ordering and limit
  const { data, error } = await query.order("version", { ascending: false }).limit(options.limit);

  if (error) {
    throw new Error(`Failed to list itineraries: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from list operation");
  }

  return {
    data: data as ItineraryListItemResponse[],
  };
}

/**
 * Error thrown when itinerary is not found or not owned by user
 */
export class ItineraryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItineraryNotFoundError";
  }
}

/**
 * Retrieves a single itinerary by ID
 * Returns full itinerary details including summary_json and gpx_metadata
 *
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param itineraryId Itinerary ID from path parameter
 * @returns Complete itinerary details
 * @throws ItineraryNotFoundError if itinerary doesn't exist or user doesn't own it
 * @throws Error for database errors
 */
export async function getById(
  supabase: SupabaseClient,
  userId: string,
  itineraryId: string
): Promise<ItineraryResponse> {
  const { data, error } = await supabase
    .from("itineraries")
    .select(
      `
      itinerary_id,
      note_id,
      user_id,
      version,
      status,
      route_geojson,
      title,
      total_distance_km,
      total_duration_h,
      request_id,
      created_at,
      updated_at
    `
    )
    .eq("itinerary_id", itineraryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error) {
    // PGRST116 is Supabase's "no rows found" error code
    if (error.code === "PGRST116") {
      throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
    }
    throw new Error(`Failed to fetch itinerary: ${error.message}`);
  }

  if (!data) {
    throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
  }

  return data as ItineraryResponse;
}

/**
 * Error thrown when attempting to delete a non-terminal itinerary
 */
export class CannotDeleteNonTerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotDeleteNonTerminalError";
  }
}

/**
 * Soft-deletes an itinerary by setting the deleted_at timestamp
 * Only allows deletion of itineraries with terminal status (completed, failed, cancelled)
 *
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param itineraryId Itinerary ID from path parameter
 * @returns Deletion confirmation with timestamp
 * @throws ItineraryNotFoundError if itinerary doesn't exist, is already deleted, or user doesn't own it
 * @throws CannotDeleteNonTerminalError if itinerary status is pending or running
 * @throws Error for database errors
 */
export async function softDelete(
  supabase: SupabaseClient,
  userId: string,
  itineraryId: string
): Promise<DeleteItineraryResponse> {
  // Step 1: Fetch itinerary to check status
  const { data: itinerary, error: fetchError } = await supabase
    .from("itineraries")
    .select("itinerary_id, status")
    .eq("itinerary_id", itineraryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (fetchError) {
    // PGRST116 is Supabase's "no rows found" error code
    if (fetchError.code === "PGRST116") {
      throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
    }
    throw new Error(`Failed to fetch itinerary: ${fetchError.message}`);
  }

  if (!itinerary) {
    throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
  }

  // Step 2: Verify status is terminal (cannot delete pending/running)
  if (!isTerminalStatus(itinerary.status)) {
    throw new CannotDeleteNonTerminalError(
      `Cannot delete itinerary with status '${itinerary.status}'. Only completed, failed, or cancelled itineraries can be deleted.`
    );
  }

  // Step 3: Soft-delete the itinerary
  const deletedAt = new Date().toISOString();
  const { data: deletedItinerary, error: updateError } = await supabase
    .from("itineraries")
    .update({ deleted_at: deletedAt })
    .eq("itinerary_id", itineraryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("itinerary_id, deleted_at")
    .single();

  if (updateError) {
    // PGRST116 means the row was already deleted or doesn't exist
    if (updateError.code === "PGRST116") {
      throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
    }
    throw new Error(`Failed to delete itinerary: ${updateError.message}`);
  }

  if (!deletedItinerary) {
    throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
  }

  return {
    success: true,
    itinerary_id: deletedItinerary.itinerary_id,
    deleted_at: deletedItinerary.deleted_at as string,
  };
}

/**
 * Retrieves the generation status of an itinerary
 * Returns different response structure based on current status
 *
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param itineraryId Itinerary ID from path parameter
 * @returns Status-specific response with minimal fields for polling
 * @throws ItineraryNotFoundError if itinerary doesn't exist, is deleted, or user doesn't own it
 * @throws Error for database errors
 */
export async function getStatus(
  supabase: SupabaseClient,
  userId: string,
  itineraryId: string
): Promise<ItineraryStatusResponse> {
  // Fetch itinerary with only necessary fields for status
  const { data, error } = await supabase
    .from("itineraries")
    .select("itinerary_id, status, route_geojson, updated_at")
    .eq("itinerary_id", itineraryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error) {
    // PGRST116 is Supabase's "no rows found" error code
    if (error.code === "PGRST116") {
      throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
    }
    throw new Error(`Failed to fetch itinerary status: ${error.message}`);
  }

  if (!data) {
    throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
  }

  // Map to appropriate response variant based on status
  switch (data.status) {
    case "pending":
      return {
        itinerary_id: data.itinerary_id,
        status: "pending",
      };

    case "running":
      return {
        itinerary_id: data.itinerary_id,
        status: "running",
        // TODO: Add progress tracking when background worker supports it
        // progress: data.progress_percentage,
        // message: data.progress_message,
      };

    case "completed":
      return {
        itinerary_id: data.itinerary_id,
        status: "completed",
        route_geojson: data.route_geojson as RouteGeoJSON,
      };

    case "failed":
      return {
        itinerary_id: data.itinerary_id,
        status: "failed",
        // TODO: Add error message when background worker supports it
        // error: data.error_message,
      };

    case "cancelled":
      return {
        itinerary_id: data.itinerary_id,
        status: "cancelled",
        cancelled_at: data.updated_at, // Use updated_at as proxy for cancelled_at
      };

    default:
      throw new Error(`Unknown itinerary status: ${data.status}`);
  }
}

/**
 * Error thrown when attempting to cancel a non-cancellable itinerary
 */
export class CannotCancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotCancelError";
  }
}

/**
 * Cancels a pending or running itinerary generation
 * Only allows cancellation of itineraries with pending or running status
 *
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param itineraryId Itinerary ID from path parameter
 * @returns Cancellation confirmation with timestamp
 * @throws ItineraryNotFoundError if itinerary doesn't exist, is deleted, or user doesn't own it
 * @throws CannotCancelError if itinerary status is terminal (completed/failed/cancelled)
 * @throws Error for database errors
 */
export async function cancelGeneration(
  supabase: SupabaseClient,
  userId: string,
  itineraryId: string
): Promise<CancelItineraryResponse> {
  // Step 1: Fetch itinerary to check status
  const { data: itinerary, error: fetchError } = await supabase
    .from("itineraries")
    .select("itinerary_id, status")
    .eq("itinerary_id", itineraryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (fetchError) {
    // PGRST116 is Supabase's "no rows found" error code
    if (fetchError.code === "PGRST116") {
      throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
    }
    throw new Error(`Failed to fetch itinerary: ${fetchError.message}`);
  }

  if (!itinerary) {
    throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
  }

  // Step 2: Verify status is cancellable (pending or running)
  if (!isCancellable(itinerary.status)) {
    throw new CannotCancelError(
      `Cannot cancel itinerary with status '${itinerary.status}'. Only pending or running itineraries can be cancelled.`
    );
  }

  // Step 3: Update status to cancelled
  const cancelledAt = new Date().toISOString();
  const { data: cancelledItinerary, error: updateError } = await supabase
    .from("itineraries")
    .update({
      status: "cancelled",
      updated_at: cancelledAt,
    })
    .eq("itinerary_id", itineraryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("itinerary_id, status, updated_at")
    .single();

  if (updateError) {
    // PGRST116 means the row was deleted or doesn't exist
    if (updateError.code === "PGRST116") {
      throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
    }
    throw new Error(`Failed to cancel itinerary: ${updateError.message}`);
  }

  if (!cancelledItinerary) {
    throw new ItineraryNotFoundError("Itinerary not found or has been deleted");
  }

  return {
    itinerary_id: cancelledItinerary.itinerary_id,
    status: "cancelled",
    cancelled_at: cancelledItinerary.updated_at,
  };
}

/**
 * Process itinerary generation in the background
 * Updates itinerary status from pending → running → completed/failed
 *
 * @param supabase Supabase client instance
 * @param itineraryId Itinerary ID to process
 * @param noteId Note ID for fetching note data
 * @param userId User ID for fetching preferences
 */
async function processItineraryGeneration(
  supabase: SupabaseClient,
  itineraryId: string,
  noteId: string,
  userId: string
): Promise<void> {
  try {
    // Step 1: Update status to running
    await supabase.from("itineraries").update({ status: "running" }).eq("itinerary_id", itineraryId);

    logger.info({ itineraryId, noteId }, "Started itinerary generation");

    // Step 2: Fetch note and preferences
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("title, note_text, trip_prefs")
      .eq("note_id", noteId)
      .single();

    if (noteError || !note) {
      throw new Error("Failed to fetch note data");
    }

    const { data: userPrefs, error: prefsError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefsError || !userPrefs) {
      throw new Error("Failed to fetch user preferences");
    }

    // Step 3: Resolve preferences (trip overrides → user defaults → hardcoded defaults)
    const resolvedPrefs = {
      terrain: note.trip_prefs?.terrain ?? userPrefs.terrain ?? "paved",
      road_type: note.trip_prefs?.road_type ?? userPrefs.road_type ?? "scenic",
      duration_h: note.trip_prefs?.duration_h ?? userPrefs.typical_duration_h ?? 2.0,
      distance_km: note.trip_prefs?.distance_km ?? userPrefs.typical_distance_km ?? 100.0,
    };

    // Step 4: Generate itinerary using OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    logger.info({ hasApiKey: !!apiKey }, "Checking OpenRouter API key");

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured in environment variables");
    }

    const { OpenRouterService } = await import("./openRouterService");
    const openRouter = new OpenRouterService({ apiKey });

    const systemMessage = `You are an expert motorcycle trip planner. Generate detailed riding itineraries based on user preferences and notes.
Always respond with valid JSON matching the exact schema provided.`;

    const userMessage = `Generate a motorcycle riding route in GeoJSON format based on the following:

Title: ${note.title}
Notes: ${note.note_text}

Preferences:
- Terrain: ${resolvedPrefs.terrain}
- Road Type: ${resolvedPrefs.road_type}
- Target Duration: ${resolvedPrefs.duration_h} hours
- Target Distance: ${resolvedPrefs.distance_km} km

GEOJSON STRUCTURE REQUIREMENTS:
1. Create a FeatureCollection with properties and features
2. Properties must include:
   - title: Compelling route title (max 60 characters)
   - total_distance_km: Total distance matching preferences
   - total_duration_h: Total duration matching preferences
   - highlights: Array of 3-5 key points of interest
   - days: Number of days (split if duration > 8 hours)

3. Features array should contain:
   - LineString features representing route segments (3-5 per day)
   - Optional Point features for important waypoints/POIs

LINESTRING FEATURE REQUIREMENTS:
Each LineString feature represents a route segment and MUST have:
- geometry.type: "LineString"
- geometry.coordinates: Array of [longitude, latitude] pairs (at least 2 points)
- properties.name: Descriptive segment name (e.g., "Kraków to Zakopane via DK7")
- properties.description: Brief description (1-2 sentences max)
- properties.type: "route"
- properties.day: Day number (1, 2, 3, etc.)
- properties.segment: Segment number within the day
- properties.distance_km: Segment distance
- properties.duration_h: Segment duration

POINT FEATURE REQUIREMENTS (optional):
Point features for waypoints/POIs should have:
- geometry.type: "Point"
- geometry.coordinates: [longitude, latitude]
- properties.name: Waypoint name
- properties.description: Brief description
- properties.type: "waypoint" or "poi"

GPS COORDINATE GUIDELINES:
- Use REAL coordinates from actual locations (cities, towns, landmarks)
- Format: [longitude, latitude] (NOT [lat, lon])
- Longitude: -180 to +180 (east/west)
- Latitude: -90 to +90 (north/south)
- Use 4-6 decimal places for precision
- Ensure route segments connect logically

OPTIMIZATION FOR RELIABILITY:
- Keep descriptions concise (under 100 characters)
- Limit to 2-3 days maximum for trips under 24 hours
- Use well-known locations for coordinates
- Ensure all numeric values are realistic for motorcycles
- Each LineString should have 2-5 coordinate points

IMPORTANT: Return ONLY valid GeoJSON. Do not truncate the response.`;

    const responseFormat = {
      name: "route_geojson",
      strict: false, // Allow additional fields
      schema: {
        type: "object",
        properties: {
          type: { const: "FeatureCollection" },
          properties: {
            type: "object",
            properties: {
              title: { type: "string", maxLength: 60 },
              total_distance_km: { type: "number" },
              total_duration_h: { type: "number" },
              highlights: {
                type: "array",
                items: { type: "string" },
              },
              days: { type: "integer" },
            },
            required: ["title", "total_distance_km", "total_duration_h"],
          },
          features: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { const: "Feature" },
                geometry: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["Point", "LineString"] },
                    coordinates: {
                      type: "array",
                      // Can be [lon, lat] for Point or [[lon, lat], ...] for LineString
                    },
                  },
                  required: ["type", "coordinates"],
                },
                properties: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: ["route", "waypoint", "poi"] },
                    day: { type: "integer" },
                    segment: { type: "integer" },
                    distance_km: { type: "number" },
                    duration_h: { type: "number" },
                  },
                },
              },
              required: ["type", "geometry"],
            },
          },
        },
        required: ["type", "properties", "features"],
      },
    };

    const response = await openRouter.chat({
      model: "anthropic/claude-3.5-sonnet",
      systemMessage,
      userMessage,
      responseFormat,
      modelParams: {
        temperature: 0.7,
        max_tokens: 8000, // Increased to prevent truncation
      },
    });

    // Step 5: Parse and validate response
    logger.debug(
      {
        itineraryId,
        responseContent: response.content.slice(0, 500),
        contentLength: response.content.length,
        finishReason: response.finishReason,
      },
      "Received AI response"
    );

    // Check if response was truncated
    if (response.finishReason === "length") {
      logger.error(
        {
          itineraryId,
          contentLength: response.content.length,
          finishReason: response.finishReason,
        },
        "AI response was truncated due to max_tokens limit"
      );
      throw new Error("AI response was incomplete. Please try again with a shorter trip or fewer days.");
    }

    let routeGeoJSON: RouteGeoJSON;
    try {
      routeGeoJSON = JSON.parse(response.content);
    } catch (parseError) {
      logger.error(
        {
          err: parseError,
          responseContent: response.content.slice(0, 1000),
          contentLength: response.content.length,
          lastChars: response.content.slice(-100),
        },
        "Failed to parse AI response as JSON"
      );
      throw new Error("Invalid AI response: not valid JSON. The response may have been truncated.");
    }

    logger.debug(
      {
        itineraryId,
        type: routeGeoJSON.type,
        featureCount: routeGeoJSON.features?.length,
        hasProperties: !!routeGeoJSON.properties,
      },
      "Parsed AI response structure"
    );

    // Validate GeoJSON structure
    try {
      validateGeoJSON(routeGeoJSON);
    } catch (validationError) {
      logger.error(
        {
          err: validationError,
          itineraryId,
          geojson: routeGeoJSON,
        },
        "GeoJSON validation failed"
      );
      throw new Error(
        `Invalid GeoJSON from AI: ${validationError instanceof Error ? validationError.message : String(validationError)}`
      );
    }

    // Extract summary data from GeoJSON for derived fields
    const summary = extractSummary(routeGeoJSON);

    // Log feature statistics
    const lineStringCount = routeGeoJSON.features.filter((f) => f.geometry.type === "LineString").length;
    const pointCount = routeGeoJSON.features.filter((f) => f.geometry.type === "Point").length;

    logger.info(
      {
        itineraryId,
        title: summary.title,
        totalDistance: summary.total_distance_km,
        totalDuration: summary.total_duration_h,
        featureCount: routeGeoJSON.features.length,
        lineStringCount,
        pointCount,
        highlights: summary.highlights.length,
      },
      "GeoJSON route validated successfully"
    );

    // Step 6: Update itinerary with completed status, GeoJSON, and derived fields
    const { error: updateError } = await supabase
      .from("itineraries")
      .update({
        status: "completed",
        route_geojson: routeGeoJSON,
        title: summary.title,
        total_distance_km: summary.total_distance_km,
        total_duration_h: summary.total_duration_h,
      })
      .eq("itinerary_id", itineraryId);

    if (updateError) {
      throw new Error(`Failed to update itinerary: ${updateError.message}`);
    }

    logger.info(
      {
        itineraryId,
        noteId,
        title: summary.title,
        totalDistance: summary.total_distance_km,
        totalDuration: summary.total_duration_h,
        featureCount: routeGeoJSON.features.length,
      },
      "Itinerary generation completed successfully"
    );
  } catch (error) {
    // Update status to failed with error in route_geojson
    const errorMessage = error instanceof Error ? error.message : String(error);

    await supabase
      .from("itineraries")
      .update({
        status: "failed",
        route_geojson: {
          type: "FeatureCollection",
          properties: {
            title: "Generation Failed",
            total_distance_km: 0,
            total_duration_h: 0,
            error: errorMessage,
          },
          features: [],
        },
      })
      .eq("itinerary_id", itineraryId);

    logger.error(
      {
        err: error,
        itineraryId,
        noteId,
        errorMessage,
      },
      "Itinerary generation failed"
    );

    throw error;
  }
}
