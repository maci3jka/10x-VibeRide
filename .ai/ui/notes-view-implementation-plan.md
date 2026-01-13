# View Implementation Plan – Notes

## 1. Overview
The **Notes** view lets authenticated users browse, search, create, edit, archive/un-archive and delete trip notes. It is the primary entry point after profile completion and the starting point of the trip-planning journey (US-004 → US-007). The page shows a paginated / infinite list of `NoteCard`s, supports search & filter controls, surfaces note status (archived / has itinerary) and exposes swipe or button actions for archive / delete. It must be fast (<100 ms p95 GET) and fully keyboard & screen-reader accessible.

## 2. View Routing
* **Path:** `/notes`
* **Route Guard:** Authenticated only. Visitors are redirected to landing; incomplete profile redirects to `/profile`.
* **Default Route:** Root of `AuthenticatedLayout`. Deep link `/notes/:noteId` handled by Note Editor view (out of scope here).

## 3. Component Structure
```
AuthenticatedLayout
└─ NotesPage
   ├─ NotesHeader
   │   ├─ SearchInput
   │   └─ ArchivedToggle
   ├─ InfiniteScrollList
   │   ├─ NoteCard  (N)
   │   │   ├─ SwipeActions (mobile) / ActionButtons (desktop)
   │   │   └─ StatusBadges
   │   └─ SkeletonLoader (while fetching)
   ├─ EmptyState (if no notes)
   ├─ ArchivedAccordion (lazy-loaded panel)
   │   └─ NoteCard (archived)
   ├─ ConfirmDialog (delete / archive)
   └─ ToastProvider (global, already mounted higher)
```

## 4. Component Details
### 4.1 NotesPage
* **Purpose:** Container page – fetches data, manages pagination & query params, renders child components.
* **Main elements:** `<section role="main">` containing header + list.
* **Handled interactions:** Search submit, archived filter toggle, scroll → `fetchNextPage`, swipe/archive/delete confirmations.
* **Validation:**
  * `search` ≤ 250 chars (same as API) – guard before request.
  * `page` ≥ 1, `limit` ≤ 100 (internal).
* **Types:** `NotesPaginatedResponse`, `NoteListItemResponse`, `NotesQueryParams`, `NotesPageState`.
* **Props:** none (route component).

### 4.2 NotesHeader
* **Purpose:** Top control bar with search box + archived toggle + «New Note» button.
* **Main elements:** `<header>` with `<input type="search">`, toggle `<button aria-pressed>` and CTA `<Button>`.
* **Handled interactions:**
  * `onSearch(query)` – debounced 300 ms.
  * `onToggleArchived(includeArchived)`.
  * `onNewNote()` → navigate to `/notes/new`.
* **Validation:** Search length guard.
* **Types:** `HeaderProps` { query: string; archived: boolean; handlers }
* **Props:** above.

### 4.3 InfiniteScrollList
* **Purpose:** Virtualised paginated list with skeletons and “No more” sentinel.
* **Main elements:** `<ul role="list">` + `IntersectionObserver` sentinel.
* **Handled events:** `onReachBottom` → `fetchNextPage`.
* **Validation:** Prevent multiple in-flight fetches.
* **Types:** `InfiniteListProps<T>` generic.

### 4.4 NoteCard
* **Purpose:** Display single note snippet + status; provides archive/delete actions.
* **Main elements:** Card container (`<article>`), title, snippet, date, status badges, action buttons.
* **Handled interactions:**
  * Click card → navigate `/notes/:id` (edit view).
  * Swipe left (mobile) / Delete button → open ConfirmDialog("delete").
  * Swipe right / Archive button → ConfirmDialog("archive"/"unarchive").
* **Validation:** Disable actions while mutation in progress.
* **Types:** `NoteCardProps` { note: NoteVM; onArchive; onDelete }.

### 4.5 ArchivedAccordion
* **Purpose:** Collapsible list of archived notes, hidden by default.
* **Main elements:** `<details>` / `<summary>` toggle + `InfiniteScrollList`.
* **Handled interactions:** Expand/collapse → triggers archived notes fetch.
* **Types:** same list types; internal state `isOpen`.

### 4.6 ConfirmDialog
* **Purpose:** Generic modal for destructive actions.
* **Main elements:** Shadcn/ui `Dialog` with title, message, Cancel & Confirm buttons.
* **Handled interactions:** Confirm → calls mutation; Cancel → closes.
* **Types:** `ConfirmDialogProps` { title, message, onConfirm }.

### 4.7 SkeletonLoader & StatusBadges
* Simple visual components; no logic.

## 5. Types
### 5.1 Existing DTOs (re-used)
* `NoteListItemResponse` – from `src/types.ts`.
* `NotesPaginatedResponse`, `ErrorResponse`.

