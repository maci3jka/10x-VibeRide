# UI Implementation Plan: "Open in Mapy.cz" Link

## 1. Feature Overview
Adds a secondary action in the itinerary **DownloadSection** letting users open their ride directly in **Mapy.cz**. Two UX paths:
1. **Direct Link** – Calls `/api/itineraries/:id/mapy?acknowledged=true` to receive a URL-scheme link and opens it in a new tab.
2. **Fallback** – If Mapy.cz limit (≤15 points) is exceeded or API returns 422, show toast instructing user to download GPX and import manually.

## 2. Affected Components / Files
- `src/components/generate/DownloadSection.tsx` – Add new button + handler.
- `src/lib/apiClient.ts` – Add `getMapyLink(itineraryId)` wrapper.
- i18n messages (`src/i18n/en.json`) – Add strings; other locales later.
- Unit tests – `DownloadSection.test.tsx`.

## 3. UI/UX Details
| Item | Design |
|------|--------|
| Button Label | `Open in Mapy.cz` |
| Icon | Map (lucide) + external arrow |
| Placement | Same *Quick Preview* group below download options |
| Disabled | Until itinerary `status==='completed'` OR while pending fetch |
| Loading State | Spinner replaces icon during fetch |
| Error Toast | "Route contains too many points for Mapy.cz quick preview. Download GPX instead." |

## 4. Data Flow
```mermaid
flowchart LR
  Click --> call(getMapyLink)
  call --> API(/api/itineraries/:id/mapy)
  API --> returns(Link)
  returns --> open(window.open(Link,"_blank"))
  error --> toast(Error)
```

## 5. Edge Cases & Error Handling
- **422 too_many_points** → Show specific toast.
- **401/404** → Show generic error dialog.
- Network error → Retry once automatically, then toast.

## 6. Accessibility
- Button `title="Open route in Mapy.cz"`.
- Keyboard-accessible; focus outlines.

## 7. Performance
- Single tiny GET request; negligible.

## 8. Unit Tests (Vitest + React Testing Library)
- Renders button only when itinerary `completed`.
- Clicking triggers API and `window.open` with correct URL.
- Handles loading and error states.

## 9. Implementation Steps
1. **API Client** – add `getMapyLink(id)` in `apiClient.ts`.
2. **Hook** – optional `useMapyLink(itineraryId)` (SWR) for caching.
3. **DownloadSection** – Insert new `Button` with handler & spinner.
4. **Toast** – Reuse toast utility; add new message keys.
5. **Testing** – Unit tests for interaction and error handling.
6. **Docs/Changelog** – Update UI docs and release notes.

