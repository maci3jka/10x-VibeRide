# API Endpoint Implementation Plan: gpxmapy.cz Link (`GET /api/itineraries/:itineraryId/gpxmapy`)

## 1. Endpoint Overview
Generates a pre-filled **gpxmapy.cz** URL containing up to the first 50 waypoints/POIs of the itinerary (Point features) so users can open their ride plan directly in the external editor with one click. The endpoint is read-only, lightweight (< 10 ms), and returns **JSON** with the computed link.

## 2. Request Details
| Property | Value |
|----------|-------|
| **HTTP Method** | `GET` |
| **URL** | `/api/itineraries/:itineraryId/gpxmapy` |
| **Query Params** | `acknowledged` (`"true"` – required, same disclaimer gate as download) |
| **Headers** | `Accept: application/json` |
| **Request Body** | — (none) |

## 3. Used Types
| Purpose | Type | File |
|---------|------|------|
| Success DTO | `GpxMapyLinkResponse` | `src/types.ts` |
| Error DTO | `ErrorResponse` | `src/types.ts` |

```ts
export interface GpxMapyLinkResponse {
  url: string; // Fully–formed gpxmapy.cz link
}
```

## 4. Response Details
Success (`200 OK`):
```json
{
  "url": "https://gpxmapy.cz/index.html?x1=20.941900&y1=49.420800&n1=Szczawnica+Mountain+Resort&x2=20.414200&y2=49.395200&n2=Bialka+Viewpoint"
}
```
Error scenarios follow the standard `ErrorResponse` shape (`error`, `message`, optional `details`). Key codes:
- `acknowledgment_required` → 400
- `itinerary_not_completed` → 422
- `too_many_waypoints` → 422 (URL would exceed 2 000 chars)
- `link_generation_error` → 500

## 5. Data Flow
1. **Request → Route Handler** `src/pages/api/itineraries/[itineraryId]/gpxmapy.ts`.
2. Auth + param validation (reuse zod schemas from *download* route).
3. Fetch itinerary via `getById()`; verify `status==='completed'` and `route_geojson` exists.
4. Call `gpxMapyService.buildLink(routeGeoJSON)`.
5. Return `{ url }` as JSON.

## 6. Security Considerations
- Same auth rules as download route (RLS enforced; DEVENV bypass).
- Must pass safety disclaimer (`acknowledged=true`).
- Rate-limit inherits global API limits.

## 7. Error Handling
| Scenario | Status | Code |
|----------|--------|------|
| Missing/invalid `acknowledged` | 400 | `acknowledgment_required` |
| Itinerary not completed | 422 | `itinerary_not_completed` |
| URL > 2 000 chars | 422 | `too_many_waypoints` |
| Any unexpected failure | 500 | `link_generation_error` |

## 8. Performance Considerations
- Pure synchronous string manipulation; no external I/O besides DB fetch.
- Max 50 points processed to guarantee < 2 000 char URL and O(1) complexity.

## 9. Implementation Steps
1. **Types** – Add `GpxMapyLinkResponse` to `src/types.ts`.
2. **Service** – `src/lib/services/gpxMapyService.ts`:
   - `buildLink(geojson: RouteGeoJSON, maxPoints = 50): string`.
   - Extract Point features; fallback to first point of each LineString if none.
   - URL encode names; round lon/lat to 6 decimals; assemble params.
   - Throw `TooManyWaypointsError` if final URL > 2 000 chars.
3. **Route** – `src/pages/api/itineraries/[itineraryId]/gpxmapy.ts`:
   - boilerplate similar to *download* route; respond with JSON.
4. **Unit Tests** – `gpxMapyService.test.ts` covering:
   - happy path; no waypoints fallback; URL length edge.
5. **Integration Tests** – route tests for 200, 400, 422 cases.
6. **Docs** – Update OpenAPI & markdown docs (.ai/api) when implemented.


