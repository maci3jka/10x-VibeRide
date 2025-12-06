# API Endpoint Implementation Plan: Generate Itinerary (`POST /api/notes/:noteId/itineraries`)

## 1. Endpoint Overview
Starts AI-powered itinerary generation for an existing note.  
Creates a new `itineraries` row in **pending** state and returns minimal generation metadata.  
Generation runs asynchronously (handled by background worker, out of scope).

## 2. Request Details
- **HTTP Method**: `POST`
- **URL**: `/api/notes/:noteId/itineraries`
- **Authentication**: Required  
  - Bypassed when `process.env.DEVENV === 'true'`
- **Path Parameters**  
  | Name      | Type  | Constraints                              |
  |-----------|-------|------------------------------------------|
  | `noteId`  | uuid  | required, must belong to caller          |
- **Headers**: `Content-Type: application/json`
- **Request Body** (`GenerateItineraryRequest`)  
  | Field        | Type  | Constraints                                      |
  |--------------|-------|--------------------------------------------------|
  | `request_id` | uuid  | required, client-generated, unique per user row |

### Validation Rules
1. `noteId` is valid uuid.
2. JSON body present and parseable.
3. `request_id` is valid uuid string.
4. Caller owns the note (`note.user_id = auth.uid()`).
5. Caller has completed `user_preferences`.
6. No running generation exists (`status = 'running'` partial unique index).
7. Estimated OpenAI cost within monthly cap (`OPENAI_MONTHLY_SPEND_CAP_USD`).

## 3. Used Types
- Command model: `GenerateItineraryRequest`
- Response DTO: `GenerateItineraryResponse`
- Internal entities: `Itinerary`, `Note`, `UserPreferences`
- Helper enums: `ItineraryStatus`

## 4. Response Details
| Status | Scenario                                           | Body                          |
|--------|----------------------------------------------------|-------------------------------|
| **202 Accepted** | Generation successfully initiated          | `GenerateItineraryResponse`   |
| **400 Bad Request** | Validation failures (uuid, body)         | `ErrorResponse`               |
| **401 Unauthorized** | Missing / invalid JWT                    | `ErrorResponse`               |
| **403 Forbidden** | Note not owned by user <br>• Preferences missing | `ErrorResponse` |
| **404 Not Found** | Note does not exist / soft-deleted        | `ErrorResponse`               |
| **409 Conflict** | Another generation already running        | `ErrorResponse` (includes `active_request_id`) |
| **429 Too Many Requests** | Monthly OpenAI spend cap exceeded       | `ErrorResponse`               |
| **500 Internal Server Error** | DB / unexpected error                 | `ErrorResponse`               |

`GenerateItineraryResponse`
{
  "itinerary_id": "uuid",
  "note_id": "uuid",
  "version": 1,
  "status": "pending",
  "request_id": "uuid",
  "created_at": "ISO8601"
}## 5. Data Flow
1. **Route** `src/pages/api/notes/[noteId]/itineraries/index.ts` receives POST.
2. Middleware injects `locals.supabase` ± `locals.user`.
3. Parse & validate body with Zod (`generateItinerarySchema`).
4. Call `itineraryService.startGeneration({ supabase, noteId, userId, requestId })`:
   1. Verify note ownership (`notes`).
   2. Ensure preferences row exists.
   3. Insert new row into `itineraries` with:
      - `status = 'pending'`
      - `version = COALESCE(MAX(version) + 1, 1)` (single query using `select max`)
   4. Handle unique-violation on partial index (running row) → translate to **409**.
5. Return **202** with inserted row (selected columns only).
6. Background worker (outside scope) picks new row and updates status.

## 6. Security Considerations
- **Auth**: JWT verified; bypass in dev mode.
- **RLS**: Supabase policies already enforce `user_id = auth.uid()`.
- Ignore any `user_id` field in body (server sets owner).
- Concurrency control enforced by partial unique index + service check.
- Rate limiting: rely on global middleware (future).
- Validate UUIDs with Zod to mitigate injection vectors.
- Ensure OpenAI cost cap check before insertion to avoid charge overflow.

