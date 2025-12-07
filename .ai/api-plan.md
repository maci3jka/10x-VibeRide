# REST API Plan for VibeRide

## IMPORTANT

Keep in mind that viberide has it own schema called viberide.
For development purposes authentication MUST have option to be disabled. it should be disabled when enviroment variable DEVENV is set to 'true'.

## Implementation Status

| Endpoint | Method | Status | Implementation Date |
|----------|--------|--------|---------------------|
| `/api/user/preferences` | GET | ✅ Implemented | December 2024 |
| `/api/user/preferences` | PUT | ✅ Implemented | December 2024 |
| `/api/notes` | GET | ✅ Implemented | December 6, 2024 |
| `/api/notes` | POST | ✅ Implemented | December 6, 2024 |
| `/api/notes/:noteId` | GET | ✅ Implemented | December 7, 2024 |
| `/api/notes/:noteId` | PUT | ✅ Implemented | December 7, 2024 |
| `/api/notes/:noteId` | DELETE | ✅ Implemented | December 7, 2024 |
| `/api/notes/:noteId/archive` | POST | 🔲 Planned | - |
| `/api/notes/:noteId/unarchive` | POST | 🔲 Planned | - |
| `/api/notes/:noteId/itineraries` | GET | ✅ Implemented | December 6, 2024 |
| `/api/notes/:noteId/itineraries` | POST | ✅ Implemented | December 6, 2024 |
| `/api/itineraries/:itineraryId` | GET | ✅ Implemented | December 6, 2024 |
| `/api/itineraries/:itineraryId` | DELETE | ✅ Implemented | December 6, 2024 |
| `/api/itineraries/:itineraryId/status` | GET | ✅ Implemented | December 6, 2024 |
| `/api/itineraries/:itineraryId/cancel` | POST | ✅ Implemented | December 6, 2024 |
| `/api/itineraries/:itineraryId/gpx` | GET | ✅ Implemented | December 6, 2024 |
| `/api/analytics/users/stats` | GET | ✅ Implemented | December 7, 2024 |
| `/api/analytics/generations/stats` | GET | ✅ Implemented | December 7, 2024 |
| `/api/health` | GET | ✅ Implemented | December 7, 2024 |

**Legend:**
- ✅ Implemented - Fully implemented with tests
- 🔲 Planned - Not yet implemented

**Implementation Summary:**
- **User Preferences**: Complete (GET, PUT) - Full CRUD with validation
- **Notes**: Complete (GET list, POST create, GET by ID, PUT, DELETE) - Full CRUD with search/pagination, validation, and soft delete
- **Itineraries**: Complete (GET by ID, GET list, POST generate, DELETE, GET status, POST cancel, GET gpx) - Full CRUD with generation, status polling, cancellation, and GPX download
- **Analytics**: Complete (GET users/stats, GET generations/stats) - Internal admin endpoints with date range filtering
- **Health**: Complete (GET /api/health) - Public health check endpoint with concurrent DB/Auth checks

**Next Priority:** Archive/unarchive endpoints for Notes

## 1. Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| User Preferences | `viberide.user_preferences` | User's default riding preferences (terrain, road type, duration, distance) |
| Notes | `viberide.notes` | User's trip notes with optional preference overrides |
| Itineraries | `viberide.itineraries` | AI-generated trip itineraries linked to notes |

---

## 2. Endpoints

### 2.1 User Preferences

#### Get User Preferences
- **Method**: `GET`
- **Path**: `/api/user/preferences`
- **Description**: Retrieves authenticated user's riding preferences
- **Auth**: Required
- **Query Parameters**: None
- **Request Body**: None
- **Response**:
  ```json
  {
    "user_id": "uuid",
    "terrain": "paved",
    "road_type": "scenic",
    "typical_duration_h": 4.5,
    "typical_distance_km": 250.0,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
  ```
- **Success**: `200` OK - Preferences found
- **Errors**:
  - `401` Unauthorized - Not authenticated
  - `404` Not Found - User preferences not yet created

#### Create/Update User Preferences
- **Method**: `PUT`
- **Path**: `/api/user/preferences`
- **Description**: Creates or updates user's riding preferences (upsert operation)
- **Auth**: Required
- **Headers**:
  - `Content-Type: application/json` (required – requests with other content types are rejected)
- **Request Body**:
  ```json
  {
    "terrain": "paved",
    "road_type": "scenic",
    "typical_duration_h": 4.5,
    "typical_distance_km": 250.0
  }
  ```
- **Response**:
  ```json
  {
    "user_id": "uuid",
    "terrain": "paved",
    "road_type": "scenic",
    "typical_duration_h": 4.5,
    "typical_distance_km": 250.0,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
  ```
- **Success**: 
  - `200` OK - Preferences updated
  - `201` Created - Preferences created for first time
- **Errors**:
  - `400` Bad Request - Validation errors
    - `error`: `"validation_failed"`
    - `message`: `"Validation errors"`
    - `details`: field-level messages (e.g. `"terrain": "Invalid enum value. Expected 'paved' | 'gravel' | 'mixed'"`)
  - `400` Bad Request - Missing or malformed JSON (`error`: `"invalid_json"` or `"invalid_content_type"`)
  - `401` Unauthorized - Not authenticated
  - `500` Internal Server Error (`error`: `"user_preferences.upsert_failed"` or `"server_error"`)
- **Logging**: Failures are routed through the shared `logger.error({ err, userId }, message)` helper.
- **Validation**: Enforced with Zod schema (`updateUserPreferencesSchema`) – ensures positive numeric ranges (`<= 999.9` hours, `<= 999_999.9` km) and enum safety.
- **Tests**:
  - Unit tests cover schema parsing and service error handling (`src/lib/validators/userPreferences.test.ts`, `src/lib/services/userPreferencesService.test.ts`).
  - Integration test exercises the Astro route happy path and error conditions (`src/pages/api/user/preferences.test.ts`).

---

### 2.2 Notes

> **Implementation Reference:** See [`.ai/api/notes-implementation-summary.md`](.ai/api/notes-implementation-summary.md) for detailed implementation documentation, test coverage, and manual testing examples.

