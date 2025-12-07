# API Endpoint Implementation Plan: Notes List & Create (`/api/notes`)

## 1. Endpoint Overview
Exposes the “notes collection” resource.

* **GET /api/notes** – paginated list of the authenticated user’s notes  
* **POST /api/notes** – create a new note (requires completed preferences)

Both handlers live in the same Astro route file.

---

## 2. Request Details
### GET /api/notes
* **Required query params** – none  
* **Optional query params**  
  | Name | Type | Default | Validation |
  |------|------|---------|------------|
  | `page`  | integer | 1  | ≥ 1 |
  | `limit` | integer | 20 | 1–100 |
  | `search`| string  | – | ≤ 250 chars |
  | `archived`| boolean | false |  |
  | `sort` | `"updated_at" \| "created_at" \| "title"` | `"updated_at"` | enum |
  | `order`| `"asc" \| "desc"` | `"desc"` | enum |

### POST /api/notes
* **Headers** – `Content-Type: application/json`
* **Request body** (`CreateNoteRequest`)
  | Field | Type | Constraints |
  |-------|------|-------------|
  | `title` | string | 1–120 chars, unique per user (case-sensitive) |
  | `note_text` | string | 10–1500 chars |
  | `trip_prefs` | partial `TripPreferences` | each field follows user_preferences validation |

---

## 3. Used Types
* `CreateNoteRequest`
* `NoteListItemResponse`
* `NotesPaginatedResponse`
* `NoteResponse`
* `PaginationParams`, `PaginationMeta`
* `ErrorResponse`

---

## 4. Response Details
| Status | GET | POST |
|--------|-----|------|
| **200 OK** | `NotesPaginatedResponse` | – |
| **201 Created** | – | `NoteResponse` |
| **400 Bad Request** | invalid query | validation errors / bad JSON |
| **401 Unauthorized** | no/invalid session | same |
| **403 Forbidden** | – | profile incomplete OR duplicate title |
| **404 Not Found** | page>total_pages | – |
| **409 Conflict** | – | duplicate title (concurrent) |
| **500 Internal Server Error** | unexpected | unexpected |

---

## 5. Data Flow
1. **Middleware** injects `locals.supabase` & `locals.user` (or bypass in DEVENV).
2. **GET flow**  
   a. Validate & coerce query params via Zod.  
   b. Build Supabase query:  
      * filter `user_id = locals.user.id`  
      * exclude `deleted_at IS NOT NULL`  
      * apply archived filter, search (`@@` operator on `search_vector`), order, limit+offset.  
   c. Select required columns + lateral count for pagination.  
   d. Map raw rows → `NoteListItemResponse[]` (add `has_itinerary`, `itinerary_count` via `latest_itinerary` or aggregate).  
3. **POST flow**  
   a. Parse JSON, validate with `createNoteSchema`.  
   b. Check that `user_preferences` row exists → 403 if missing.  
   c. Insert into `notes` table with `user_id`.  
   d. Return inserted row as `NoteResponse`.
4. Service functions in `src/lib/services/notesService.ts`:
   * `list(userId, params)`  
   * `create(userId, dto)`
5. Errors bubble up, mapped by shared `errorResponse`.

---

## 6. Security Considerations
* **Auth** – require valid JWT (skip when `DEVENV='true'`).  
* **RLS** – tables already protected (`user_id = auth.uid()`).  
* **Input validation** – Zod schemas for body & query.  
* **Uniqueness race** – rely on DB unique index; translate to 409.  
* **Search injection** – parameterised query builder prevents SQLi.  
* **Rate limiting** – generic middleware (future).  
* **DoS** – cap `limit ≤ 100`.

---

## 7. Error Handling
| Scenario | Code | Message |
|----------|------|---------|
| Missing JWT | 401 | `unauthenticated` |
| Malformed JSON | 400 | `invalid_json` |
| Validation errors | 400 | `validation_failed` + details |
| Preferences not set | 403 | `preferences_incomplete` |
| Duplicate title | 409 | `note_title_conflict` |
| Supabase/network failure | 500 | `server_error` |

`logger.error({ err, userId }, "Notes endpoint failure")`

---

## 8. Performance Considerations
* Indexes already exist on `(user_id, updated_at DESC)` and `search_vector`.  
* Use `explain` to ensure index usage for search + archive filter.  
* Select only required columns; avoid `select("*")`.  
* Pagination uses `limit/offset`; consider keyset pagination post-MVP.  

---

## 9. Implementation Steps
1. **Validators** – `createNoteSchema`, `listNotesQuerySchema` in `src/lib/validators/notes.ts`.
2. **Service Layer** – add `src/lib/services/notesService.ts` with `list` & `create` (wrap Supabase calls, map rows).
3. **Astro Route** – `src/pages/api/notes/index.ts`  
   * export `GET` & `POST` functions following pattern from user-preferences plan.  
   * `export const prerender = false;`
4. **Tests**  
   * Unit – schema parsing, service success/error cases.  
   * Integration – GET happy path, POST happy/duplicate/invalid.  
5. **Docs** – add examples to `.ai/api-plan.md`.
6. **CI** – ensure vitest coverage ≥ 90 %.  
7. **Commit** – `feat(api): implement notes list & create endpoint`.
