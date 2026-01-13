# UI Implementation Plan: "Open in gpxmapy.cz" Link

## 1. Feature Overview
Adds a secondary action in the itinerary **DownloadSection** allowing users to open up to 50 waypoints of their itinerary directly in **gpxmapy.cz** for quick editing / review. Two UX paths:
1. **Direct Link** – Uses new API endpoint `/api/itineraries/:id/gpxmapy?acknowledged=true` to fetch pre-built URL and then opens it in a new tab.
2. **Fallback** – If URL length exceeds safe limit or error, show toast instructing user to download GPX and upload manually.

## 2. Affected Components / Files
- `src/components/generate/DownloadSection.tsx` – Add button + handler.
- `src/lib/apiClient.ts` – Add `getGpxMapyLink(itineraryId)` wrapper.
- i18n messages (`src/i18n/en.json`) – Copy text; update other languages later.
- Unit tests – `DownloadSection.test.tsx`.

## 3. UI/UX Details
| Item | Design |
|------|--------|
| Button Label | `Open in gpxmapy.cz` |
| Icon | ExternalLink (lucide) before text |
| Placement | Below existing *Download* buttons in a new *Quick Preview* group |
| Disabled | While itinerary not completed OR pending fetch |
| Loading State | Shows spinner on icon while fetching link |
| Error Toast | "Route has too many waypoints for quick preview. Download GPX and upload to gpxmapy.cz manually." |

## 4. Data Flow
```mermaid
flowchart LR
  ButtonClick --> call(getGpxMapyLink)
  call --> API(/api/itineraries/:id/gpxmapy)
  API --> returns(url)
  returns --> open(window.open(url,"_blank"))
  error --> toast(Error)
```

## 5. Edge Cases & Error States
- **422 too_many_waypoints** → show toast.
- **401/404** → show generic error dialog.
- Network failure → Retry once; then toast.

## 6. Accessibility
- Button has `title="Open waypoints in gpxmapy.cz"`.
- Keyboard accessible; focus outline.

## 7. Performance
- Single GET request (~1-2 KB response).
- No impact on main bundle size (reuses existing button/icon).

## 8. Unit Tests (Vitest + React Testing Library)
- Renders button when itinerary completed.
- Calls API on click; opens window with URL.
- Handles error → shows toast.
- Disabled while loading.

## 9. Implementation Steps
1. **API Client** – add `getGpxMapyLink(id)` using fetch wrapper.
2. **Service Hook** – optional `useGpxMapyLink(itineraryId)` for SWR caching.
3. **DownloadSection** – insert new `Button` with handler.
4. **Toast Messages** – integrate with existing toast util.
5. **Tests** – add unit tests.
6. **Docs/Changelog** – update release notes.


