# API Endpoint Implementation Plan: /api/notes/:noteId/archive & /unarchive

## 1. Endpoint Overview
Provides soft-archive toggling for notes.

* **POST** `/api/notes/:noteId/archive` – sets `archived_at = now()`.
* **POST** `/api/notes/:noteId/unarchive` – clears `archived_at`.

Separate files:
* `src/pages/api/notes/[noteId]/archive.ts`
* `src/pages/api/notes/[noteId]/unarchive.ts`

Both rely on `notesService` for business logic and share validation, logging and error-handling utilities.

## 2. Request Details
| Method | URL | Auth | Body | Success |
|--------|-----|------|------|---------|
| POST | `/api/notes/:noteId/archive` | Required (skip if `DEVENV=true`) | — | `200 OK` |
| POST | `/api/notes/:noteId/unarchive` | Required | — | `200 OK` |

### 2.1 Path Parameters
- `noteId` `uuid` – validated.

### 2.2 Headers
- `Content-Type` not required (no body). Reject if body present and not JSON.

## 3. Used Types
- `ArchiveNoteResponse`  (src/types.ts line 268)
- `UnarchiveNoteResponse` (line 277)
- `ErrorResponse`

## 4. Response Details
| Endpoint | Status | Body |
|----------|--------|------|
| /archive   | 200 | `{ note_id, archived_at }` |
| /unarchive | 200 | `{ note_id, archived_at: null }` |

### Error Codes
| Status | Scenario | code |
|--------|----------|------|
| 400 | Invalid UUID | `invalid_parameter` |
| 401 | Unauthenticated | `unauthenticated` |
| 403 | Note owned by another user | `forbidden` |
| 404 | Note not found/deleted | `note_not_found` |
| 409 | Already archived/unarchived (idempotent → 200 OK preferred) | — |
| 500 | Unexpected | `server_error` |

## 5. Data Flow
1. **Middleware** authenticates + injects `supabase`, `userId`.
2. **Route Handler**:
   - Validate `noteId` param.
   - Call `notesService.archiveNote()` or `.unarchiveNote()`.
3. **Service Layer** (`notesService.ts`):
```ts
export async function archiveNote(noteId: string, userId: string) {
  // UPDATE notes SET archived_at = now() WHERE note_id = ? AND user_id = ? AND deleted_at IS NULL;
}
export async function unarchiveNote(noteId: string, userId: string) {
  // UPDATE notes SET archived_at = NULL WHERE note_id = ? AND user_id = ? AND deleted_at IS NULL;
}
```
4. **Database** trigger updates `updated_at`.
5. **HTTP Helpers** return JSON.

## 6. Security Considerations
- Auth via middleware.
- Authorization: ownership check, enforced by RLS and `user_id` filter.
- Input validation (uuid).
- Rate limit generic (1000/h).

## 7. Error Handling
Map service errors to `sendError` responses.

| Service Error | HTTP | code |
|---------------|------|------|
| `NOTE_NOT_FOUND` | 404 | note_not_found |
| `FORBIDDEN` | 403 | forbidden |
| default | 500 | server_error |

Errors logged via `logger.error({ err, noteId, userId }, "Failed to archive note")`.

## 8. Performance Considerations
- Single row UPDATE on indexed PK.
- Idempotent design: if already archived/unarchived return 200 with current state (avoid extra SELECT).

## 9. Implementation Steps
1. **Validator**: `noteIdParamSchema` in `validators/notes.ts` (reuse).
2. **Service**: add `archiveNote`, `unarchiveNote` + unit tests.
3. **Routes**:
   - Create `archive.ts`, `unarchive.ts` with POST handler only.
4. **Integration Tests** for endpoints (happy 200, 401, 403, 404).
5. **Docs**: update `.ai/api-plan.md` status table.
6. **CI**: run tests & coverage.
