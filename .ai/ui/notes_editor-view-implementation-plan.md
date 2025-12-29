# View Implementation Plan – Notes Editor

## 1. Overview
The Notes Editor view allows authenticated users to create a new note or edit an existing one. A note consists of a title, free-text body (≤ 1 500 characters) and optional per-trip preference overrides (terrain, road type, duration, distance). Users can manually save, rely on 30 s autosave and are warned about unsaved changes when leaving the page.

## 2. View Routing
* **Create note:** `/notes/new`
* **Edit note:** `/notes/:noteId`
Route is protected by session middleware; unauthenticated visitors are redirected to `/`.

## 3. Component Structure
```
NotesEditorPage (layout wrapper)
├─ EditorHeader
│  ├─ SaveStatusChip
│  └─ SaveButton
├─ FormSection
│  ├─ TitleInput
│  ├─ NoteTextArea (TextAreaAutosize)
│  └─ CharCounter
├─ PreferencesOverrideForm
│  └─ PreferenceField (×4)
├─ AutosaveIndicator
└─ TabBar (bottom navigation)
```

## 4. Component Details
### NotesEditorPage
* **Description:** Top-level React component rendered by Astro route. Holds view state, data loading, autosave timer and unsaved-changes guard.
* **Elements:** `<form>` wrapping editor fields; `<Outlet>` for child routes none.
* **Events:** `onSubmit` (manual save), `beforeunload` prompt, `visibilitychange` pause autosave.
* **Validation:** Delegate to Zod schemas before API calls.
* **Types:** `NoteEditorViewModel`, `CreateNoteRequest`, `UpdateNoteRequest`, `NoteResponse`.
* **Props:** none (Render via routing)

### EditorHeader
* **Description:** Sticky header with page title ("New Note" or note title), Save button and save status chip (Saved / Saving… / Error).
* **Elements:** `<header>` with flex row, `<h1>`, `<SaveButton>`, `<SaveStatusChip>`.
* **Events:** Save button click.
* **Validation:** none.
* **Types:** `SaveState = "idle" | "saving" | "saved" | "error"`.
* **Props:** `{title: string; saveState: SaveState; onSave(): void}`

### TitleInput
* **Description:** Controlled `input` for note title (max 120 chars).
* **Elements:** `<input type="text">` with tailwind classes.
* **Events:** `onChange` update local state, mark dirty.
* **Validation:** 1-120 chars trimmed; uniqueness checked server-side.
* **Types:** `string`.
* **Props:** `{value: string; onChange(v:string):void; error?:string}`

### NoteTextArea
* **Description:** Auto-expanding textarea for note body (TextAreaAutosize lib).
* **Elements:** `<textarea>`.
* **Events:** `onChange` update state; `onInput` update char counter.
* **Validation:** 10-1 500 chars.
* **Types:** `string`.
* **Props:** `{value:string; onChange(v:string):void; error?:string}`

### CharCounter
* **Description:** Shows `current/1500` count, turns red when over limit.
* **Events:** none (derived from props).
* **Props:** `{count:number}`

### PreferencesOverrideForm
* **Description:** Optional overrides for terrain, road type, duration, distance using shared `PreferencesForm` fields.
* **Elements:** `<select>` ×2, `<input type="number">` ×2.
* **Events:** `onChange` update `trip_prefs` part of state.
* **Validation:** Same ranges as profile defaults; all fields optional.
* **Types:** `TripPreferences`.
* **Props:** `{value:TripPreferences; onChange(v:TripPreferences):void}`

### SaveButton
* **Description:** Primary action button; disabled while saving or when validation errors exist.
* **Events:** `onClick` triggers manual save.
* **Props:** `{disabled:boolean; onClick():void}`

### AutosaveIndicator
* **Description:** Small text under form: “Autosaved 3 s ago” / “Saving…” / error message.
* **Events:** none.
* **Props:** `{state:SaveState; lastSavedAt?:Date}`

### TabBar
* Already implemented shared component; no changes required.

