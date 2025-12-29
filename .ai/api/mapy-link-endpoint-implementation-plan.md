# API Endpoint Implementation Plan: Mapy.cz Link (`GET /api/itineraries/:itineraryId/mapy`)

## 1. Endpoint Overview
Creates a parameterised **Mapy.cz URL** (URL-scheme variant) that pre-loads the user’s itinerary as a route in Mapy.cz. It relies solely on query-string parameters – no GPX upload – so the response is instant (< 10 ms). The endpoint is read-only and returns JSON with the generated link.

## 2. Request Details
| Property | Value |
|----------|-------|
| **HTTP Method** | `GET` |
| **URL** | `/api/itineraries/:itineraryId/mapy` |
| **Query Params** | `acknowledged` (`"true"` – required; same disclaimer gate as download) |
| **Headers** | `Accept: application/json` |
| **Request Body** | — (none) |

## 3. Used Types
| Purpose | Type | File |
|---------|------|------|
| Success DTO | `MapyLinkResponse` | `src/types.ts` |
| Error DTO | `ErrorResponse` | `src/types.ts` |

```ts
export interface MapyLinkResponse {
  url: string; // Fully-formed Mapy.cz URL
}
```

## 4. Response Details
Success (`200 OK`):
```json
{
  "url": "https://mapy.cz/?route=car|49.420800,20.941900,Szczawnica+Resort|49.395200,20.414200,Bialka+Viewpoint&lang=en"
}
```
Errors mirror the `download` route codes and add one route-specific code:
* `acknowledgment_required` → 400
* `itinerary_not_completed` → 422
* `too_many_points` (Mapy.cz max 15) → 422
* `link_generation_error` → 500

## 5. Data Flow
1. **Route Handler** `src/pages/api/itineraries/[itineraryId]/mapy.ts`.
2. Auth + param validation (reuse zod schemas from *download*).
3. Fetch itinerary via `getById()`; verify `status==='completed'` and `route_geojson` exists.
4. Invoke `mapyLinkService.buildLink(routeGeoJSON[, transportType])`.
5. Return `{ url }` as JSON.

## 6. Service Layer
Create `src/lib/services/mapyLinkService.ts` with:
```ts
function buildLink(geo: RouteGeoJSON, transport: "car"|"bike"|"foot" = "car", maxPts = 15): string
```
Algorithm:
1. Extract array of `[lon, lat]` coordinates from the first `LineString`.
2. Pick first + last + evenly-spaced middle points so total ≤ `maxPts`.
3. Build `route=<transport>|lat,lon,name|…` string (Mapy expects `lat,lon`).
4. URL-encode names, round coordinates to 6 decimals.
5. Assemble final URL `https://mapy.cz/?route=…&lang=en`.
6. Throw `TooManyPointsError` if exceeding 15 pts after selection (edge case: too many FeatureCollections).

## 7. Security Considerations
* Same auth and RLS rules as other itinerary routes.
* `acknowledged=true` required.
* DEVENV bypass for auth.

## 8. Error Handling
| Scenario | Status | Code |
|----------|--------|------|
| Missing/invalid `acknowledged` | 400 | `acknowledgment_required` |
| Itinerary not completed | 422 | `itinerary_not_completed` |
| >15 points after sampling | 422 | `too_many_points` |
| Any unexpected failure | 500 | `link_generation_error` |

## 9. Performance Considerations
* Pure sync computation; no external HTTP.
* <=15 points → negligible string length (≈300 chars).

## 10. Implementation Steps
1. **Types** – add `MapyLinkResponse` + new error code union in `src/types.ts`.
2. **Service** – implement and unit-test `mapyLinkService`.
3. **Route** – add new API route file; copy validation/utilities from *download*.
4. **Unit Tests** – service tests: happy path, name encoding, >15 pts sampling, error paths.
5. **Integration Tests** – route tests for 200/400/422 cases.
6. **Docs** – Update OpenAPI + markdown docs.

