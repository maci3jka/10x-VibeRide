# UI Plan – GeoJSON Refactor & Download Options

**Context**: Backend now serves GeoJSON as primary format and `/download?format=gpx|geojson` for files. The UI must reflect the new model and give users a choice of download format plus (optional) on-page map preview using GeoJSON.

---

## 1  State Management Changes (`useGenerate`)

1. Replace `summary_json` references with `itinerary.route_geojson` & `extractSummary()` helper (import from shared lib).
2. Update `download` util:
   ```ts
   const url = `/api/itineraries/${itineraryId}/download?format=${fmt}&acknowledged=${ack}`;
   ```
3. Expose `format` arg (`'gpx' | 'geojson'`, default `gpx`).

---

## 2  UI Components

### 2.1  Generate View (`src/components/generate/GenerateView.tsx`)

* Add **Download Format** dropdown (GPX default, GeoJSON alt).
* Keep safety disclaimer checkbox logic as-is.
* Button: “Download GPX” vs “Download GeoJSON” based on selection.

### 2.2  Map Preview (stretch goal)

* Use `react-leaflet` (already in stack?) to render LineStrings from GeoJSON.
* New component `MapPreview` accepting `geojson: FeatureCollection`.
* Show when itinerary status === completed.

### 2.3  Itinerary List / Detail

* Derive title, distance, duration via `extractSummary()`; avoid storing duplicates in UI state.

---

## 3  Error Handling

* Handle `422` for invalid GeoJSON / GPX generation failure.
* For GeoJSON download, set `Content-Type` to `application/geo+json` and filename `*.geojson`.

---

## 4  Type Updates

* Add `GeoJSON.FeatureCollection` types to shared `src/types.ts`.
* Update `ItineraryResponse` interface:
  ```ts
  interface ItineraryResponse {
    itinerary_id: string;
    note_id: string;
    version: number;
    status: ItineraryStatus;
    route_geojson: FeatureCollection; // new
    title: string;
    total_distance_km: number;
    total_duration_h: number;
  }
  ```

---

## 5  Testing (Vitest + React Testing Library)

* Update mocks to include `route_geojson`.
* Add test: selecting GeoJSON triggers correct MIME type + filename.
* Add test: `MapPreview` renders correct number of LineStrings.

---

## 6  Docs / Help Text

* Update tooltip / help panel to explain difference between GPX and GeoJSON.
* Mention that GeoJSON is mainly for web mapping; GPX for GPS devices.

---

## 7  Task Breakdown

1. Types & helper import (`extractSummary`).
2. Refactor `useGenerate` state & download.
3. Add dropdown component in Generate view.
4. Implement optional `MapPreview` (feature-flag if lib not yet installed).
5. Update tests & mocks.
6. Update user-facing help text.

---

**Owner**: frontend team

**ETA**: 2–3 days.

