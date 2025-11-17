# API Endpoint Implementation Plan: Create/Update User Preferences

## IMPORTANT
When

## 1. Endpoint Overview
Creates a new `user_preferences` record **or** updates the existing one (1-to-1 with `auth.users`).  This endpoint lets a rider store default riding preferences that are inherited by note creation and itinerary generation.

## 2. Request Details
- **HTTP Method**: `PUT`  
  (idempotent up-sert; create on first call, update on subsequent calls)
- **URL**: `/api/user/preferences`
- **Authentication**: Required – JWT cookie/session handled by Supabase.  
  Reject anonymous requests with **401**.
- **Headers**: `Content-Type: application/json`
- **Request Body** (`UpdateUserPreferencesRequest`):
  | Field | Type | Constraints |
  |-------|------|-------------|
  | `terrain` | `"paved" \| "gravel" \| "mixed"` | REQUIRED, enum |
  | `road_type` | `"scenic" \| "twisty" \| "highway"` | REQUIRED, enum |
  | `typical_duration_h` | `number` | REQUIRED, > 0, max 999.9 |
  | `typical_distance_km` | `number` | REQUIRED, > 0, max 999999.9 |

## 3. Used Types
- Command model: `UpdateUserPreferencesRequest` (from `src/types.ts`)
- Response model: `UserPreferencesResponse`  
  Mirrors DB row including `created_at` / `updated_at`.

## 4. Response Details
| Status | Scenario | Body |
|--------|----------|------|
| **200 OK** | Record existed and was updated | `UserPreferencesResponse` |
| **201 Created** | Record created for first time | `UserPreferencesResponse` |
| **400 Bad Request** | Validation failed | `ErrorResponse` with field details |
| **401 Unauthorized** | No/invalid JWT | `ErrorResponse` |
| **500 Internal Server Error** | Unhandled/DB error | `ErrorResponse` |

## 5. Data Flow
1. Astro route `src/pages/api/user/preferences.ts` receives request.
2. Parse & validate body with Zod schema → converts into `UpdateUserPreferencesRequest`.
3. Fetch `supabase` & `user` from `context.locals`.
4. `userPreferencesService.upsert(user.id, dto)` performs:
   a. `const { data, error } = supabase
          .from("user_preferences")
          .upsert({ ...dto, user_id: user.id }, { onConflict: "user_id" })
          .single();`
   b. If `error` ⇒ throw `ServiceError`.
5. Return JSON `data` with **200** or **201** (depends on `created_at == updated_at`).
6. Errors caught by route handler are mapped → `ErrorResponse`.

## 6. Security Considerations
- **Auth**: verify authenticated user via `context.locals.user` (set by middleware).
- **RLS**: Supabase RLS policy `user_is_owner` already restricts rows to owner.
- Prevent ID spoofing by ignoring/overwriting `user_id` coming from client.
- Validate enums & numeric ranges to avoid SQL injection / malformed data.
- Rate-limit with generic middleware (future work).

## 7. Error Handling
| Case | HTTP | Notes |
|------|------|-------|
| Missing/invalid JWT | 401 | Early return.
| JSON parse error | 400 | `Incorrect Content-Type` or malformed JSON.
| Zod validation failures | 400 | Include `details` map.
| Supabase error (e.g., network) | 500 | Log `error.message`.
| Unexpected exceptions | 500 | Log stack trace; return generic message.

Logging strategy: use `src/lib/logger.ts` (`pino` or console) → `logger.error({ err, userId }, "Failed to upsert user prefs")` (centralised log aggregator picks it up).  No dedicated DB error table needed yet.

## 8. Performance Considerations
- Single row upsert – O(1).  Index on PK already exists.
- Use `select: "*"` only once; avoid extra read.
- Add explicit column list in select to prevent future `*` bloat.

## 9. Implementation Steps
1. **Service Layer**  
   Create `src/lib/services/userPreferencesService.ts` with `get`, `upsert` helpers.
2. **Zod Schema**  
   `src/lib/validators/userPreferences.ts` exporting `updateUserPreferencesSchema`.
3. **Endpoint**  
   Create file `src/pages/api/user/preferences.ts`:
   ```ts
   import type { APIRoute } from "astro";
   import { z } from "zod";
   import { updateUserPreferencesSchema } from "@/lib/validators/userPreferences";
   import { upsertUserPreferences } from "@/lib/services/userPreferencesService";
   import { jsonResponse, errorResponse } from "@/lib/http";

   export const PUT: APIRoute = async ({ locals, request }) => {
     if (!locals.user) {
       return errorResponse(401, "unauthenticated", "Login required");
     }
     const body = await request.json().catch(() => null);
     if (!body) {
       return errorResponse(400, "invalid_json", "Malformed JSON body");
     }

     const parse = updateUserPreferencesSchema.safeParse(body);
     if (!parse.success) {
       return errorResponse(400, "validation_failed", "Validation errors", parse.error.flatten().fieldErrors);
     }

     try {
       const prefs = await upsertUserPreferences(locals.supabase, locals.user.id, parse.data);
       const status = prefs.created_at === prefs.updated_at ? 201 : 200;
       return jsonResponse(status, prefs);
     } catch (err) {
       logger.error({ err, userId: locals.user.id }, "Upsert prefs failed");
       return errorResponse(500, "server_error", "Failed to save preferences");
     }
   };
   export const prerender = false; // server-only.
   ```
4. **Middleware Update**  
   Ensure `src/middleware/index.ts` populates `locals.user` & `locals.supabase`.
5. **Unit Tests**  
   - Validate Zod schema.
   - Mock Supabase client to test service logic (success & error paths).
6. **Integration Test**  
   - Call endpoint with Supertest (authenticated cookie) → expect 201, then 200 on second call.
7. **Docs**  
   Update `.ai/api-plan.md` & README with example cURL.
8. **Commit & Push**  
   Follow conventional commits: `feat(api): add user preferences endpoint`.
