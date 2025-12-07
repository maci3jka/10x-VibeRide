# REST API Endpoint Implementation Plan: Notes CRUD & Archive

> Covers the five remaining Notes endpoints required for MVP.

---

## 1. GET `/api/notes/:noteId`
### 1.1 Endpoint Overview
Returns full detail of a single note (including AI summary) that belongs to the authenticated user.

### 1.2 Request Details
- **HTTP Method**: `GET`
- **URL**: `/api/notes/:noteId`
- **Auth**: Required (bypass with `DEVENV==='true'`)
- **Path Parameter**: `noteId` (uuid, required)

### 1.3 Used Types
- Response DTO: `NoteResponse`

### 1.4 Response Details
| Status | Meaning | Body |
|--------|---------|------|
| 200 OK | Success | `NoteResponse` |
| 401 | Unauthenticated | `ErrorResponse` |
| 403 | Not owner | `ErrorResponse` |
| 404 | Note not found or deleted | `ErrorResponse` |
| 500 | Server error | `ErrorResponse` |

### 1.5 Data Flow
1. Handler `src/pages/api/notes/[noteId]/index.ts` – `GET`.
2. Validate uuid via Zod.
3. Fetch row with `.eq('note_id', id).single()`; RLS enforces ownership.
4. If `deleted_at` not null → 404.
5. Return row (omit search_vector).

### 1.6 Implementation Steps
- `noteService.getById(supabase, userId, noteId)`.
- Add GET handler + tests.

---

## 2. PUT `/api/notes/:noteId`
### 2.1 Endpoint Overview
Updates note content & optional preference overrides.

### 2.2 Request Details
- **HTTP Method**: `PUT`
- **URL**: `/api/notes/:noteId`
- **Auth**: Required
- **Path Parameter**: `noteId` uuid
- **Request Body**: `UpdateNoteRequest`

### 2.3 Validation Rules
- Title unique per user (handled by DB conflict).
- Text length (10–1500 chars).
- `trip_prefs` fields follow same validation as preferences.

### 2.4 Used Types
- Command: `UpdateNoteRequest`
- Response: `NoteResponse`

### 2.5 Response Table
| Status | Meaning |
|--------|---------|
| 200 OK | Updated |
| 400 | Validation fails | 
| 401 | Unauthenticated |
| 403 | Not owner |
| 404 | Note not found |
| 409 | Title conflict |
| 500 | Server error |

### 2.6 Data Flow
1. Parse body → Zod schema `updateNoteSchema`.
2. Ensure user owns note.
3. `supabase.from('notes').update({...dto, updated_at: now}).eq('note_id', id).single()`.
4. Handle error `code: '23505'` title conflict → 409.

### 2.7 Implementation Steps
- Extend `noteService.update`.
- Update validator file.
- PUT handler & tests.

---

## 3. DELETE `/api/notes/:noteId`
### 3.1 Overview
Soft-deletes note (sets `deleted_at`); DB trigger cascades to itineraries.

### 3.2 Request/Response
- **HTTP**: `DELETE`
- **Response DTO**: `DeleteNoteResponse`
- **Status Codes**: 200, 401, 403, 404, 500.

### 3.3 Data Flow
1. Validate uuid.
2. Update `deleted_at` where null.
3. Return confirmation.

### 3.4 Implementation Steps
- `noteService.softDelete` (update + trigger cascade).
- DELETE handler; forbid repeat delete (404).

---

## 4. POST `/api/notes/:noteId/archive`
### 4.1 Overview
Archives a note (sets `archived_at`).

### 4.2 Details
- **HTTP**: `POST`
- **Request Body**: none
- **Response**: `ArchiveNoteResponse`
- **Status**: 200 / 401 / 403 / 404 / 500

### 4.3 Data Flow
1. Validate uuid.
2. `.update({ archived_at: now })` where `archived_at` is null.
3. Return response.

### 4.4 Steps
- `noteService.archive`.
- POST handler & tests.

---

## 5. POST `/api/notes/:noteId/unarchive`
### 5.1 Overview
Clears `archived_at` timestamp.

### 5.2 Details
- Same route pattern; Response: `UnarchiveNoteResponse`.
- **Status**: 200 / 401 / 403 / 404 / 500

### 5.3 Data Flow
1. Validate uuid.
2. `.update({ archived_at: null })` where `archived_at` not null.

### 5.4 Steps
- `noteService.unarchive`.
- POST handler & tests.

---

## 6. Shared Considerations
### 6.1 Security
- RLS: `user_id = auth.uid()` ensures isolation.
- All handlers honour dev bypass via `DEVENV`.
- Ignore `user_id` in body.

### 6.2 Error Handling
Use common `errorResponse` helper with codes:
- `validation_failed`, `unauthenticated`, `forbidden`, `note_not_found`, `title_conflict`, `server_error`.

### 6.3 Performance
- PK & `(user_id,title)` unique index covers queries.
- Updates are single-row.

### 6.4 Implementation Checklist
1. Validators in `lib/validators/note.ts` (`updateNoteSchema`).
2. Services in `lib/services/noteService.ts` (get, update, softDelete, archive, unarchive).
3. Route files:
   - `src/pages/api/notes/[noteId]/index.ts` (`GET`, `PUT`, `DELETE`)
   - `src/pages/api/notes/[noteId]/archive.ts`
   - `src/pages/api/notes/[noteId]/unarchive.ts`
4. Unit tests for service & validator.
5. Integration tests for each handler.
6. Docs: update `.ai/api-plan.md` examples.
7. Conventional commits for each logical chunk.
