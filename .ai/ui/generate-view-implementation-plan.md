# View Implementation Plan – Generate

## 1. Overview
The Generate view enables riders to start AI itinerary generation for a selected note, track generation progress in real-time, view the resulting summary and download the itinerary as a GPX 1.1 file after acknowledging a safety disclaimer.

## 2. View Routing
* **Path:** `/generate`
* Access rules:
  * Requires at least one note (`/notes` → toast if none)
  * Protected by session middleware, unauthenticated visitors redirected to `/`.

## 3. Component Structure
```
GeneratePage
├─ NotePreviewCard
├─ ResolvedPreferencesCollapse
├─ GenerateButton
├─ ProgressSection (conditional)
│  ├─ SpinnerWheel | ProgressBar
│  └─ CancelButton (when running)
├─ ItinerarySummary (conditional)
│  └─ DayAccordion ×N
├─ DownloadSection (conditional)
│  └─ DownloadButton
│     └─ SafetyDisclaimerInline
├─ ErrorRetryCard (conditional)
└─ TabBar
```

## 4. Component Details
### GeneratePage
* **Description:** Top-level React component orchestrating state machine (`idle` → `running` → `completed` | `failed` | `cancelled`). Handles polling `/api/itineraries/:id/status` every 2 s while running.
* **Types:** `GenerateState`, `ItineraryStatusResponse`, `GenerateViewModel`.
* **Events:** `onGenerate`, `onCancel`, `onRetry`, `onDownload`.

### NotePreviewCard
* **Purpose:** Shows note title and snippet so user knows context.
* **Props:** `{note: NoteListItemResponse}`.

### ResolvedPreferencesCollapse
* **Purpose:** Displays preference values actually used for generation (overrides → defaults).
* **Props:** `{prefs: ResolvedPreferences}`.

### GenerateButton
* **States:** `idle` (enabled), `disabled` (running), `loading` initial post.
* **Props:** `{disabled: boolean; onClick(): void}`.

### SpinnerWheel & ProgressBar
* **SpinnerWheel:** Motorcycle wheel SVG rotates 1 rev/s when awaiting first progress.
* **ProgressBar:** Fills via `progress` % from polling; ARIA `role="progressbar"`.

### CancelButton
* Cancels in-flight generation (POST `/api/itineraries/:id/cancel`).

### ItinerarySummary
* Renders itinerary days, segments and totals (title, highlights).
* **Props:** `{summary: ItinerarySummaryJSON}`.

### DownloadButton & SafetyDisclaimerInline
* **Behavior:** Clicking opens inline disclaimer text with Accept / Decline buttons; Accept triggers GET `/api/itineraries/:id/gpx?acknowledged=true`.
* **Props:** `{enabled:boolean; onDownload():void}`.

### ErrorRetryCard
* Shows error message and Retry button; appears for `failed` or polling/network errors.

## 5. Types
```typescript
type GenerateState = "idle" | "posting" | "running" | "completed" | "failed" | "cancelled";
interface GenerateViewModel {
  note: NoteListItemResponse;
  itineraryId?: string;
  state: GenerateState;
  progress?: number;
  summary?: ItinerarySummaryJSON;
  error?: string;
}
```
Reuse DTOs from `src/types.ts`:
* `GenerateItineraryRequest`
* `GenerateItineraryResponse`
* `ItineraryStatusResponse`
* `ItineraryResponse`

## 6. State Management
Custom hook `useGenerate(noteId: string)`
* **Responsibilities:**
  * `generate()` – POST `/api/notes/:noteId/itineraries` (creates itinerary, returns id)
  * Poll status via `setInterval` until terminal state
  * `cancel()` – POST `/api/itineraries/:id/cancel`
  * Provide `state`, `progress`, `summary`, `error`, `download()` helper
* **Edge cases:** deduplicate generations via 409 / 429 handling.

## 7. API Integration
| Action | Endpoint | Method | Req | Res |
|--------|----------|--------|-----|-----|
| Generate | `/api/notes/:noteId/itineraries` | POST | `GenerateItineraryRequest` | `GenerateItineraryResponse` (202) |
| Poll status | `/api/itineraries/:id/status` | GET | – | `ItineraryStatusResponse` |
| Cancel | `/api/itineraries/:id/cancel` | POST | – | `CancelItineraryResponse` |
| Download GPX | `/api/itineraries/:id/gpx?acknowledged=true` | GET | – | GPX stream |

Error responses use `ErrorResponse` JSON.

## 8. User Interactions
1. View loads → shows latest selected note (persist in localStorage) or first note.
2. User taps **Generate**.
3. Button enters loading, spinner shows.
4. Polling updates progress bar; user may Cancel.
5. On completion → smooth scroll to ItinerarySummary; Generate button label changes to **Regenerate**.
6. Download enabled; clicking shows disclaimer; Accept streams GPX, Decline hides.
7. If generation fails → ErrorRetryCard with Retry.

## 9. Conditions and Validation
| Condition | Enforcement | UI Reaction |
|-----------|------------|-------------|
| Another generation running (409) | POST response | Toast “Generation already in progress”, switch to polling existing id |
| Spend cap exceeded (429) | POST response | Toast with retry_after countdown |
| Preferences incomplete (403) | POST response | Redirect to `/profile` + toast |
| Disclaimer not acknowledged | Server 400 on download | Show disclaimer inline |
| Itinerary status timeout (>25 s no progress) | Client | Show generic error + Retry |

## 10. Error Handling
* Network errors → toast + retry button.
* Polling fails 3 times consecutively → cancel polling, show ErrorRetryCard.
* Cancel failure (400) → toast reason.
* GPX download 422 (incomplete) → disable button.

## 11. Implementation Steps
1. Build `src/components/generate/GeneratePage.tsx` skeleton.
2. Implement `useGenerate` hook in `src/lib/hooks/useGenerate.ts` with exhaustive tests.
3. Create sub-components (`NotePreviewCard`, `ResolvedPreferencesCollapse`, etc.) or reuse existing.
4. Implement spinner and progress bar visuals with Tailwind animations.
5. Add cancel and error flows.
6. Create Astro route `src/pages/generate/index.astro` rendering React component.
7. Persist last-selected note id in `localStorage` for continuity.
8. Integrate download via hidden `<a>` link with blob stream.
9. Write tests: successful generate flow, cancel, error, 409, 429 handling.
10. Verify ARIA roles (`progressbar`, `button` labels) and responsive design.

