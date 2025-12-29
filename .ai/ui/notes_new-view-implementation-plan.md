# View Implementation Plan – Notes New

## 1. Overview
The Notes New view lets an authenticated user create a fresh trip note from scratch. The page gathers a title, free-text body (≤ 1 500 chars) and optional per-trip preference overrides. On completion the note is saved and the user is redirected to the note editor or list.

## 2. View Routing
* **Path:** `/notes/new`
* Protected route – middleware enforces session; unauthenticated users redirect to `/`.

## 3. Component Structure
```
NotesNewPage
├─ CreationHeader
│  └─ CreateButton
├─ FormSection
│  ├─ TitleInput
│  ├─ NoteTextArea
│  └─ CharCounter
├─ PreferencesOverrideForm
│  └─ PreferenceField ×4
├─ CreateStatusBanner
└─ TabBar
```

## 4. Component Details
### NotesNewPage
* **Description:** Top-level component that hosts form state, validation and submission logic.
* **Events:** `onSubmit` create note → POST `/api/notes` → on success navigate to `/notes/{id}`.
* **Validation:** Zod client schemas before submission (title, note_text, overrides).
* **Types:** `CreateNoteRequest`, `NoteResponse`, `NotesNewViewModel`.

### CreationHeader
* Displays page title “New Note” and primary Create button.
* **Props:** `{disabled: boolean; onCreate(): void}`.

### TitleInput / NoteTextArea / CharCounter
* Same specs as in editor (title 1-120 chars, text 10-1 500 chars).

### PreferencesOverrideForm
* Re-uses shared `PreferencesForm` but all fields optional; emits `TripPreferences`.

### CreateButton
* Primary CTA; disabled when validation fails or while request in flight.

### CreateStatusBanner
* Inline feedback area under form (idle/saving/success/error).
* **Props:** `{state: "idle"|"saving"|"success"|"error"; message?:string}`

## 5. Types
```typescript
interface NotesNewViewModel {
  title: string;
  noteText: string;
  trip_prefs: TripPreferences;
  submitState: "idle" | "saving" | "success" | "error";
}
```
Uses existing shared DTOs `CreateNoteRequest`, `NoteResponse`, `TripPreferences`.

## 6. State Management
Custom hook `useCreateNote()`
* Holds local form state and errors.
* Provides `create()` that POSTs to `/api/notes`.
* Exposes `submitState`, `error`, `noteId`.
* On success calls router navigate.

## 7. API Integration
| Action | Endpoint | Method | Request Type | Response Type |
|--------|----------|--------|--------------|---------------|
| Create note | `/api/notes` | POST | `CreateNoteRequest` | `NoteResponse` (201) |

Error handling via `ErrorResponse`.

## 8. User Interactions
1. User types title / text → local state updates, char counter.
2. Selects overrides → state updates.
3. Presses Create → validation → spinner in button → success toast → redirect.
4. Validation or network error → banner + toast.

## 9. Conditions and Validation
Same field rules as PRD / API. Title uniqueness conflict (409) handled via toast.

## 10. Error Handling
* **400 validation** – inline errors.
* **403 preferences_incomplete** – redirect user to `/profile` with toast.
* **409 title conflict** – toast, focus title.
* **Network/offline** – OfflineBanner covers; button disabled.

## 11. Implementation Steps
1. Create `src/components/notes/NotesNewPage.tsx`.
2. Implement `useCreateNote` hook with tests.
3. Build simple sub-components or reuse existing inputs.
4. Add new route `src/pages/notes/new.astro` rendering `NotesNewPage`.
5. Integrate navigation (after success push `/notes/{id}`).
6. Add unit tests for hook and page submission flow.
7. Verify accessibility and responsive layout.