#### List Notes
- **Method**: `GET`
- **Path**: `/api/notes`
- **Description**: Retrieves paginated list of user's notes (excludes soft-deleted)
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Status**: ✅ **IMPLEMENTED** (December 6, 2024)
- **Query Parameters**:
  - `page` (integer, optional, default: 1) - Page number (≥ 1)
  - `limit` (integer, optional, default: 20, max: 100) - Items per page
  - `search` (string, optional, max: 250 chars) - Full-text search query
  - `archived` (boolean, optional, default: false) - Include archived notes
  - `sort` (string, optional, default: "updated_at") - Sort field: `updated_at`, `created_at`, `title`
  - `order` (string, optional, default: "desc") - Sort order: `asc`, `desc`
- **Request Body**: None
- **Response**:
  ```json
  {
    "data": [
      {
        "note_id": "uuid",
        "title": "Weekend ride to mountains",
        "note_text": "Planning a scenic ride...",
        "trip_prefs": {
          "terrain": "mixed",
          "road_type": "scenic",
          "duration_h": 6.0,
          "distance_km": 300.0
        },
        "distance_km": 285.5,
        "duration_h": 5.5,
        "terrain": "mixed",
        "road_type": "scenic",
        "has_itinerary": true,
        "itinerary_count": 3,
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-16T14:20:00Z",
        "archived_at": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `401` Unauthorized - Not authenticated
  - `400` Bad Request - Invalid query parameters
  - `404` Not Found - Requested page exceeds total pages
  - `500` Internal Server Error
- **Implementation Details**:
  - Validator: `src/lib/validators/notes.ts` (`listNotesQuerySchema`)
  - Service: `src/lib/services/notesService.ts` (`listNotes()`)
  - Route: `src/pages/api/notes/index.ts` (GET handler)
  - Tests: 49 validator tests + 6 service tests (all passing)
  - Features: Full-text search via `search_vector`, itinerary count aggregation, multi-field sorting

#### Get Note by ID
- **Method**: `GET`
- **Path**: `/api/notes/:noteId`
- **Description**: Retrieves a specific note by ID
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Status**: ✅ **IMPLEMENTED** (December 7, 2024)
- **Path Parameters**:
  - `noteId` (uuid, required) - Note identifier
- **Request Body**: None
- **Response**:
  ```json
  {
    "note_id": "uuid",
    "user_id": "uuid",
    "title": "Weekend ride to mountains",
    "note_text": "Planning a scenic ride through...",
    "trip_prefs": {
      "terrain": "mixed",
      "road_type": "scenic",
      "duration_h": 6.0,
      "distance_km": 300.0
    },
    "ai_summary": {
      "highlights": ["Mountain pass", "Scenic overlook"],
      "estimated_duration": 6.0,
      "estimated_distance": 285.5
    },
    "distance_km": 285.5,
    "duration_h": 5.5,
    "terrain": "mixed",
    "road_type": "scenic",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-16T14:20:00Z",
    "archived_at": null
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `400` Bad Request - Invalid noteId format (not a valid UUID)
  - `401` Unauthorized - Not authenticated
  - `404` Not Found - Note does not exist, is deleted, or belongs to different user
  - `500` Internal Server Error
- **Implementation Details**:
  - Validator: `src/lib/validators/notes.ts` (`noteIdParamSchema`)
  - Service: `src/lib/services/notesService.ts` (`getNoteById()`)
  - Route: `src/pages/api/notes/[noteId]/index.ts` (GET handler)
  - Tests: 6 service unit tests + 5 integration tests (all passing)
  - Security: RLS enforces ownership, returns 404 for unauthorized access
- **Notes**:
  - Returns 404 for both non-existent and unauthorized access (security through obscurity)
  - Excludes soft-deleted notes (`deleted_at IS NULL`)
  - Single-row SELECT with indexed PK lookup (< 10ms typical)

#### Create Note
- **Method**: `POST`
- **Path**: `/api/notes`
- **Description**: Creates a new trip note
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Status**: ✅ **IMPLEMENTED** (December 6, 2024)
- **Request Body**:
  ```json
  {
    "title": "Weekend ride to mountains",
    "note_text": "Planning a scenic ride through...",
    "trip_prefs": {
      "terrain": "mixed",
      "road_type": "scenic",
      "duration_h": 6.0,
      "distance_km": 300.0
    }
  }
  ```
- **Validation**:
  - `title`: String, 1-120 characters, trimmed, required, unique per user
  - `note_text`: String, 10-1500 characters, trimmed, required
  - `trip_prefs`: Object, optional, all fields optional (inherits from user preferences)
- **Response**:
  ```json
  {
    "note_id": "uuid",
    "user_id": "uuid",
    "title": "Weekend ride to mountains",
    "note_text": "Planning a scenic ride through...",
    "trip_prefs": {
      "terrain": "mixed",
      "road_type": "scenic",
      "duration_h": 6.0,
      "distance_km": 300.0
    },
    "ai_summary": null,
    "distance_km": null,
    "duration_h": null,
    "terrain": null,
    "road_type": null,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "archived_at": null
  }
  ```
- **Success**: `201` Created
- **Errors**:
  - `400` Bad Request - Validation errors or malformed JSON
    ```json
    {
      "error": "validation_failed",
      "message": "Validation errors",
      "details": {
        "title": "Title is required and must not exceed 120 characters",
        "note_text": "Note text must not exceed 1500 characters",
        "trip_prefs.terrain": "Must be one of: paved, gravel, mixed"
      },
      "timestamp": "2025-01-15T10:30:00Z"
    }
    ```
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - User preferences not completed
    ```json
    {
      "error": "preferences_incomplete",
      "message": "User preferences must be set before creating notes",
      "timestamp": "2025-01-15T10:30:00Z"
    }
    ```
  - `409` Conflict - Note with same title already exists for user
    ```json
    {
      "error": "note_title_conflict",
      "message": "A note with this title already exists",
      "timestamp": "2025-01-15T10:30:00Z"
    }
    ```
  - `500` Internal Server Error
- **Implementation Details**:
  - Validator: `src/lib/validators/notes.ts` (`createNoteSchema`, `tripPreferencesSchema`)
  - Service: `src/lib/services/notesService.ts` (`createNote()`)
  - Route: `src/pages/api/notes/index.ts` (POST handler)
  - Tests: 24 validator tests + 7 service tests (all passing)
  - Prerequisites: Checks user preferences exist before allowing note creation
  - Uniqueness: Database constraint on (user_id, title) WHERE deleted_at IS NULL

#### Update Note
- **Method**: `PUT`
- **Path**: `/api/notes/:noteId`
- **Description**: Updates an existing note
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Status**: ✅ **IMPLEMENTED** (December 7, 2024)
- **Path Parameters**:
  - `noteId` (uuid, required) - Note identifier
- **Headers**:
  - `Content-Type: application/json` (required)
- **Request Body**:
  ```json
  {
    "title": "Updated weekend ride",
    "note_text": "Modified scenic ride through...",
    "trip_prefs": {
      "terrain": "paved",
      "road_type": "twisty",
      "duration_h": 4.0,
      "distance_km": 200.0
    }
  }
  ```
- **Validation**: Same as Create Note (title: 1-120 chars, note_text: 10-1500 chars, trip_prefs optional)
- **Response**: Same as Get Note by ID (returns updated note)
- **Success**: `200` OK
- **Errors**:
  - `400` Bad Request - Invalid noteId format, malformed JSON, or validation errors
    ```json
    {
      "error": "validation_failed",
      "message": "Validation errors",
      "details": {
        "title": "Title must be at least 1 character",
        "note_text": "Note text must be at least 10 characters"
      },
      "timestamp": "2025-01-15T10:30:00Z"
    }
    ```
  - `401` Unauthorized - Not authenticated
  - `404` Not Found - Note does not exist, is deleted, or belongs to different user
  - `409` Conflict - Note with same title already exists for user
    ```json
    {
      "error": "note_title_conflict",
      "message": "A note with this title already exists. Please choose a different title.",
      "timestamp": "2025-01-15T10:30:00Z"
    }
    ```
  - `500` Internal Server Error
- **Implementation Details**:
  - Validator: `src/lib/validators/notes.ts` (`updateNoteSchema`, `noteIdParamSchema`)
  - Service: `src/lib/services/notesService.ts` (`updateNote()`)
  - Route: `src/pages/api/notes/[noteId]/index.ts` (PUT handler)
  - Tests: 6 service unit tests + 6 integration tests (all passing)
  - Ownership verification before update
  - Title uniqueness constraint enforced
- **Notes**:
  - Automatically updates `updated_at` timestamp
  - Verifies note ownership before allowing update
  - Returns 404 for unauthorized access (not 403 for security)
  - All fields in request body are required (full update, not partial)

#### Archive Note
- **Method**: `POST`
- **Path**: `/api/notes/:noteId/archive`
- **Description**: Archives a note (sets archived_at timestamp)
- **Auth**: Required
- **Path Parameters**:
  - `noteId` (uuid, required) - Note identifier
- **Request Body**: None
- **Response**:
  ```json
  {
    "note_id": "uuid",
    "archived_at": "2025-01-16T15:30:00Z"
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - Note belongs to different user
  - `404` Not Found - Note does not exist or is deleted
  - `500` Internal Server Error

#### Unarchive Note
- **Method**: `POST`
- **Path**: `/api/notes/:noteId/unarchive`
- **Description**: Unarchives a note (clears archived_at timestamp)
- **Auth**: Required
- **Path Parameters**:
  - `noteId` (uuid, required) - Note identifier
- **Request Body**: None
- **Response**:
  ```json
  {
    "note_id": "uuid",
    "archived_at": null
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - Note belongs to different user
  - `404` Not Found - Note does not exist or is deleted
  - `500` Internal Server Error

#### Delete Note
- **Method**: `DELETE`
- **Path**: `/api/notes/:noteId`
- **Description**: Soft deletes a note (sets deleted_at timestamp, cascades to itineraries via database trigger)
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Status**: ✅ **IMPLEMENTED** (December 7, 2024)
- **Path Parameters**:
  - `noteId` (uuid, required) - Note identifier
- **Request Body**: None
- **Response**:
  ```json
  {
    "success": true,
    "note_id": "uuid",
    "deleted_at": "2025-01-16T15:30:00Z"
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `400` Bad Request - Invalid noteId format (not a valid UUID)
  - `401` Unauthorized - Not authenticated
  - `404` Not Found - Note does not exist, already deleted, or belongs to different user
  - `500` Internal Server Error
- **Implementation Details**:
  - Validator: `src/lib/validators/notes.ts` (`noteIdParamSchema`)
  - Service: `src/lib/services/notesService.ts` (`deleteNote()`)
  - Route: `src/pages/api/notes/[noteId]/index.ts` (DELETE handler)
  - Tests: 6 service unit tests + 5 integration tests (all passing)
  - Database trigger automatically cascades soft delete to associated itineraries
- **Notes**:
  - Soft delete only (sets `deleted_at` timestamp, preserves data)
  - Database trigger cascades deletion to all associated itineraries
  - Returns 404 for unauthorized access (not 403 for security)
  - Attempting to delete already deleted note returns 404
  - Preserves referential integrity and audit trail

---

### 2.3 Itineraries

#### List Itineraries for Note
- **Method**: `GET`
- **Path**: `/api/notes/:noteId/itineraries`
- **Description**: Retrieves all itinerary versions for a specific note, ordered by version DESC (newest first)
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Status**: ✅ **IMPLEMENTED** (December 6, 2024)
- **Path Parameters**:
  - `noteId` (uuid, required) - Note identifier
- **Query Parameters**:
  - `status` (enum, optional) - Filter by status: `pending`, `running`, `completed`, `failed`, `cancelled`
  - `limit` (integer, optional, default: 20, max: 100) - Number of results
- **Request Body**: None
- **Response**:
  ```json
  {
    "data": [
      {
        "itinerary_id": "uuid",
        "note_id": "uuid",
        "user_id": "uuid",
        "version": 3,
        "status": "completed",
        "summary_json": {
          "title": "Mountain Loop Adventure",
          "days": [
            {
              "day": 1,
              "segments": [
                {
                  "name": "Morning Coastal Ride",
                  "description": "Start along scenic Highway 1",
                  "distance_km": 95.0,
                  "duration_h": 2.0
                }
              ]
            }
          ],
          "total_distance_km": 285.5,
          "total_duration_h": 5.5,
          "highlights": ["Mountain pass", "Scenic overlook"]
        },
        "gpx_metadata": {
          "waypoint_count": 15,
          "route_name": "Mountain Loop Adventure"
        },
        "request_id": "uuid",
        "created_at": "2025-01-16T14:20:00Z",
        "updated_at": "2025-01-16T14:20:30Z"
      }
    ]
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `400` Bad Request - Invalid noteId format or query parameters
    ```json
    {
      "error": "validation_failed",
      "message": "Validation errors",
      "details": {
        "limit": "Limit cannot exceed 100"
      },
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - Note belongs to different user (returns 404 for security)
  - `404` Not Found - Note does not exist or has been deleted
    ```json
    {
      "error": "note_not_found",
      "message": "Note not found or has been deleted",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `500` Internal Server Error
- **Implementation Details**:
  - Validator: `src/lib/validators/itinerary.ts` (`listItinerariesQuerySchema`)
  - Service: `src/lib/services/itineraryService.ts` (`listByNote()`)
  - Route: `src/pages/api/notes/[noteId]/itineraries/index.ts` (GET handler)
  - Tests: 14 validator tests + 9 service tests (all passing)
  - Features: Status filtering, limit control, version ordering DESC
- **Notes**:
  - Returns empty array if note has no itineraries
  - Excludes soft-deleted itineraries (`deleted_at IS NULL`)
  - Note ownership verified before listing
  - Status filter is optional (omit to get all statuses)

#### Get Itinerary by ID
- **Method**: `GET`
- **Path**: `/api/itineraries/:itineraryId`
- **Description**: Retrieves a single itinerary by ID with complete details
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Status**: ✅ **IMPLEMENTED** (December 6, 2024)
- **Path Parameters**:
  - `itineraryId` (uuid, required) - Itinerary identifier
- **Request Body**: None
- **Response**: Same structure as single item in List Itineraries
  ```json
  {
    "itinerary_id": "uuid",
    "note_id": "uuid",
    "user_id": "uuid",
    "version": 2,
    "status": "completed",
    "summary_json": {
      "title": "Mountain Loop Adventure",
      "days": [...],
      "total_distance_km": 285.5,
      "total_duration_h": 5.5,
      "highlights": ["Mountain pass", "Scenic overlook"]
    },
    "gpx_metadata": {
      "waypoint_count": 15,
      "route_name": "Mountain Loop Adventure"
    },
    "request_id": "uuid",
    "created_at": "2025-01-16T14:20:00Z",
    "updated_at": "2025-01-16T14:20:30Z"
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `400` Bad Request - Invalid itineraryId format
    ```json
    {
      "error": "invalid_parameter",
      "message": "Itinerary ID must be a valid UUID",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `401` Unauthorized - Not authenticated
  - `404` Not Found - Itinerary does not exist, deleted, or belongs to another user
    ```json
    {
      "error": "itinerary_not_found",
      "message": "Itinerary not found or has been deleted",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `500` Internal Server Error
- **Implementation Details**:
  - Service: `src/lib/services/itineraryService.ts` (`getById()`)
  - Route: `src/pages/api/itineraries/[itineraryId]/index.ts` (GET handler)
  - Tests: 6 service tests (all passing)
  - Security: RLS enforces ownership (returns 404 for unauthorized access)
- **Notes**:
  - Straightforward SELECT by primary key (indexed)
  - Returns 404 for both non-existent and unauthorized access (security through obscurity)
  - Excludes soft-deleted itineraries
  - Returns complete itinerary details including summary_json and gpx_metadata

#### Generate Itinerary
- **Method**: `POST`
- **Path**: `/api/notes/:noteId/itineraries`
- **Description**: Initiates AI-powered itinerary generation for a note. Creates a new itinerary row in "pending" state and returns minimal generation metadata. Generation runs asynchronously in the background.
- **Auth**: Required (bypassed in dev mode with DEVENV='true')
- **Path Parameters**:
  - `noteId` (uuid, required) - Note identifier
- **Headers**:
  - `Content-Type: application/json` (required)
- **Request Body**:
  ```json
  {
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
  - `request_id` (uuid, required) - Client-generated idempotency key to prevent duplicate generations
- **Response**:
  ```json
  {
    "itinerary_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "note_id": "550e8400-e29b-41d4-a716-446655440000",
    "version": 1,
    "status": "pending",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-01-16T14:20:00Z"
  }
  ```
- **Success**: `202` Accepted - Generation started
- **Errors**:
  - `400` Bad Request - Invalid noteId format, malformed JSON, or validation failed
    ```json
    {
      "error": "validation_failed",
      "message": "Validation errors",
      "details": {
        "request_id": "Request ID must be a valid UUID"
      },
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `401` Unauthorized - Not authenticated
    ```json
    {
      "error": "unauthenticated",
      "message": "Login required",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `403` Forbidden - User preferences incomplete
    ```json
    {
      "error": "profile_incomplete",
      "message": "User preferences must be completed before generating itineraries",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `404` Not Found - Note does not exist or has been deleted
    ```json
    {
      "error": "note_not_found",
      "message": "Note not found or has been deleted",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `409` Conflict - User already has a running generation
    ```json
    {
      "error": "generation_in_progress",
      "message": "Another itinerary generation is already in progress",
      "details": {
        "active_request_id": "existing-uuid-here"
      },
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `429` Too Many Requests - OpenAI spend limit reached
    ```json
    {
      "error": "service_limit_reached",
      "message": "Monthly AI generation quota exceeded",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
  - `500` Internal Server Error
    ```json
    {
      "error": "server_error",
      "message": "Failed to start generation",
      "timestamp": "2025-01-16T14:20:00Z"
    }
    ```
- **Idempotency**: Duplicate `request_id` returns existing itinerary (same response structure)
- **Concurrency**: Enforces single concurrent generation per user via database constraint
- **Version Management**: Version number auto-increments for each note (starts at 1)
- **Validation**: Enforced with Zod schema (`generateItinerarySchema`)
- **Logging**: All operations logged with structured context (userId, noteId, itineraryId, requestId)
- **Tests**:
  - Unit tests cover schema validation (`src/lib/validators/itinerary.test.ts`)
  - Service tests cover all business logic scenarios (`src/lib/services/itineraryService.test.ts`)
- **cURL Examples**:
  ```bash
  # Success case
  curl -X POST http://localhost:4321/api/notes/550e8400-e29b-41d4-a716-446655440000/itineraries \
    -H "Content-Type: application/json" \
    -H "Cookie: viberide-auth=..." \
    -d '{"request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'

  # Dev mode (no auth)
  DEVENV=true curl -X POST http://localhost:4321/api/notes/550e8400-e29b-41d4-a716-446655440000/itineraries \
    -H "Content-Type: application/json" \
    -d '{"request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'

  # Invalid UUID format
  curl -X POST http://localhost:4321/api/notes/invalid-uuid/itineraries \
    -H "Content-Type: application/json" \
    -d '{"request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
  # Returns 400 Bad Request

  # Missing request_id
  curl -X POST http://localhost:4321/api/notes/550e8400-e29b-41d4-a716-446655440000/itineraries \
    -H "Content-Type: application/json" \
    -d '{}'
  # Returns 400 Bad Request with validation details
  ```

#### Get Itinerary Generation Status
- **Method**: `GET`
- **Path**: `/api/itineraries/:itineraryId/status`
- **Description**: Polls the generation status of an itinerary
- **Auth**: Required
- **Path Parameters**:
  - `itineraryId` (uuid, required) - Itinerary identifier
- **Request Body**: None
- **Response**:
  ```json
  {
    "itinerary_id": "uuid",
    "status": "running",
    "progress": 65,
    "message": "Analyzing route options..."
  }
  ```
  Or when completed:
  ```json
  {
    "itinerary_id": "uuid",
    "status": "completed",
    "summary_json": { /* full itinerary */ }
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - Itinerary belongs to different user
  - `404` Not Found - Itinerary does not exist
  - `500` Internal Server Error

#### Cancel Itinerary Generation
- **Method**: `POST`
- **Path**: `/api/itineraries/:itineraryId/cancel`
- **Description**: Cancels an in-progress itinerary generation
- **Auth**: Required
- **Path Parameters**:
  - `itineraryId` (uuid, required) - Itinerary identifier
- **Request Body**: None
- **Response**:
  ```json
  {
    "itinerary_id": "uuid",
    "status": "cancelled",
    "cancelled_at": "2025-01-16T14:25:00Z"
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `400` Bad Request - Itinerary not in cancellable state
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - Itinerary belongs to different user
  - `404` Not Found - Itinerary does not exist
  - `500` Internal Server Error

#### Download GPX
- **Method**: `GET`
- **Path**: `/api/itineraries/:itineraryId/gpx`
- **Description**: Streams GPX 1.1 file for completed itinerary
- **Auth**: Required
- **Path Parameters**:
  - `itineraryId` (uuid, required) - Itinerary identifier
- **Query Parameters**:
  - `acknowledged` (boolean, required) - Safety disclaimer acknowledgment
- **Request Body**: None
- **Response**: GPX 1.1 XML file stream
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <gpx version="1.1" creator="VibeRide" ...>
    <!-- GPX content -->
  </gpx>
  ```
- **Success**: `200` OK
  - Content-Type: `application/gpx+xml`
  - Content-Disposition: `attachment; filename="mountain-loop-adventure.gpx"`
- **Errors**:
  - `400` Bad Request - Safety disclaimer not acknowledged or itinerary not completed
    ```json
    {
      "error": "Acknowledgment required",
      "message": "You must acknowledge the safety disclaimer before downloading"
    }
    ```
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - Itinerary belongs to different user
  - `404` Not Found - Itinerary does not exist
  - `422` Unprocessable Entity - Itinerary generation failed or incomplete
  - `500` Internal Server Error

#### Delete Itinerary
- **Method**: `DELETE`
- **Path**: `/api/itineraries/:itineraryId`
- **Description**: Soft deletes an itinerary
- **Auth**: Required
- **Path Parameters**:
  - `itineraryId` (uuid, required) - Itinerary identifier
- **Request Body**: None
- **Response**:
  ```json
  {
    "success": true,
    "itinerary_id": "uuid",
    "deleted_at": "2025-01-16T15:30:00Z"
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `401` Unauthorized - Not authenticated
  - `403` Forbidden - Itinerary belongs to different user
  - `404` Not Found - Itinerary does not exist
  - `500` Internal Server Error

---

### 2.4 Analytics (Internal/Admin)

#### Get User Statistics
- **Method**: `GET`
- **Path**: `/api/analytics/users/stats`
- **Description**: Retrieves aggregated user statistics
- **Auth**: Required (service_role only)
- **Query Parameters**:
  - `from` (date, optional) - Start date for statistics
  - `to` (date, optional) - End date for statistics
- **Request Body**: None
- **Response**:
  ```json
  {
    "total_users": 1250,
    "users_with_completed_profiles": 1125,
    "profile_completion_rate": 0.90,
    "active_users_30d": 450,
    "new_users_30d": 85
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `401` Unauthorized - Not authenticated or insufficient permissions
  - `500` Internal Server Error

#### Get Generation Statistics
- **Method**: `GET`
- **Path**: `/api/analytics/generations/stats`
- **Description**: Retrieves aggregated generation statistics
- **Auth**: Required (service_role only)
- **Query Parameters**:
  - `from` (date, optional) - Start date for statistics
  - `to` (date, optional) - End date for statistics
- **Request Body**: None
- **Response**:
  ```json
  {
    "total_generations": 5430,
    "completed_generations": 5320,
    "failed_generations": 85,
    "cancelled_generations": 25,
    "failure_rate": 0.016,
    "avg_generation_time_seconds": 15.3,
    "p95_generation_time_seconds": 18.7,
    "generations_per_user": {
      "mean": 4.3,
      "median": 3.0,
      "users_with_3_plus": 892
    },
    "estimated_cost_usd": 127.50
  }
  ```
- **Success**: `200` OK
- **Errors**:
  - `401` Unauthorized - Not authenticated or insufficient permissions
  - `500` Internal Server Error

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Primary Method**: Supabase Auth with Google OAuth provider

#### Implementation Details:

1. **OAuth Flow**:
   - Client initiates login via Supabase Auth SDK
   - Server redirects to Google OAuth consent screen
   - Google redirects back to application with authorization code
   - Server exchanges code for tokens via Supabase Auth
   - Supabase creates/retrieves user record in `auth.users`
   - Server creates session with JWT
   - Client stores session token (httpOnly cookie)

2. **Session Management**:
   - Sessions use Supabase JWT tokens
   - Tokens contain user ID (`sub` claim maps to `auth.users.id`)
   - Tokens are verified using Supabase client
   - Refresh tokens handled automatically by Supabase

3. **Middleware**:
   - Authentication middleware (`src/middleware/index.ts`) checks for valid session on protected routes
   - Extracts user ID from JWT and attaches to request context
   - Redirects unauthenticated requests to landing page

### 3.2 Authorization Model

**Row-Level Security (RLS)**: Enforced at database layer via Supabase

#### Authorization Rules:

1. **User Preferences**:
   - Users can only read/write their own preferences
   - Policy: `user_id = auth.uid()`

2. **Notes**:
   - Users can only access their own notes
   - Policy: `user_id = auth.uid() AND deleted_at IS NULL`

3. **Itineraries**:
   - Users can only access itineraries for their own notes
   - Policy: `user_id = auth.uid() AND deleted_at IS NULL`

4. **Service Role**:
   - Backend API uses service role key for trusted operations
   - Analytics endpoints restricted to service role
   - Policy: `auth.role() = 'service_role'`

#### API-Level Authorization:

- All endpoints (except auth endpoints) require valid session
- User context extracted from JWT in middleware
- API queries automatically filtered by user_id via RLS
- Additional business logic checks:
  - Profile completion required before creating notes
  - Note ownership verified before generating itineraries
  - Itinerary ownership verified before GPX download

### 3.3 Security Headers

All API responses include:
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### User Preferences
- **terrain**: ENUM - must be one of `paved`, `gravel`, `mixed`
- **road_type**: ENUM - must be one of `scenic`, `twisty`, `highway`
- **typical_duration_h**: NUMERIC(4,1)
  - Required
  - Must be greater than 0
  - Maximum 999.9 hours
  - One decimal place precision
- **typical_distance_km**: NUMERIC(6,1)
  - Required
  - Must be greater than 0
  - Maximum 99999.9 km
  - One decimal place precision

#### Notes
- **title**: VARCHAR(120)
  - Required
  - Minimum 1 character (after trimming)
  - Maximum 120 characters
  - Trimmed before validation
  - Must be unique per user (case-sensitive)
  - Database constraint: UNIQUE (user_id, title) WHERE deleted_at IS NULL
- **note_text**: TEXT
  - Required
  - Minimum 10 characters (after trimming)
  - Maximum 1500 characters
  - Trimmed before validation
- **trip_prefs**: JSONB (optional overrides)
  - All fields optional (defaults to empty object {})
  - If provided, follows same validation as user_preferences:
    - `terrain`: "paved" | "gravel" | "mixed"
    - `road_type`: "scenic" | "twisty" | "highway"
    - `duration_h`: Number, > 0, max 999.9
    - `distance_km`: Number, > 0, max 999999.9
  - Null/missing fields inherit from user_preferences during itinerary generation

#### Itineraries
- **request_id**: UUID
  - Required for generation
  - Must be unique per user
  - Client-generated (prevents duplicate submissions)
- **status**: ENUM - one of `pending`, `running`, `completed`, `failed`, `cancelled`
  - Transitions:
    - `pending` → `running` (system initiated)
    - `running` → `completed` | `failed` | `cancelled`
    - Terminal states: `completed`, `failed`, `cancelled`

### 4.2 Business Logic Implementation

#### Profile Completion Gate
- **Rule**: Users must complete preferences before creating notes
- **Status**: ✅ Implemented
- **Implementation**:
  - POST `/api/notes` checks for existing `user_preferences` record via service layer
  - Service throws `PREFERENCES_INCOMPLETE` error if not found
  - Route handler maps to `403 Forbidden` with error code `preferences_incomplete`
  - Error message: "User preferences must be set before creating notes"
  - Frontend redirects to profile page
- **Files**:
  - Service: `src/lib/services/notesService.ts` (`createNote()`)
  - Route: `src/pages/api/notes/index.ts` (POST handler)
  - Tests: `src/lib/services/notesService.test.ts` (7 tests including prerequisite check)

#### Concurrency Control
- **Rule**: One itinerary generation per user at a time
- **Implementation**:
  - Database constraint: `UNIQUE (user_id) WHERE status = 'running'`
  - POST `/api/notes/:noteId/itineraries` attempts insert
  - On constraint violation, returns `409 Conflict`
  - Frontend disables generate button while status = `running`

#### Title Uniqueness
- **Rule**: Note titles must be unique per user (excluding deleted)
- **Status**: ✅ Implemented
- **Implementation**:
  - Database constraint: `UNIQUE (user_id, title) WHERE deleted_at IS NULL`
  - POST `/api/notes` catches unique constraint violation (error code 23505)
  - Service throws `NOTE_TITLE_CONFLICT` error
  - Route handler maps to `409 Conflict` with error code `note_title_conflict`
  - Error message: "A note with this title already exists"
  - Deleted notes don't block reuse of titles
- **Files**:
  - Service: `src/lib/services/notesService.ts` (`createNote()`)
  - Route: `src/pages/api/notes/index.ts` (POST handler)
  - Tests: `src/lib/services/notesService.test.ts` (duplicate title test)

#### Soft Deletion Cascade
- **Rule**: Deleting a note soft-deletes its itineraries
- **Implementation**:
  - Database trigger on `notes.deleted_at`
  - Sets `deleted_at` on related `itineraries` records
  - Maintains referential integrity
  - Allows potential future undelete functionality

#### Version Management
- **Rule**: Each regeneration creates new version
- **Implementation**:
  - Database constraint: `UNIQUE (note_id, version)`
  - New generation calculates `MAX(version) + 1` for note
  - Maintains history of all generations
  - Latest version accessible via materialized view (future optimization)

#### OpenAI Spend Limiting
- **Rule**: Total monthly spend must not exceed configured limit
- **Implementation**:
  - Environment variable: `OPENAI_MONTHLY_SPEND_CAP_USD`
  - Track cumulative cost in memory or cache
  - Before generation, check: `current_month_spend + estimated_cost <= cap`
  - If exceeded, return `429 Too Many Requests`
  - Admin alert at 80% threshold
  - Reset counter on first day of month

#### GPX Safety Disclaimer
- **Rule**: User must acknowledge disclaimer before download
- **Implementation**:
  - GET `/api/itineraries/:id/gpx` requires `acknowledged=true` query param
  - Without acknowledgment, returns `400 Bad Request` with disclaimer text
  - Frontend shows modal before setting query param
  - No server-side storage of acknowledgment (transactional)

#### Full-Text Search
- **Rule**: Search notes by content
- **Status**: ✅ Implemented
- **Implementation**:
  - Uses `search_vector` generated column (tsvector) on notes table
  - GET `/api/notes?search=query` uses Supabase `.textSearch()` method
  - Searches against `note_text` field via `search_vector` column
  - Simple language config (no stemming for MVP)
  - GIN index `idx_notes_search` ensures fast queries
  - Search query max length: 250 characters
  - Case-insensitive, exact token matching
- **Files**:
  - Validator: `src/lib/validators/notes.ts` (`listNotesQuerySchema`)
  - Service: `src/lib/services/notesService.ts` (`listNotes()`)
  - Route: `src/pages/api/notes/index.ts` (GET handler)
  - Tests: `src/lib/validators/notes.test.ts`, `src/lib/services/notesService.test.ts`
- **Limitations**:
  - No phrase matching or fuzzy search
  - No search ranking/relevance scoring
  - Future enhancement: Advanced search with ranking

#### Preference Override Resolution
- **Rule**: Note-level preferences override user defaults
- **Implementation**:
  - Generation endpoint resolves preferences in order:
    1. Check `notes.trip_prefs` for each field
    2. Fall back to `user_preferences` if null/missing
    3. Use resolved values in AI prompt
  - All fields optional in override
  - Validation applied to final resolved values

### 4.3 Error Handling Standards

#### Error Response Format
All errors follow consistent JSON structure:
```json
{
  "error": "Short error code/message",
  "message": "Human-readable description",
  "details": {
    "field": "Specific validation message"
  },
  "timestamp": "2025-01-16T15:30:00Z",
  "request_id": "uuid"
}
```

#### Error Categories
- **400 Bad Request**: Client validation errors, malformed requests
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions or business rule violation
- **404 Not Found**: Resource does not exist or soft-deleted
- **409 Conflict**: Uniqueness constraint or state conflict
- **422 Unprocessable Entity**: Semantic errors (e.g., incomplete itinerary)
- **429 Too Many Requests**: Rate limiting or quota exceeded
- **500 Internal Server Error**: Unexpected server errors
- **502 Bad Gateway**: External service (OpenAI) errors
- **503 Service Unavailable**: Temporary service degradation

#### Retry Guidance
Errors include retry hints:
```json
{
  "error": "Service temporarily unavailable",
  "retry_after": 60,
  "exponential_backoff": true
}
```

### 4.4 Data Integrity

#### Timestamps
- `created_at`: Set once on insert, immutable
- `updated_at`: Automatically updated by trigger on every row change
- All timestamps use `TIMESTAMPTZ` in UTC

#### Audit Trail
- Soft deletes preserve records with `deleted_at` timestamp
- Version history maintained in `itineraries` table
- No updates to itineraries after completion (immutable)

#### Foreign Key Integrity
- `notes.user_id` → `auth.users.id` (ON DELETE CASCADE)
- `itineraries.note_id` → `notes.note_id` (ON DELETE CASCADE via trigger)
- `itineraries.user_id` → `auth.users.id` (ON DELETE CASCADE)

---

## 5. Rate Limiting and Performance

### 5.1 Rate Limits

#### Per-User Rate Limits
- **Itinerary Generation**: 1 concurrent, 20 per day
- **Note Creation**: 50 per hour
- **API Requests**: 1000 per hour (general)

#### Global Rate Limits
- **OpenAI API**: Configurable monthly spend cap (default $500)
- **Database Queries**: Managed by Supabase connection pooling

### 5.2 Performance Requirements

#### Response Time Targets
- **GET requests**: < 100ms (p95)
- **POST/PUT/DELETE**: < 200ms (p95)
- **Itinerary Generation**: < 20s (p95)
- **GPX Download**: < 2s for typical file

#### Optimization Strategies
- Use database indexes for frequent queries
- Cache user preferences in session
- Stream GPX files (no server storage)
- Paginate list endpoints (default 20, max 100)
- Use materialized view for latest itineraries (future)
- Implement CDN for static assets

### 5.3 Monitoring and Observability

#### Health Check Endpoint
- **Method**: `GET`
- **Path**: `/api/health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "auth": "operational",
    "timestamp": "2025-01-16T15:30:00Z"
  }
  ```

#### Metrics to Track
- Request rate per endpoint
- Response times (p50, p95, p99)
- Error rates by status code
- Itinerary generation success/failure rates
- OpenAI API costs
- Active user sessions
- Database connection pool utilization

---

## 6. Versioning and Compatibility

### 6.1 API Versioning Strategy

**Current Version**: v1 (implicit in all endpoints)

- No version prefix in URL for MVP (all paths are v1)
- Future breaking changes will introduce `/api/v2/*` prefix
- Non-breaking changes (new optional fields) added to v1
- Deprecated endpoints receive 3-month sunset notice

### 6.2 Backward Compatibility

#### Guaranteed Stable
- Endpoint paths and HTTP methods
- Required request parameters
- Response status codes for success cases
- Core response fields

#### Subject to Addition (Non-Breaking)
- New optional request parameters
- New response fields (clients should ignore unknown fields)
- New HTTP headers
- New error codes (clients should handle gracefully)

---

## 7. Implementation Notes

### 7.1 Technology Alignment

- **Astro 5**: API routes defined in `src/pages/api/`
- **Supabase**: Database operations via `@supabase/supabase-js` client
- **TypeScript**: Shared types in `src/types.ts` for requests/responses
- **Authentication**: Supabase Auth SDK for OAuth and session management

### 7.2 API Route Organization

**Planned Structure:**
```
src/pages/api/
├── user/
│   └── preferences.ts     # ✅ GET/PUT preferences
├── notes/
│   ├── index.ts           # ✅ GET list, POST create
│   └── [noteId]/
│       ├── index.ts       # ✅ GET/PUT/DELETE note
│       ├── archive.ts     # 🔲 POST archive
│       ├── unarchive.ts   # 🔲 POST unarchive
│       └── itineraries/
│           └── index.ts   # ✅ GET list, POST generate
├── itineraries/
│   └── [itineraryId]/
│       ├── index.ts       # ✅ GET/DELETE itinerary
│       ├── status.ts      # ✅ GET generation status
│       ├── cancel.ts      # ✅ POST cancel generation
│       └── gpx.ts         # ✅ GET download GPX
├── analytics/
│   ├── users/
│   │   └── stats.ts       # 🔲 GET user statistics
│   └── generations/
│       └── stats.ts       # 🔲 GET generation statistics
└── health.ts              # 🔲 GET health check
```

**Implemented Supporting Files:**
```
src/lib/
├── validators/
│   ├── notes.ts           # ✅ Zod schemas (tripPreferences, createNote, updateNote, listNotesQuery, noteIdParam)
│   ├── notes.test.ts      # ✅ 49 passing tests
│   ├── userPreferences.ts # ✅ User preferences validation
│   └── itinerary.ts       # ✅ Itinerary generation validation
├── services/
│   ├── notesService.ts    # ✅ listNotes(), createNote(), getNoteById(), updateNote(), deleteNote()
│   ├── notesService.test.ts # ✅ 29 passing tests (unit tests)
│   ├── userPreferencesService.ts # ✅ User preferences service
│   └── itineraryService.ts # ✅ Itinerary generation service
├── http.ts                # ✅ HTTP helpers (jsonResponse, errorResponse)
└── logger.ts              # ✅ Structured logging
```

**Test Files:**
```
src/pages/api/notes/[noteId]/
└── index.test.ts          # ✅ 18 passing tests (integration tests)
```

### 7.3 Shared Type Definitions

Located in `src/types.ts`:
```typescript
// User types
export type Terrain = 'paved' | 'gravel' | 'mixed';
export type RoadType = 'scenic' | 'twisty' | 'highway';
export type ItineraryStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Entity types
export interface UserPreferences { ... }
export interface Note { ... }
export interface Itinerary { ... }

// Request/Response DTOs
export interface CreateNoteRequest { ... }
export interface NoteResponse { ... }
// ... etc
```

### 7.4 Database Access Pattern

- Use Supabase client with service role key for API routes
- RLS policies provide additional security layer
- Prefer Supabase query builder over raw SQL for type safety
- Use parameterized queries to prevent SQL injection
- Enable statement timeout (30s) to prevent long-running queries

**Implemented Patterns:**
- **Service Layer**: All database operations encapsulated in service functions (`src/lib/services/`)
- **Query Building**: Dynamic Supabase queries with method chaining (`.select()`, `.eq()`, `.textSearch()`, etc.)
- **Error Handling**: Service functions throw typed errors, route handlers map to HTTP status codes
- **Pagination**: Offset-based with `.range()` method and `count: "exact"` for metadata
- **Aggregation**: Separate optimized queries for related data (e.g., itinerary counts)
- **Validation**: Zod schemas in validators (`src/lib/validators/`) before service calls
- **Logging**: Structured logging with context (userId, noteId, etc.) via `src/lib/logger.ts`

**Example Query Pattern** (from `listNotes()`):
```typescript
let query = supabase
  .from('notes')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .is('deleted_at', null);

if (params.archived) {
  query = query.not('archived_at', 'is', null);
} else {
  query = query.is('archived_at', null);
}

if (params.search) {
  query = query.textSearch('search_vector', params.search);
}

const { data, error, count } = await query
  .order(params.sort, { ascending: params.order === 'asc' })
  .range(offset, offset + params.limit - 1);
```

---

## 8. Future Enhancements (Post-MVP)

### Potential API Extensions
- WebSocket endpoint for real-time generation progress
- Batch itinerary generation endpoint
- Note sharing and collaboration endpoints
- Export endpoints (PDF, KML formats)
- Import endpoints (GPX, KML parsing)
- User preferences for notification settings
- Comments/notes on itinerary segments
- Weather data integration for planned routes
- Fuel stop suggestions along route
- Social features (public profiles, following)

### Potential Optimizations
- GraphQL endpoint for flexible querying
- Server-sent events for generation progress
- Caching layer (Redis) for frequently accessed data
- Edge functions for low-latency global access
- Image optimization for user-uploaded photos
- Background job queue for long-running tasks

