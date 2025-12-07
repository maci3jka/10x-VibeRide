# API Endpoint Implementation Plan: /api/notes/:noteId (GET, PUT, DELETE)

## 1. Endpoint Overview
Implements full CRUD operations for an individual note:
1. **GET** `/api/notes/:noteId` – fetch single note.
2. **PUT** `/api/notes/:noteId` – update note.
3. **DELETE** `/api/notes/:noteId` – soft-delete note and cascade delete itineraries.
All routes live in `src/pages/api/notes/[noteId]/index.ts` and reuse shared validation, service and error-handling helpers.

## 2. Request Details
| Method | URL | Auth | Body | Success |
|--------|-----|------|------|---------|
| GET    | `/api/notes/:noteId` | Required (skipped if `DEVENV=true`) | — | `200 OK` |
| PUT    | `/api/notes/:noteId` | Required | `UpdateNoteRequest` (JSON) | `200 OK` |
| DELETE | `/api/notes/:noteId` | Required | — | `200 OK` |

### 2.1 Path Parameters
- `noteId` `uuid` (required) – validated UUID v4.

### 2.2 Request Body (PUT)
```json
{
  "title": "string (1-120)",
  "note_text": "string (10-1500)",
  "trip_prefs": {
    "terrain": "paved | gravel | mixed",
    "road_type": "scenic | twisty | highway",
    "duration_h": "number >0 ≤999.9",
    "distance_km": "number >0 ≤999999.9"
  }
}
```
Content-Type **must** be `application/json`.

## 3. Used Types
- `UpdateNoteRequest` (`src/types.ts` §4. Request DTOs)
- `NoteResponse` (success for GET/PUT)
- `DeleteNoteResponse` (success for DELETE)
- `ErrorResponse` (shared)

## 4. Response Details
### 4.1 Success
| Method | Status | Body |
|--------|--------|------|
| GET    | 200 | `NoteResponse` |
| PUT    | 200 | `NoteResponse` (updated values) |
| DELETE | 200 | `DeleteNoteResponse` |

### 4.2 Error Codes
| Status | When | Error code |
|--------|------|-----------|
| 400 | Invalid UUID / body validation | `validation_failed` / `invalid_parameter` |
| 401 | Missing / invalid session (unless `DEVENV=true`) | `unauthenticated` |
| 403 | Note belongs to another user | `forbidden` |
| 404 | Note not found or deleted | `note_not_found` |
| 409 | Title conflict on update | `note_title_conflict` |
| 500 | Unhandled errors | `server_error` |

## 5. Data Flow
1. **Middleware** (`src/middleware/index.ts`) extracts `supabase` client + `userId` (unless dev mode).
2. **Route Handler**
   - Parse & validate `noteId` (Zod UUID).
   - Switch by method.
3. **Service Layer** (`src/lib/services/notesService.ts`)
   - `getNoteById(noteId, userId)` – SELECT … `deleted_at IS NULL`.
   - `updateNote(noteId, userId, dto)` – UPDATE with returning clause.
   - `deleteNote(noteId, userId)` – UPDATE `deleted_at=now()` + trigger cascades.
4. **Database** – Supabase RLS enforces row ownership; unique index prevents duplicate titles.
5. **HTTP Helpers** (`sendJson`, `sendError`) format output.
6. **Logger** records errors with context `{ noteId, userId }`.

## 6. Security Considerations
- **Authentication**: Supabase JWT via middleware; bypass when `DEVENV=true`.
- **Authorization**: Confirm note belongs to `userId`; otherwise 403.
- **RLS**: additional safety – only owner rows selectable/updatable.
- **Input Validation**: Zod schemas; reject invalid JSON / content type.
- **Rate Limiting**: existing generic middleware (1000 req/h) applies.
- **Soft Delete**: DELETE only marks `deleted_at`, preserving history.

## 7. Error Handling
Use `sendError` helper to map service errors → HTTP codes:
| Service Error | HTTP | message |
|---------------|------|---------|
| `NOTE_NOT_FOUND` | 404 | note_not_found |
| `FORBIDDEN` | 403 | forbidden |
| `VALIDATION_FAILED` | 400 | validation_failed |
| `TITLE_CONFLICT` | 409 | note_title_conflict |
| default | 500 | server_error |
All errors logged via `logger.error({ err, noteId, userId }, msg)`.

## 8. Performance Considerations
- Single row SELECTs / UPDATEs – indexed PK (`note_id`).
- Use `.single()` fetch to avoid unnecessary array allocation.
- DELETE cascades triggered at DB level (no extra queries).
- Return columns list instead of `*` to reduce payload (<2 KB typical).

## 9. Implementation Steps
1. **DTO & Validator**
   - Ensure `updateNoteSchema` in `src/lib/validators/notes.ts` (reuse `createNoteSchema`).
   - Add `noteIdParamSchema` = `z.string().uuid()`.
2. **Service Layer** (`notesService.ts`)
   - Implement `getNoteById`, `updateNote`, `deleteNote` with typed errors.
   - Add unit tests (Vitest) for happy / error paths.
3. **Route File** `src/pages/api/notes/[noteId]/index.ts`
   - Export `GET`, `PUT`, `DELETE` async functions.
   - Within each: validate inputs → call service → return JSON via helpers.
4. **Database**
   - Soft-delete trigger already cascades itineraries (no change).
5. **Logging**
   - Add contextual logging for each method.
6. **Tests**
   - Integration tests for each HTTP method (happy, unauth, forbidden, 404, 400, 409).
   - Use `mockSupabase` utilities.
7. **Documentation**
   - Update `README` API table + `.ai/api-plan.md` status to ✅.
8. **CI**
   - Ensure Vitest coverage passes (`pnpm test --coverage`).
