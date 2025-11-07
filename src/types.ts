/**
 * VibeRide Type Definitions
 *
 * This file contains all DTOs (Data Transfer Objects) and Command Models used
 * across the application. All types are derived from the underlying database
 * schema defined in src/db/database.types.ts and supabase migrations.
 *
 * Type Organization:
 * 1. Enums and Literals
 * 2. Base Entity Types (Database Models)
 * 3. Nested/Component Types (JSONB structures)
 * 4. Request DTOs (Command Models)
 * 5. Response DTOs
 * 6. Common/Utility DTOs
 */

// ============================================================================
// 1. ENUMS AND LITERALS
// ============================================================================

/**
 * Terrain type representing the surface condition of riding routes
 * Maps to viberide.terrain enum in database
 */
export type Terrain = "paved" | "gravel" | "mixed";

/**
 * Road type representing the style/characteristic of the road
 * Maps to viberide.road_type enum in database
 */
export type RoadType = "scenic" | "twisty" | "highway";

/**
 * Itinerary status tracking the lifecycle of AI-generated itineraries
 * Maps to viberide.itinerary_status enum in database
 */
export type ItineraryStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

// ============================================================================
// 2. BASE ENTITY TYPES (Database Models)
// ============================================================================

/**
 * User Preferences Entity
 * Maps to viberide.user_preferences table
 * Stores default riding preferences for each user (1:1 with auth.users)
 */
export interface UserPreferences {
  user_id: string; // uuid - references auth.users(id)
  terrain: Terrain;
  road_type: RoadType;
  typical_duration_h: number; // numeric(4,1) - e.g., 2.5 for 2.5 hours
  typical_distance_km: number; // numeric(6,1) - e.g., 250.0 for 250 km
  created_at: string; // timestamptz (ISO 8601 string)
  updated_at: string; // timestamptz (ISO 8601 string)
}

/**
 * Note Entity
 * Maps to viberide.notes table
 * Stores user trip notes with optional AI-generated summaries
 */
export interface Note {
  note_id: string; // uuid - primary key
  user_id: string; // uuid - references auth.users(id)
  title: string; // varchar(120) - max 120 characters
  note_text: string; // text - max 1500 characters
  trip_prefs: TripPreferences; // jsonb - trip-specific preference overrides
  ai_summary: AISummary | null; // jsonb - AI-generated structured summary
  distance_km: number | null; // numeric(6,1) - computed from AI
  duration_h: number | null; // numeric(4,1) - computed from AI
  terrain: Terrain | null; // resolved or computed terrain
  road_type: RoadType | null; // resolved or computed road type
  created_at: string; // timestamptz (ISO 8601 string)
  updated_at: string; // timestamptz (ISO 8601 string)
  archived_at: string | null; // timestamptz - soft archive
  deleted_at: string | null; // timestamptz - soft delete
}

/**
 * Itinerary Entity
 * Maps to viberide.itineraries table
 * Stores AI-generated itineraries with versioning and status tracking
 */
export interface Itinerary {
  itinerary_id: string; // uuid - primary key
  note_id: string; // uuid - references viberide.notes(note_id)
  user_id: string; // uuid - references auth.users(id)
  version: number; // int - version number for this note
  status: ItineraryStatus;
  summary_json: ItinerarySummaryJSON; // jsonb - complete itinerary structure
  gpx_metadata: GPXMetadata | null; // jsonb - metadata for GPX generation
  request_id: string; // uuid - idempotency key for generation request
  created_at: string; // timestamptz (ISO 8601 string)
  updated_at: string; // timestamptz (ISO 8601 string)
  deleted_at: string | null; // timestamptz - soft delete
}

// ============================================================================
// 3. NESTED/COMPONENT TYPES (JSONB structures)
// ============================================================================

/**
 * Trip Preferences
 * Structure stored in notes.trip_prefs (JSONB field)
 * Allows per-note overrides of user default preferences
 * All fields are optional - missing fields inherit from UserPreferences
 */
export interface TripPreferences {
  terrain?: Terrain;
  road_type?: RoadType;
  duration_h?: number;
  distance_km?: number;
}

/**
 * AI Summary
 * Structure stored in notes.ai_summary (JSONB field)
 * Contains AI-generated analysis and estimates for a note
 */
export interface AISummary {
  highlights: string[]; // Key points or attractions
  estimated_duration: number; // Estimated trip duration in hours
  estimated_distance: number; // Estimated trip distance in km
}

/**
 * Itinerary Summary JSON
 * Structure stored in itineraries.summary_json (JSONB field)
 * Contains the complete AI-generated itinerary structure
 */
export interface ItinerarySummaryJSON {
  title: string; // Trip title
  days: ItineraryDay[]; // Array of daily segments
  total_distance_km: number; // Total trip distance
  total_duration_h: number; // Total trip duration
  highlights: string[]; // Notable points of interest
}