## 7. Error Handling
| Case | HTTP | Handling | Log message |
|------|------|----------|-------------|
| Invalid JSON / schema | 400 | Return `validation_failed` with `details` | `logger.warn` |
| Missing auth | 401 | Early return | none (middleware) |
| Note not found | 404 | `note_not_found` | `logger.info` |
| Forbidden ownership | 403 | `forbidden` | `logger.warn` |
| Preferences missing | 403 | `profile_incomplete` | `logger.info` |
| Generation in progress | 409 | `generation_in_progress` + `active_request_id` | `logger.info` |
| Spend cap exceeded | 429 | `service_limit_reached` | `logger.info` |
| Supabase error | 500 | `server_error` | `logger.error` |
All errors mapped via `src/lib/http.ts` helpers for consistent shape.

## 8. Performance Considerations
- Single INSERT with partial SELECT → O(1).
- Indexes already present (`idx_itineraries_user_status`).
- Use explicit column list instead of `*`.
- Keep payload small (<1 KB).
- Avoid extra DB round-trip by performing version calc & insert in one CTE.

## 9. Implementation Steps
1. **Validator**  
   `src/lib/validators/itinerary.ts` → `generateItinerarySchema` (Zod: `request_id` uuid).
2. **Service**  
   Create `src/lib/services/itineraryService.ts`  
   - `startGeneration(supabase, userId, noteId, requestId): Promise<GenerateItineraryResponse>`
   - Reuse existing Supabase types for strong typing.
3. **Route**  
   `src/pages/api/notes/[noteId]/itineraries/index.ts`  
   - Implement `POST` handler following data flow.  
   - `export const prerender = false;`
4. **Error Helpers**  
   If not yet present, extend `src/lib/http.ts` with `errorResponse` & `jsonResponse`.
5. **Tests**  
   - Unit: validator & service (success, conflict, forbidden, spend-cap).  
   - Integration: endpoint happy path + major error paths using mocked Supabase (`tests/utils/mockSupabase.ts`).
6. **Docs**  
   - Add example cURL to `.ai/api-plan.md` under Itineraries section.
7. **CI**  
   - Update coverage thresholds if needed.
8. **Commit**  
   Conventional commit: `feat(api): add generate itinerary endpoint`.

---

# API Endpoint Implementation Plan: List Itineraries (`GET /api/notes/:noteId/itineraries`)

## 1. Endpoint Overview
Returns **all** itinerary versions for a specific note (owned by caller), ordered by `version DESC`.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL**: `/api/notes/:noteId/itineraries`
- **Authentication**: Required (bypass with `DEVENV === 'true'`)
- **Path Parameters**
  | Name | Type | Constraints |
  |------|------|-------------|
  | `noteId` | uuid | required, caller must own note |
- **Query Parameters**
  | Name | Type | Default | Purpose |
  |------|------|---------|---------|
  | `status` | `'pending'\|'running'\|'completed'\|'failed'\|'cancelled'` | none | Filter by status |
  | `limit` | `number` | 20 | Max items to return (capped at 100) |

## 3. Used Types
- Response DTO: `ItinerariesListResponse` (array of `ItineraryListItemResponse`)

## 4. Response Details
| Status | Scenario | Body |
|--------|----------|------|
| **200 OK** | Success | `ItinerariesListResponse` |
| **400 Bad Request** | Invalid query param | `ErrorResponse` |
| **401 Unauthorized** | No / bad JWT | `ErrorResponse` |
| **403 Forbidden** | Note owned by another user | `ErrorResponse` |
| **404 Not Found** | Note missing | `ErrorResponse` |
| **500 Internal Server Error** | DB failure | `ErrorResponse` |

## 5. Data Flow
1. Route `src/pages/api/notes/[noteId]/itineraries/index.ts` receives GET.
2. Validate `noteId` uuid & query params with Zod.
3. Verify note ownership.
4. Build Supabase query against `itineraries` table:
   - `filter('note_id', noteId)`
   - optional `eq('status', status)`
   - `order('version', { ascending: false })`
   - `limit(limit)`
5. Return wrapped list.

## 6. Security Considerations
Same as POST + validate `limit` to prevent DoS.

## 7. Error Handling
Mirror table above; mapping via `lib/http`.

## 8. Performance Considerations
- Index on `(note_id)` covers query.
- Add `status` filter uses column selectivity; consider composite index `(note_id, status)` later.

