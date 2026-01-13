# API Endpoint Implementation Plan: Google Maps Link (`GET /api/itineraries/:itineraryId/google`)

## 1. Endpoint Overview
Creates a parameterised **Google Maps URL** that pre-loads the user’s itinerary as a route in Google Maps. The link uses the [Google Maps URLs Directions spec](https://developers.google.com/maps/documentation/urls/guide#directions-action) and is generated entirely on the server – no external API calls – so the response is instant (< 10 ms). The endpoint is read-only and returns JSON containing the generated link.

## 2. Request Details
| Property | Value |
|----------|-------|
| **HTTP Method** | `GET` |
| **URL** | `/api/itineraries/:itineraryId/google` |
| **Query Params** | `acknowledged` (`"true"` – required; same disclaimer gate as download) |
| **Headers** | `Accept: application/json` |
| **Request Body** | — (none) |

## 3. Used Types
| Purpose | Type | File |
|---------|------|------|
| Success DTO | `GoogleMapsLinkResponse` | `src/types.ts` |
| Error DTO | `ErrorResponse` | `src/types.ts` |

```ts
export interface GoogleMapsLinkResponse {
  url: string; // Fully-formed Google Maps URL
}
```

## 4. Response Details
Success (`200 OK`):
```json
{
  "url": "https://www.google.com/maps/dir/?api=1&origin=49.420800,20.941900&destination=49.395200,20.414200&travelmode=driving"
}
```
Errors mirror the existing *download* and *mapy* routes and add one route-specific code:
* `acknowledgment_required` → 400
* `itinerary_not_completed` → 422
* `too_many_points` (Google Maps max 25) → 422
* `link_generation_error` → 500

## 5. Data Flow
1. **Route Handler** `src/pages/api/itineraries/[itineraryId]/google.ts`.
2. Auth + param validation (reuse zod schemas from *download*).
3. Fetch itinerary via `getById()`; verify `status==='completed'` and `route_geojson` exists.
4. Invoke `googleMapsLinkService.buildLink(routeGeoJSON[, transportType])`.
5. Return `{ url }` as JSON.

## 6. Service Layer
Create `src/lib/services/googleMapsLinkService.ts` with:
```ts
function buildLink(
  geo: RouteGeoJSON,
  transport: "driving" | "bicycling" | "walking" = "driving",
  maxPts = 25,
): string
```
### Algorithm
1. Extract **all** `[lon, lat]` coordinates from every `LineString` (merge multi-day segments, dedup boundaries).
2. Pick first + last + evenly-spaced middle points so total ≤ `maxPts` (reuse `samplePoints`).
3. Swap to `lat,lon` order (Google requirement).
4. Build URL parameters:
   * `origin=lat,lon`
   * `destination=lat,lon`
   * `waypoints=lat,lon|lat,lon|…` (pipe-separated)
   * `travelmode=driving|bicycling|walking`
5. Assemble final URL `https://www.google.com/maps/dir/?api=1&{params}`.
6. Throw `TooManyPointsError` if sampled > 25 (edge case: extreme itineraries).

## 7. Security Considerations
* Same auth and RLS rules as other itinerary routes.
* `acknowledged=true` required.
* DEVENV bypass for auth.

## 8. Error Handling
| Scenario | Status | Code |
|----------|--------|------|
| Missing/invalid `acknowledged` | 400 | `acknowledgment_required` |
| Itinerary not completed | 422 | `itinerary_not_completed` |
| >25 points after sampling | 422 | `too_many_points` |
| Any unexpected failure | 500 | `link_generation_error` |

## 9. Performance Considerations
* Pure sync string construction; no external HTTP.
* ≤25 points → URL length ≈450 chars (well within limits).

## 10. Implementation Steps
1. **Types** – add `GoogleMapsLinkResponse` + extend error-code union in `src/types.ts`.
2. **Service** – implement and unit-test `googleMapsLinkService` (copy from `mapyLinkService` and adjust).
3. **Route** – add new API route file; copy validation/utilities from *mapy* route.
4. **Unit Tests** – service tests: happy path, >25 pts sampling, coord order, error paths.
5. **Integration Tests** – route tests for 200/400/422 cases.
6. **Docs** – Update OpenAPI + markdown docs.

