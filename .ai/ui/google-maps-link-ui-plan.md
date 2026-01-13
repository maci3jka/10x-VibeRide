# UI Implementation Plan: "Open in Google Maps" Link

## 1. Feature Overview
Adds a secondary action in the itinerary **DownloadSection** that lets users open their ride directly in **Google Maps**. UX is identical to the existing "Open in Mapy.cz" button, reusing the same visual conventions.

Two paths:
1. **Direct Link** – Calls `/api/itineraries/:id/google?acknowledged=true` to receive a Google Maps URL and opens it in a new tab.
2. **Fallback** – If Google’s waypoint limit (≤25) is exceeded or API returns 422, show toast instructing user to download GPX and import manually.

## 2. Affected Components / Files
- `src/components/generate/DownloadSection.tsx` – Add new button + handler.
- `src/lib/apiClient.ts` – Add `getGoogleMapsLink(itineraryId)` wrapper.
- i18n messages (`src/i18n/en.json`) – Add strings; other locales later.
- Unit tests – `DownloadSection.test.tsx`.

## 3. UI/UX Details
| Item | Design |
|------|--------|
| Button Label | `Open in Google Maps` |
| Icon | Map (lucide) + external arrow (same family as Mapy.cz) |
| Placement | Same *Quick Preview* group below download options, after Mapy.cz |
| Disabled | Until itinerary `status==='completed'` OR while pending fetch |
| Loading State | Spinner replaces icon during fetch |
| Error Toast | "Route contains too many points for quick preview. Download GPX instead." (reuse generic wording) |

## 4. Data Flow
```mermaid
flowchart LR
  Click --> call(getGoogleMapsLink)
  call --> API(/api/itineraries/:id/google)
  API --> returns(Link)
  returns --> open(window.open(Link,"_blank"))
  error --> toast(Error)
```

## 5. Edge Cases & Error Handling
- **422 too_many_points** → Specific toast.
- **401/404** → Generic error dialog.
- Network error → Retry once automatically, then toast.

## 6. Accessibility
- Button `title="Open route in Google Maps"`.
- Keyboard accessible; focus outlines.

## 7. Performance
- Single tiny GET request; negligible impact.

## 8. Unit Tests (Vitest + React Testing Library)
- Renders button only when itinerary `completed`.
- Clicking triggers API and `window.open` with correct URL.
- Handles loading and error states.

## 9. Implementation Steps
1. **API Client** – add `getGoogleMapsLink(id)` in `apiClient.ts` (mirror of `getMapyLink`).
2. **Hook** – optional `useGoogleMapsLink(itineraryId)` (SWR) for caching.
3. **DownloadSection** – Insert new `Button` with handler & spinner.
4. **Toast** – Reuse toast utility; add new message keys.
5. **Testing** – Unit tests for interaction and error handling.
6. **Docs/Changelog** – Update UI docs and release notes.

