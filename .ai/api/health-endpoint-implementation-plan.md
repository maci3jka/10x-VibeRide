# API Endpoint Implementation Plan: Health Check (`GET /api/health`)

## 1. Endpoint Overview
The health-check endpoint provides a lightweight status report for uptime monitoring tools (e.g. Fly.io/DO, Kubernetes, GitHub Actions). It verifies connectivity to core subsystems—PostgreSQL (Supabase) and Supabase Auth—and returns a simple JSON payload. No authentication is required. The handler must complete in < 100 ms p95 under nominal load.

## 2. Request Details
- **HTTP Method:** `GET`
- **URL:** `/api/health`
- **Query Params:** none
- **Headers:** none (accepts `*/*` / `application/json`)
- **Request Body:** _N/A_

## 3. Used Types
| Purpose | Type | File |
|---------|------|------|
| Response DTO | `HealthCheckResponse` | `src/types.ts` |
| Error DTO | `ErrorResponse` | `src/types.ts` |

## 4. Response Details
Successful response (`200 OK`):
```json
{
  "status": "healthy",
  "database": "connected",
  "auth": "operational",
  "timestamp": "2025-01-16T15:30:00Z"
}
```
Degraded / unhealthy responses use the same object with downgraded fields: `status: "degraded" | "unhealthy"`, `database: "disconnected" | "error"`, `auth: "degraded" | "down"`.

Failure to construct a response triggers the shared `errorResponse()` helper with status `500`.

## 5. Data Flow
1. **Request → Route Handler** (`src/pages/api/health.ts`).
2. Handler delegates to `healthService.check()`.
3. `check()` concurrently performs:
   - **DB ping:** `supabase.rpc('select', { count: '*', table: 'notes', limit: 1 })` **or** `supabase.from('notes').select('note_id', { head: true, count: 'exact' }).limit(1);`
   - **Auth ping:** `supabase.auth.admin.listUsers({ page: 1, perPage: 1 })` (service-role key only).
4. Aggregates results → `HealthCheckResponse`.
5. Logs structured result via `logger.info()`; degradations/errors logged via `logger.error()`.
6. Sends JSON with `jsonResponse()` helper.

## 6. Security Considerations
- **No Auth:** Endpoint intentionally public; ensure response never leaks stack traces or DB internals.
- **Rate-Limit:** Apply global middleware limit (already 1000 rph/user). OK for monitoring.
- **CORS:** Follows default API CORS policy (allow only same-origin).
- **Headers:** Reply with existing security headers (set by shared middleware).

## 7. Error Handling
| Scenario | Status | Error code | Notes |
|----------|--------|-----------|-------|
| DB ping fails | 200 with `status:"degraded"` and `database:"error"` | — | Service still responds so monitors don’t mis-interpret outage of API layer. Logs error. |
| Auth ping fails | 200 with `status:"degraded"`, `auth:"down"` | — | Same behaviour. |
| Both pings fail or unhandled exception | 500 | `server_error` | Uses `errorResponse()` helper. |

## 8. Performance Considerations
- Use `Promise.allSettled()` to ping DB/auth in parallel.
- Head-only queries (no payload) to minimise latency (< 10 ms typical).
- Set 50 ms timeout per subsystem; treat timeout as failure/degraded.

## 9. Implementation Steps
1. **Create Service:** `src/lib/services/healthService.ts`
   ```ts
   import { supabaseAdmin } from '../supabase.client';
   import { HealthCheckResponse } from '../../types';
   export async function check(): Promise<HealthCheckResponse> { /* ... */ }
   ```
2. **Add Route:** `src/pages/api/health.ts`
   ```ts
   export const prerender = false;
   import { check } from '@/lib/services/healthService';
   import { jsonResponse, errorResponse } from '@/lib/http';
   export async function GET() { /* call check() and return */ }
   ```
3. **Service Logic:**
   - Ping DB & Auth concurrently.
   - Determine status mapping rules.
   - Return DTO.
4. **Unit Tests:** `src/lib/services/healthService.test.ts`
   - Mock Supabase client to simulate success/failure/timeouts.
5. **Integration Test:** `src/pages/api/health.test.ts`
   - Call route; assert 200 & healthy when mocks succeed; degraded cases.
6. **Logging:** Use `logger.info({ database, auth }, 'health-check');` and on errors `logger.error({ err }, 'health-check failed');`.
7. **Documentation:** Export OpenAPI snippet (post-MVP) and update `.ai/api-plan.md` Implementation Status table (mark ✅ Implemented with date).
8. **CI:** Add new tests to `vitest` run; ensure coverage ≥ 90 %.