## 9. Implementation Steps
1. Extend `itineraryService` with `listByNote(noteId, userId, { status, limit })`.
2. Add Zod `listItinerariesQuerySchema`.
3. Implement GET handler.
4. Unit + integration tests.

---

# API Endpoint Implementation Plan: Get Itinerary (`GET /api/itineraries/:itineraryId`)

## 1. Endpoint Overview
Fetch single itinerary row by id (must belong to caller).

## 2. Request Details
- **HTTP Method**: `GET`
- **URL**: `/api/itineraries/:itineraryId`
- **Authentication**: Required
- **Path Parameters**: `itineraryId` (uuid, required)

## 3. Used Types
- Response DTO: `ItineraryResponse`

## 4. Response Details
| Status | Scenario | Body |
|--------|----------|------|
| **200 OK** | Success | `ItineraryResponse` |
| **401 Unauthorized** | No / bad JWT | `ErrorResponse` |
| **403 Forbidden** | Row belongs to another user | `ErrorResponse` |
| **404 Not Found** | Row absent / soft-deleted | `ErrorResponse` |
| **500 Internal Server Error** | DB error | `ErrorResponse` |

## 5. Data Flow
1. Route `src/pages/api/itineraries/[itineraryId]/index.ts` GET.
2. Validate uuid via Zod.
3. Query `itineraries` `.eq('itinerary_id', id).single()`.
4. Supabase RLS enforces ownership; if RLS returns null, treat as 404.
5. Return row.

## 6. Security Considerations
- RLS ensures owner-only access.
- No query params, body; minimal risk.

## 7. Error Handling & Performance
Straightforward select by PK (indexed).

## 8. Implementation Steps
- `getById(supabase, userId, itineraryId)` in service.
- Handler + tests.

---

# API Endpoint Implementation Plan: Delete Itinerary (`DELETE /api/itineraries/:itineraryId`)

## 1. Endpoint Overview
Soft-deletes an itinerary (sets `deleted_at` timestamp). Does **not** affect other versions.

## 2. Request Details
- **HTTP Method**: `DELETE`
- **URL**: `/api/itineraries/:itineraryId`
- **Authentication**: Required
- **Path Parameters**: `itineraryId` uuid

## 3. Used Types
- Response DTO: `DeleteItineraryResponse`

## 4. Response Details
| Status | Scenario | Body |
|--------|----------|------|
| **200 OK** | Deleted | `DeleteItineraryResponse` |
| **401 Unauthorized** | No / bad JWT | `ErrorResponse` |
| **403 Forbidden** | Row belongs to other user | `ErrorResponse` |
| **404 Not Found** | Already deleted / not found | `ErrorResponse` |
| **400 Bad Request** | Generation still running (cannot delete) | `ErrorResponse` |
| **500 Internal Server Error** | DB error | `ErrorResponse` |

## 5. Data Flow
1. Route `src/pages/api/itineraries/[itineraryId]/index.ts` DELETE.
2. Validate uuid.
3. Fetch row: ensure `status` is terminal (`isTerminalStatus`).
4. Update row: `.update({ deleted_at: new Date().toISOString() })` with `.eq('itinerary_id', id).is('deleted_at', null).single()`.
5. Return confirmation.

## 6. Security Considerations
- RLS restricts to owner.
- Prevent deletion when status not terminal (business rule).

## 7. Error Handling
- Non-terminal status → **400** `cannot_delete_nonterminal`.
- Not found → **404**.

## 8. Performance Considerations
Single indexed UPDATE.

## 9. Implementation Steps
1. Add `softDelete(supabase, userId, itineraryId)` in service (including status check).
2. Implement DELETE handler.
3. Add Zod guard `isUuid` if reused.
4. Unit tests: delete success, cannot delete running, repeat delete 404.
5. Integration test.

---

# API Endpoint Implementation Plan: Get Generation Status (`GET /api/itineraries/:itineraryId/status`)

## 1. Endpoint Overview
Polls generation status of an itinerary. Returns minimal progress info while running and full summary when completed.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL**: `/api/itineraries/:itineraryId/status`
- **Authentication**: Required (bypass in dev mode)
- **Path Parameters**: `itineraryId` uuid

## 3. Used Types
- Response DTO: `ItineraryStatusResponse`

