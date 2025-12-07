# API Endpoint Implementation Plan: Analytics Statistics Endpoints

## 1. Endpoint Overview
These internal endpoints provide aggregated statistics for administrative dashboards:

1. **GET /api/analytics/users/stats** – returns aggregated user statistics (total users, profile completion rate, active users, new users).
2. **GET /api/analytics/generations/stats** – returns aggregated itinerary generation statistics (totals, failure rate, duration percentiles, spending estimates).

Both endpoints are **read-only** and restricted to requests authenticated with the Supabase **service_role**. They pull data from aggregated SQL views or direct queries on `auth.users`, `viberide.user_preferences`, and `viberide.itineraries`.

## 2. Request Details
- **HTTP Method:** GET (idempotent, cachable)
- **URL Structure:**
  - `/api/analytics/users/stats`
  - `/api/analytics/generations/stats`
- **Query Parameters:**
  - `from` (ISO 8601 date, optional) – statistics start date (inclusive)
  - `to` (ISO 8601 date, optional) – statistics end date (inclusive). Defaults to `now()` when omitted.
- **Headers:** None besides default auth cookie / Authorization.
- **Request Body:** None.

## 3. Used Types
- `UserStatsResponse` – defined in `src/types.ts`.
- `GenerationStatsResponse` – defined in `src/types.ts`.
- `ErrorResponse` – common error DTO.
- Internal helper type `DateRange` for service layer ( `{ from?: string; to?: string }` ).

## 4. Response Details
| Endpoint | Success (200) | Error Codes |
|----------|---------------|-------------|
| GET `/api/analytics/users/stats` | `UserStatsResponse` JSON | 401, 403, 500 |
| GET `/api/analytics/generations/stats` | `GenerationStatsResponse` JSON | 401, 403, 500 |

Responses always include security headers and are `application/json`.

## 5. Data Flow
```
┌────────────┐   (GET)   ┌───────────────────┐
│   Client   │ ────────▶ │  Astro Route      │
└────────────┘           │  /api/analytics/* │
                         └────────┬──────────┘
                                  │ validate query params (zod)
                                  │ ensure service_role auth
                                  ▼
                         ┌───────────────────┐
                         │ AnalyticsService  │
                         ├───────────────────┤
                         │ getUserStats()    │
                         │ getGenerationStats() │
                         └────────┬──────────┘
                                  │ Supabase (service role)
                                  ▼
                         ┌───────────────────┐
                         │  SQL aggregation  │ (views or raw queries)
                         └───────────────────┘
```

## 6. Security Considerations
1. **Authentication** – Require valid JWT whose `role` claim is `service_role`. In dev mode (`DEVENV=true`) allow bypass with query header `x-dev-auth=true` (consistent with existing pattern).
2. **Authorization** – Reject non-service_role users with 401.
3. **RLS** – Service role bypasses RLS; queries must use minimal column selection.
4. **Input Validation** – Sanitize `from`/`to` ISO dates via Zod.
5. **Rate Limiting** – Global limits apply; separate admin API key can be used.
6. **Exposure** – Endpoints should be hidden from public docs; add middleware guard `isInternalApi`.

## 7. Error Handling
| Scenario | HTTP | `error` code |
|----------|------|--------------|
| Missing / invalid auth | 401 | `unauthenticated` |
| Auth role not service_role | 403 | `forbidden` |
| Invalid date params | 400 | `validation_failed` |
| DB error | 500 | `server_error` |

Use `errorResponse()` helper with structured logging via `logger.error({ err, userId }, msg)`.

## 8. Performance Considerations
- Use **materialized views** or pre-aggregated columns if queries exceed 100 ms.
- Add composite indexes on `created_at` for `auth.users` and `itineraries` if absent.
- Consider caching layer (Redis) for 1-minute TTL dashboard polling.

## 9. Implementation Steps
1. **Routing**
   - Create `src/pages/api/analytics/users/stats.ts` and `src/pages/api/analytics/generations/stats.ts`.
2. **Validation Schemas** (`src/lib/validators/analytics.ts`)
   - `statsQuerySchema` with optional `from`/`to` (Zod `string().datetime()`), ensure `from ≤ to`.
3. **Service Layer** (`src/lib/services/analyticsService.ts`)
   - `getUserStats(range: DateRange): Promise<UserStatsResponse>`
   - `getGenerationStats(range: DateRange): Promise<GenerationStatsResponse>`
   - Use Supabase `rpc()` or `.from().select()` with aggregate functions:
     - Users: `count`, `count where profile completed`, active (last_sign_in > now()-30d), new (created_at range).
     - Generations: `count`, `avg`, `percentile_disc(0.95)` on duration, etc.
4. **Route Handlers**
   - Import validator, parse params.
   - Ensure `locals.supabase` has service role key (throw 401 otherwise).
   - Call service, return `jsonResponse(data, 200)`.
5. **Testing**
   - Unit tests for validator (Vitest).
   - Service tests with mocked Supabase client.
   - Integration tests hitting route with dev-mode auth bypass.
6. **Docs**
   - Update `.ai/api-plan.md` status lines 28-29 to ✅ Implemented.
   - Add OpenAPI snippets to internal docs.
7. **CI** – Ensure coverage ≥ 90 %.