### 5.2 New View-specific Types
```typescript
// Query params derived from API
export interface NotesQueryParams {
  page: number;      // default 1
  limit: number;     // default 20
  search?: string;   // ≤250 chars
  archived?: boolean;
}

// Client-side view model extending API response
export interface NoteVM extends NoteListItemResponse {
  // derived fields for convenience
  isArchived: boolean;   // archived_at !== null
  hasItinerary: boolean; // has_itinerary
  statusLabel: string;   // e.g. "Archived", "3 itineraries"
}

// Local component state bundle
export interface NotesPageState {
  query: string;
  includeArchived: boolean;
}
```

## 6. State Management
* **Server state:** Managed with **React Query (TanStack Query)**.
  * `useNotes(queryParams)` – paginated infinite query keyed by params.
  * Mutations: `archiveNote`, `unarchiveNote`, `deleteNote` invalidate notes list.
* **Client/UI state:**
  * `query` (search string) – lifted to `NotesPage`, debounced.
  * `includeArchived` (boolean).
  * `confirmAction` (dialog state).
* **Custom hooks:**
  * `useNotesInfiniteQuery(params)` returns pages + helpers.
  * `useSwipeActionHandlers(note)` – abstracts swipe / button action + haptics.

## 7. API Integration
| Action | HTTP | Endpoint | Request | Success → State |
|--------|------|----------|---------|------------------|
| List notes | GET | `/api/notes` | `NotesQueryParams` → query string | Populates infinite list pages |
| Archive | POST | `/api/notes/:id/archive` | none | invalidate & toast “Archived” |
| Unarchive | POST | `/api/notes/:id/unarchive` | none | invalidate & toast “Restored” |
| Delete | DELETE | `/api/notes/:id` | none | invalidate & toast “Deleted” |

* **Headers:** `Content-Type: application/json`; cookies carry session JWT.
* **Error mapping:** `401` → sign-out & redirect; `400|404` show toast; `429` show rate-limit countdown.

## 8. User Interactions
| Interaction | Outcome |
|-------------|---------|
| Type in search → pause 300 ms | Debounced query; fetch page 1 |
| Toggle “Show Archived” | Refetch with `archived=true` |
| Scroll near bottom | Fetch next page (if `page < total_pages`) |
| Tap NoteCard | Navigate to editor |
| Swipe left / Delete button | Open confirm dialog; on confirm → DELETE request |
| Swipe right / Archive btn | If archived_at null → archive; else unarchive |
| New Note button | Navigate to `/notes/new` |

## 9. Conditions and Validation
* **Search length** ≤ 250 – else disable search & show tooltip.
* **Swipe disabled** while mutation loading.
* **Generate Tab enabled** (outside scope) – conditional nav state set based on `data.length > 0`.
* **Accessibility:**
  * List has `role="list"`, dynamic updates via `aria-live`.
  * Swipe actions mirrored by buttons (`aria-label`).
  * Dialog has focus trap.

## 10. Error Handling
* **Network / 5xx:** Toast “Something went wrong – please retry”. Allow retry button that re-fetches current page.
* **Validation (400):** Show details if present in `error.details`, else generic.
* **401:** Clear session, toast “Session expired”, redirect `/`.
* **404 on mutation:** Optimistically remove card; backend 404 ignored.
* **429:** Show toast with `retry_after` countdown and disable actions until elapsed.
* **Offline:** `OfflineBanner` (already global) overlays.

## 11. Implementation Steps
1. **Scaffold Page Route** – add `/notes` in `src/pages/notes/index.astro` that hydrates `NotesPage` React component.
2. **Define Types** – add `ui/notesView.types.ts` with new interfaces (Section 5.2).
3. **Create Hooks** – `useNotesInfiniteQuery`, `useNoteMutations`, `useSwipeActionHandlers` in `src/lib/hooks/`.
4. **Build Presentational Components** – `NoteCard`, `StatusBadges`, `SkeletonLoader` using Shadcn/ui & Tailwind.
5. **Implement NotesHeader** with search, archived toggle, and new-note button.
6. **Implement InfiniteScrollList** (generic) utilising IntersectionObserver.
7. **Compose NotesPage** – wire header, list, hooks, state, and archived accordion.
8. **Add ConfirmDialog** (generic) – leverages shadcn `Dialog` + actions.
9. **Wire Mutations** – integrate archive/unarchive/delete with optimistic updates & invalidation.
10. **Add Responsive & Swipe Support** – use `react-swipeable` or custom pointer listeners; fall back to buttons on desktop (>768 px).
11. **Accessibility Review** – audit with axe + keyboard navigation.
12. **Unit Tests** – Vitest component tests for NoteCard, hooks, and mutation behaviour with mocks.
13. **Integration Test** – happy-path flow using testing-library + happy-dom (list, search, archive, delete).
14. **Documentation** – update `ui-plan.md` mapping + storybook (if used) for components.