## 4. Response Details
| Status | Scenario | Body |
|--------|----------|------|
| **200 OK** | Success | `ItineraryStatusResponse` |
| **401 Unauthorized** | No / bad JWT | `ErrorResponse` |
| **403 Forbidden** | Row belongs to other user | `ErrorResponse` |
| **404 Not Found** | Row not found | `ErrorResponse` |
| **500** | DB error | `ErrorResponse` |

## 5. Data Flow
1. Route `src/pages/api/itineraries/[itineraryId]/status.ts`.
2. Validate uuid.
3. Query row via PK, select minimal columns.
4. Map row → variant of `ItineraryStatusResponse`.

## 6. Error Handling & Security
Same owner / RLS pattern as GET by id.

## 7. Implementation Steps
- Add `getStatus` in service.
- Handler + tests.

---

# API Endpoint Implementation Plan: Cancel Generation (`POST /api/itineraries/:itineraryId/cancel`)

## 1. Endpoint Overview
Allows user to cancel a **pending** or **running** generation. Marks status `cancelled` and sets `cancelled_at`.

## 2. Request Details
- **HTTP Method**: `POST`
- **URL**: `/api/itineraries/:itineraryId/cancel`
- **Authentication**: Required
- **Path Parameters**: `itineraryId` uuid
- **Request Body**: none

## 3. Used Types
- Response DTO: `CancelItineraryResponse`

## 4. Response Details
| Status | Scenario | Body |
|--------|----------|------|
| **200 OK** | Cancelled | `CancelItineraryResponse` |
| **400 Bad Request** | Not cancellable (terminal status) | `ErrorResponse` |
| **401 Unauthorized** | No / bad JWT | `ErrorResponse` |
| **403 Forbidden** | Not owner | `ErrorResponse` |
| **404 Not Found** | Row not found | `ErrorResponse` |
| **500** | DB error | `ErrorResponse` |

## 5. Data Flow
1. Route `src/pages/api/itineraries/[itineraryId]/cancel.ts`.
2. Validate uuid.
3. Fetch row; ensure status in `['pending','running']`.
4. Update status to `cancelled`, set `cancelled_at`.
5. Trigger background worker clean-up (future).

## 6. Implementation Steps
- `cancelGeneration` in service (checks + update).
- Handler & tests.

---

# API Endpoint Implementation Plan: Download GPX (`GET /api/itineraries/:itineraryId/gpx`)

## 1. Endpoint Overview
Streams a GPX 1.1 file for a **completed** itinerary. Requires safety disclaimer acknowledgment (`acknowledged=true`).

## 2. Request Details
- **HTTP Method**: `GET`
- **URL**: `/api/itineraries/:itineraryId/gpx`
- **Authentication**: Required
- **Path Parameters**: `itineraryId` uuid
- **Query Parameters**: `acknowledged=true` (required boolean)

## 3. Used Types
- Returns raw `application/gpx+xml` stream (no DTO)

## 4. Response Details
| Status | Scenario | Body / Headers |
|--------|----------|----------------|
| **200 OK** | Success | GPX file stream `Content-Type: application/gpx+xml` |
| **400 Bad Request** | Missing ack OR not completed | `ErrorResponse` |
| **401 Unauthorized** | No / bad JWT | `ErrorResponse` |
| **403 Forbidden** | Not owner | `ErrorResponse` |
| **404 Not Found** | Row not found | `ErrorResponse` |
| **422 Unprocessable Entity** | Generation failed/incomplete | `ErrorResponse` |
| **500** | GPX generation error | `ErrorResponse` |

## 5. Data Flow
1. Route `src/pages/api/itineraries/[itineraryId]/gpx.ts`.
2. Validate uuid & `acknowledged` query.
3. Fetch itinerary row – ensure `status === 'completed'` & `gpx_metadata` present.
4. Generate GPX on-the-fly (`gpxService.generate(summary_json)`), stream via `Response` with proper headers.

## 6. Security & Performance
- Streaming avoids mem bloat; use `ReadableStream`.
- GPX generation pure-TS util in `lib/services/gpxService.ts`.
- Rate-limit: max 5 downloads / min (future).

## 7. Implementation Steps
1. Add `gpxService.generate(itinerary)` returning `ReadableStream`.
2. Add `downloadGpx` handler.
3. Unit tests: validation, header checks; integration: happy path with mock service.