/**
 * Itinerary Day
 * Represents a single day within an itinerary
 * Part of ItinerarySummaryJSON.days array
 */
export interface ItineraryDay {
  day: number; // Day number (1-indexed)
  segments: ItinerarySegment[]; // Segments/legs for this day
}

/**
 * Itinerary Segment
 * Represents a single segment/leg within a day
 * Part of ItineraryDay.segments array
 */
export interface ItinerarySegment {
  name: string; // Segment name/title
  description: string; // Detailed description
  distance_km: number; // Segment distance
  duration_h: number; // Segment duration
}

/**
 * GPX Metadata
 * Structure stored in itineraries.gpx_metadata (JSONB field)
 * Contains metadata needed for GPX file generation
 */
export interface GPXMetadata {
  waypoint_count: number; // Number of waypoints in the route
  route_name: string; // Name for the GPX route
}

// ============================================================================
// 4. REQUEST DTOs (Command Models)
// ============================================================================

/**
 * Request body for creating or updating user preferences
 * Used in: PUT /api/user/preferences
 * Derived from UserPreferences entity, omitting system-managed fields
 */
export type UpdateUserPreferencesRequest = Omit<UserPreferences, "user_id" | "created_at" | "updated_at">;

/**
 * Request body for creating a new note
 * Used in: POST /api/notes
 * Derived from Note entity, omitting system-managed and computed fields
 */
export interface CreateNoteRequest {
  title: string; // Required, max 120 characters
  note_text: string; // Required, min 10, max 1500 characters
  trip_prefs?: TripPreferences; // Optional preference overrides
}

/**
 * Request body for updating an existing note
 * Used in: PUT /api/notes/:noteId
 * Same structure as CreateNoteRequest (all fields required)
 */
export type UpdateNoteRequest = CreateNoteRequest;

/**
 * Request body for generating an itinerary
 * Used in: POST /api/notes/:noteId/itineraries
 */
export interface GenerateItineraryRequest {
  request_id: string; // uuid - idempotency key (client-generated)
}

// ============================================================================
// 5. RESPONSE DTOs
// ============================================================================

// ──────────────────────────────────────────────────────────────────────────
// 5.1 User Preferences Responses
// ──────────────────────────────────────────────────────────────────────────

/**
 * Response for GET/PUT /api/user/preferences
 * Identical to UserPreferences entity
 */
export type UserPreferencesResponse = UserPreferences;

// ──────────────────────────────────────────────────────────────────────────
// 5.2 Notes Responses
// ──────────────────────────────────────────────────────────────────────────

/**
 * Response for individual note item in list view
 * Used in: GET /api/notes (array of these)
 * Derived from Note entity with additional computed fields
 */
