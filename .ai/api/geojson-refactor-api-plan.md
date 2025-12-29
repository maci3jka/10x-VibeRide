# API Plan – Switch to GeoJSON as Primary Route Format

**Context**: We are rebuilding the itinerary subsystem from scratch with a clean database. GeoJSON becomes the single source-of-truth for route geometry; GPX is produced on-demand for downloads. No legacy endpoints or columns are kept.

---

## 1  Database

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| itineraries | `itinerary_id` | uuid PK | generated with `gen_random_uuid()` |
|  | `note_id` | uuid FK → notes | |
|  | `user_id` | uuid | RLS on ownership |
|  | `version` | int | starts at 1 per note |
|  | `status` | enum | pending \| running \| completed \| failed \| cancelled |
|  | `route_geojson` | jsonb **NOT NULL** | FeatureCollection (LineStrings + optional Points) |
|  | `title` | text | duplicate for fast listing |
|  | `total_distance_km` | numeric(9,1) | derived on insert |
|  | `total_duration_h` | numeric(7,1) | idem |
|  | `request_id` | uuid UNIQUE per user | idempotency |
|  | `created_at` / `updated_at` | timestamptz | triggers |
|  | `deleted_at` | timestamptz NULL | soft-delete |

*Drop* former `summary_json` / `gpx_metadata`.

---

## 2  LLM Generation Flow (`processItineraryGeneration`)

1. Build **GeoJSON schema** for OpenRouter:
   ```ts
   const responseFormat = {
     name: "route_geojson",
     schema: {
       type: "object",
       required: ["type", "features"],
       properties: {
         type: { const: "FeatureCollection" },
         properties: {
           type: "object",
           required: ["title", "total_distance_km", "total_duration_h"],
           properties: {
             title: { type: "string", maxLength: 60 },
             total_distance_km: { type: "number" },
             total_duration_h: { type: "number" },
             highlights: { type: "array", items: { type: "string" } }
           }
         },
         features: { type: "array", items: {/* LineString or Point */} }
       }
     }
   };
   ```
2. Parse JSON once; store in `route_geojson`.
3. Derive `title`, `total_distance_km`, `total_duration_h` for listing.
4. Mark itinerary **completed** when validation passes.

---

## 3  Conversion Utilities (new `src/lib/services/geojsonService.ts`)

* `validateGeoJSON(geo): boolean` – structural checks
* `extractSummary(geo): {title, distance, duration, highlights}` – reused by API/UI
* `geoJsonToGPX(geo, opts): string` – converts on-demand

Vitest tests under `src/lib/services/__tests__/`.

---

## 4  REST Endpoints (public)

| Method | URL | Purpose | Auth |
|--------|-----|---------|------|
| **GET** | `/api/notes/:noteId/itineraries` | list versions | ✔︎ |
| **POST** | `/api/notes/:noteId/itineraries` | start generation | ✔︎ |
| **GET** | `/api/itineraries/:itineraryId` | fetch details (returns GeoJSON summary) | ✔︎ |
| **DELETE** | `/api/itineraries/:itineraryId` | soft-delete | ✔︎ |
| **GET** | `/api/itineraries/:itineraryId/status` | polling | ✔︎ |
| **POST** | `/api/itineraries/:itineraryId/cancel` | cancel generation | ✔︎ |
| **GET** | `/api/itineraries/:itineraryId/download` | download file | ✔︎ |

### 4.1  Download Handler (`download`)

* Query param `format`:
  * `gpx` (default) → `geoJsonToGPX()` → `application/gpx+xml`
  * `geojson` → raw pretty JSON → `application/geo+json`
* Optional `acknowledged=true` stays (same safety disclaimer).

### 4.2  Deleted Endpoint

* Remove `/api/itineraries/:id/gpx` – replaced by `/download`.

---

## 5  Validation & Error Codes

| Code | Scenario |
|------|----------|
| 422 | GeoJSON fails validation or itinerary incomplete |
| 500 | GPX conversion error |

---

## 6  Environment / Config

* `DEVENV==='true'` bypasses auth as before.
* No OpenAI spend-cap change.

---

## 7  Task Breakdown

1. DB migration – create new schema.
2. Update Supabase types generator.
3. Refactor `itineraryService.ts` (prompt, storage, summary derivation).
4. Implement `geojsonService.ts` + tests.
5. Create `download` API route.
6. Update existing itinerary routes to drop old fields.
7. Update API docs in `.cursor/rules/api-documentation.mdc`.

---

**Owner**: backend team

**ETA**: 3–4 days including tests and docs.