## 5. Types
* **NoteEditorViewModel**
```typescript
interface NoteEditorViewModel {
  noteId?: string;          // undefined when creating
  title: string;
  noteText: string;
  trip_prefs: TripPreferences;
  saveState: "idle" | "saving" | "saved" | "error";
  dirty: boolean;           // unsaved local changes
}
```
* Existing shared DTOs imported from `src/types.ts`: `CreateNoteRequest`, `UpdateNoteRequest`, `NoteResponse`, `TripPreferences`.

## 6. State Management
Create custom hook `useNoteEditor(noteId?: string)`
* **Responsibilities:**
  * Fetch note (if `noteId` provided) via GET `/api/notes/:noteId`.
  * Hold local draft state in `useState`.
  * Provide `save()` that POSTs or PUTs note.
  * Start `setInterval` autosave every 30 s when `dirty`.
  * Expose `saveState`, `lastSavedAt`, `dirty`, setters.
* Uses `useEffect` to set `beforeunload` listener when `dirty`.

## 7. API Integration
| Action | Endpoint | Method | Request Type | Response Type |
|--------|----------|--------|--------------|---------------|
| Fetch existing note | `/api/notes/:noteId` | GET | – | `NoteResponse` |
| Create note | `/api/notes` | POST | `CreateNoteRequest` | `NoteResponse` (201) |
| Update note | `/api/notes/:noteId` | PUT | `UpdateNoteRequest` | `NoteResponse` |

Error responses follow `ErrorResponse` structure.

## 8. User Interactions
1. **Typing Title / Text** → local state updates, `dirty=true`, char counter updates.
2. **Preference field change** → local state updates, `dirty=true`.
3. **Manual Save** → validate → POST/PUT → on success `dirty=false`, toast “Saved”.
4. **Autosave** every 30 s when `dirty` → same flow as manual save.
5. **Leave page with unsaved changes** → browser `beforeunload` prompt.
6. **API error** → toast error, saveState=`error`.

## 9. Conditions and Validation
| Field | Condition | Component | Feedback |
|-------|-----------|-----------|----------|
| title | 1-120 chars | TitleInput | inline error under field |
| note_text | 10-1500 chars | NoteTextArea | char counter red & error toast |
| terrain / road_type | enum value | PreferencesOverrideForm | select shows invalid error |
| duration_h | >0 ≤999.9, 1 dp | PreferencesOverrideForm | inline validation |
| distance_km | >0 ≤999 999.9, 1 dp | PreferencesOverrideForm | inline validation |
| server 409 title conflict | unique per user | Save flow | toast “Title already exists” |

## 10. Error Handling
* **Validation errors (400)** – show inline errors and toast.
* **Conflict (409)** – show toast, focus title input.
* **Network/offline** – OfflineBanner already covers; save disabled.
* **Autosave failure** – saveState=`error`, retry on next interval.
* **Auth 401** – global middleware redirects.

## 11. Implementation Steps
1. Create `src/components/notes/NotesEditorPage.tsx` with skeleton layout.
2. Implement `useNoteEditor` in `src/lib/hooks/useNoteEditor.ts` (tests with Vitest).
3. Build `EditorHeader`, `SaveButton`, `SaveStatusChip` components under `src/components/notes/`.
4. Integrate `TextAreaAutosize` (package `react-textarea-autosize`).
5. Reuse `PreferencesForm` as `PreferencesOverrideForm` with optional props.
6. Add char counter logic and styling.
7. Wire autosave timer and dirty-prompt (`useBeforeUnload`).
8. Add route pages: `src/pages/notes/new.astro` and `[noteId].astro` importing `NotesEditorPage` (SSR-only wrapper).
9. Connect API calls using `fetchJson` helper (src/lib/http.ts).
10. Add unit tests for hook (loading, save success/error, autosave) and components with React Testing Library.
11. Update TabBar route config to allow `/notes/new`.
12. Verify accessibility (labels, aria-live for errors, keyboard nav).
13. Update documentation and screenshots.