export interface NoteListItemResponse {
  note_id: string;
  title: string;
  note_text: string;
  trip_prefs: TripPreferences;
  distance_km: number | null;
  duration_h: number | null;
  terrain: Terrain | null;
  road_type: RoadType | null;
  has_itinerary: boolean; // Computed: does this note have any itineraries?
  itinerary_count: number; // Computed: total number of itineraries
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Response for individual note detail view
 * Used in: GET /api/notes/:noteId, POST /api/notes, PUT /api/notes/:noteId
 * Identical to Note entity (excludes search_vector and deleted_at)
 */
export type NoteResponse = Omit<Note, "deleted_at">;

/**
 * Paginated response wrapper for notes list
 * Used in: GET /api/notes
 */
export interface NotesPaginatedResponse {
  data: NoteListItemResponse[];
  pagination: PaginationMeta;
}

/**
 * Response for archiving a note
 * Used in: POST /api/notes/:noteId/archive
 */
export interface ArchiveNoteResponse {
  note_id: string;
  archived_at: string;
}

/**
 * Response for unarchiving a note
 * Used in: POST /api/notes/:noteId/unarchive
 */
export interface UnarchiveNoteResponse {
  note_id: string;
  archived_at: null;
}

/**
 * Response for deleting a note
 * Used in: DELETE /api/notes/:noteId
 */
export interface DeleteNoteResponse {
  success: true;
  note_id: string;
  deleted_at: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 5.3 Itineraries Responses
// ──────────────────────────────────────────────────────────────────────────

/**
 * Response for individual itinerary item in list view
 * Used in: GET /api/notes/:noteId/itineraries (array of these)
 * Derived from Itinerary entity (excludes deleted_at)
 */
export type ItineraryListItemResponse = Omit<Itinerary, "deleted_at">;

/**
 * Response for individual itinerary detail view
 * Used in: GET /api/itineraries/:itineraryId
 * Identical to ItineraryListItemResponse
 */
export type ItineraryResponse = ItineraryListItemResponse;

/**
 * Response wrapper for itineraries list
 * Used in: GET /api/notes/:noteId/itineraries
 */
export interface ItinerariesListResponse {
  data: ItineraryListItemResponse[];
}

/**
 * Response for initiating itinerary generation
 * Used in: POST /api/notes/:noteId/itineraries
 * Partial Itinerary with minimal fields at creation time
 */
export interface GenerateItineraryResponse {
  itinerary_id: string;
  note_id: string;
  version: number;
  status: "pending"; // Always pending at creation
  request_id: string;
  created_at: string;
}

/**
 * Response for polling itinerary generation status
 * Used in: GET /api/itineraries/:itineraryId/status
 * Different structure based on whether generation is in progress or completed
 */
export type ItineraryStatusResponse =
  | {
      itinerary_id: string;
      status: "pending" | "running";
      progress?: number; // Optional progress percentage (0-100)
      message?: string; // Optional progress message
    }
  | {
      itinerary_id: string;
      status: "completed";
      summary_json: ItinerarySummaryJSON; // Full itinerary on completion
    }
  | {
      itinerary_id: string;
      status: "failed";
      error?: string; // Optional error message
    }
  | {
      itinerary_id: string;
      status: "cancelled";
      cancelled_at: string;
    };

/**
 * Response for cancelling itinerary generation
 * Used in: POST /api/itineraries/:itineraryId/cancel
 */
export interface CancelItineraryResponse {
  itinerary_id: string;
  status: "cancelled";
  cancelled_at: string;
}

/**
 * Response for deleting an itinerary
 * Used in: DELETE /api/itineraries/:itineraryId
 */
export interface DeleteItineraryResponse {
  success: true;
  itinerary_id: string;
  deleted_at: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 5.4 Analytics Responses (Internal/Admin)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Response for user statistics
 * Used in: GET /api/analytics/users/stats
 */
export interface UserStatsResponse {
  total_users: number;
  users_with_completed_profiles: number;
  profile_completion_rate: number; // 0-1 decimal
  active_users_30d: number;
  new_users_30d: number;
}

/**
 * Nested structure for generation statistics per user
 */
export interface GenerationStatsPerUser {
  mean: number;
  median: number;
  users_with_3_plus: number;
}

/**
 * Response for generation statistics
 * Used in: GET /api/analytics/generations/stats
 */
export interface GenerationStatsResponse {
  total_generations: number;
  completed_generations: number;
  failed_generations: number;
  cancelled_generations: number;
  failure_rate: number; // 0-1 decimal
  avg_generation_time_seconds: number;
  p95_generation_time_seconds: number;
  generations_per_user: GenerationStatsPerUser;
  estimated_cost_usd: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 5.5 Health Check Response
// ──────────────────────────────────────────────────────────────────────────

/**
 * Response for health check endpoint
 * Used in: GET /api/health
 */
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  database: "connected" | "disconnected" | "error";
  auth: "operational" | "degraded" | "down";
  timestamp: string; // ISO 8601 timestamp
}

// ============================================================================
// 6. COMMON/UTILITY DTOs
// ============================================================================

/**
 * Pagination query parameters
 * Used in list endpoints like GET /api/notes
 */
export interface PaginationParams {
  page?: number; // Page number (default: 1)
  limit?: number; // Items per page (default: 20, max: 100)
  sort?: string; // Sort field (e.g., 'updated_at', 'created_at', 'title')
  order?: "asc" | "desc"; // Sort order (default: 'desc')
}

/**
 * Pagination metadata included in paginated responses
 */
export interface PaginationMeta {
  page: number; // Current page number
  limit: number; // Items per page
  total: number; // Total number of items
  total_pages: number; // Total number of pages
}

/**
 * Standard error response format
 * Used across all endpoints for error cases
 */
export interface ErrorResponse {
  error: string; // Short error code or message
  message: string; // Human-readable description
  details?: Record<string, string>; // Optional field-specific errors
  timestamp?: string; // ISO 8601 timestamp
  request_id?: string; // Optional request tracking ID
  retry_after?: number; // Optional retry delay in seconds
  exponential_backoff?: boolean; // Whether to use exponential backoff
}

// ============================================================================
// 7. TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard to check if a value is a valid Terrain
 */
export function isTerrain(value: unknown): value is Terrain {
  return typeof value === "string" && ["paved", "gravel", "mixed"].includes(value);
}

/**
 * Type guard to check if a value is a valid RoadType
 */
export function isRoadType(value: unknown): value is RoadType {
  return typeof value === "string" && ["scenic", "twisty", "highway"].includes(value);
}

/**
 * Type guard to check if a value is a valid ItineraryStatus
 */
export function isItineraryStatus(value: unknown): value is ItineraryStatus {
  return typeof value === "string" && ["pending", "running", "completed", "failed", "cancelled"].includes(value);
}

/**
 * Helper to check if an itinerary status is terminal (no further transitions)
 */
export function isTerminalStatus(status: ItineraryStatus): boolean {
  return ["completed", "failed", "cancelled"].includes(status);
}

/**
 * Helper to check if an itinerary can be cancelled
 */
export function isCancellable(status: ItineraryStatus): boolean {
  return ["pending", "running"].includes(status);
}
