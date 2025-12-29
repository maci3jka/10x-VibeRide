# Notes Editor View - Implementation Summary

**View Name:** Notes Editor  
**Routes:** `/notes/new` (create), `/notes/:noteId` (edit)  
**Implementation Date:** December 26, 2025  
**Status:** ✅ Complete

## Overview

The Notes Editor view provides a comprehensive interface for creating and editing motorcycle trip notes. Users can input a title, detailed note text, and optional trip preference overrides. The view features real-time validation, character counters, autosave functionality, and unsaved changes warnings.

## Architecture

### Component Hierarchy

```
NotesEditorPage (main container)
├─ EditorHeader
│  ├─ Back Button (ArrowLeft icon)
│  ├─ Title (h1)
│  ├─ SaveStatusChip
│  └─ Save Button
├─ Form Section
│  ├─ TitleInput (with character counter)
│  ├─ NoteTextArea (with character counter)
│  ├─ PreferencesOverrideForm
│  │  ├─ Terrain Select
│  │  ├─ Road Type Select
│  │  ├─ Duration Input
│  │  └─ Distance Input
│  └─ AutosaveIndicator
└─ TabBar (bottom navigation)
```

## Implementation Details

### 1. Custom Hook: `useNoteEditor`

**Location:** `src/lib/hooks/useNoteEditor.ts`

**Purpose:** Manages all editor state, data fetching, saving, and autosave logic.

**Key Features:**
- Dual mode operation (create/edit) based on `noteId` parameter
- Fetches existing note data on mount (edit mode)
- Local state management for title, note text, and trip preferences
- Dirty state tracking for unsaved changes
- Save operation with POST (create) or PUT (update)
- 30-second autosave interval when dirty with valid content
- Browser `beforeunload` warning for unsaved changes
- Visibility change handling (pauses autosave when page hidden)
- Concurrent save prevention

**State Interface:**
```typescript
interface NoteEditorViewModel {
  noteId?: string;          // undefined when creating
  title: string;
  noteText: string;
  trip_prefs: TripPreferences;
  saveState: "idle" | "saving" | "saved" | "error";
  dirty: boolean;
}
```

**Return Interface:**
```typescript
interface UseNoteEditorReturn {
  viewModel: NoteEditorViewModel;
  error: ErrorResponse | null;
  isLoading: boolean;
  lastSavedAt: Date | null;
  updateTitle: (title: string) => void;
  updateNoteText: (text: string) => void;
  updateTripPrefs: (prefs: TripPreferences) => void;
  save: () => Promise<boolean>;
  resetDirty: () => void;
}
```

**Implementation Highlights:**

1. **Initialization:**
   - Create mode: Empty form
   - Edit mode: Fetches note via `GET /api/notes/:noteId`
   - Handles 401 (redirect), 404 (error state), network errors

2. **Save Logic:**
   - Trims whitespace from title and text
   - Uses POST for new notes, PUT for updates
   - Updates `noteId` after successful creation
   - Transitions saveState: idle → saving → saved → idle (after 2s)
   - Returns boolean success indicator

3. **Autosave:**
   - Triggers every 30 seconds when:
     - `dirty` is true
     - Title is not empty (trimmed)
     - Note text is ≥10 characters (trimmed)
   - Clears interval when not dirty or content invalid
   - Pauses when page is hidden (visibilitychange)
   - Resumes when page becomes visible again

4. **Unsaved Changes Protection:**
   - Sets up `beforeunload` event listener when dirty
   - Browser shows native confirmation dialog
   - Prevents data loss from accidental navigation

### 2. UI Components

#### SaveStatusChip

**Location:** `src/components/notes/SaveStatusChip.tsx`

**Purpose:** Visual indicator for current save state.

**States:**
- `idle`: Hidden (no display)
- `saving`: Loader icon + "Saving…" (muted text)
- `saved`: CheckCircle icon + "Saved" (green text)
- `error`: AlertCircle icon + "Error" (destructive text)

**Accessibility:**
- `role="status"` for saving/saved states
- `role="alert"` for error state
- `aria-live="polite"` for status updates
- `aria-live="assertive"` for errors

#### EditorHeader

**Location:** `src/components/notes/EditorHeader.tsx`

**Purpose:** Sticky header with navigation, title, and save controls.

**Props:**
```typescript
interface EditorHeaderProps {
  title: string;
  saveState: SaveState;
  onSave: () => void;
  onBack: () => void;
  disabled?: boolean;
}
```

**Features:**
- Back button with ArrowLeft icon
- Dynamic title ("New Note" or note title)
- SaveStatusChip integration
- Save button (disabled when saving or validation fails)
- Sticky positioning at top

#### TitleInput

**Location:** `src/components/notes/TitleInput.tsx`

**Purpose:** Controlled input for note title with validation.

**Validation:**
- Required field
- Maximum 120 characters
- Character counter with color coding

**Props:**
```typescript
interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}
```

**Features:**
- Real-time character counter (current/120)
- Red counter when over limit
- Error message display
- Accessibility attributes (aria-invalid, aria-describedby)

#### NoteTextArea

**Location:** `src/components/notes/NoteTextArea.tsx`

**Purpose:** Textarea for note content with validation.

**Validation:**
- Required field
- Minimum 10 characters
- Maximum 1500 characters
- Character counter with color coding

**Props:**
```typescript
interface NoteTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}
```

**Features:**
- Real-time character counter (current/1500)
- Red counter when over limit
- Hint text when under minimum
- Minimum height 200px
- Uses shadcn Textarea component

#### PreferencesOverrideForm

**Location:** `src/components/notes/PreferencesOverrideForm.tsx`

**Purpose:** Optional trip preference overrides for the specific note.

**Props:**
```typescript
interface PreferencesOverrideFormProps {
  value: TripPreferences;
  onChange: (prefs: TripPreferences) => void;
  disabled?: boolean;
}
```

**Fields:**
- **Terrain:** Select (paved/gravel/mixed) - optional
- **Road Type:** Select (scenic/twisty/highway) - optional
- **Duration:** Number input (0.1-999.9 hours) - optional
- **Distance:** Number input (0.1-999999.9 km) - optional

**Features:**
- All fields optional (use profile defaults if empty)
- "Use default" option in selects (uses `"__default__"` sentinel value)
- Clear field when default selected
- Descriptive help text
- Validation ranges match profile preferences
- Defensive handling of undefined `value` prop

#### AutosaveIndicator

**Location:** `src/components/notes/AutosaveIndicator.tsx`

**Purpose:** Shows autosave status and last saved time.

**Props:**
```typescript
interface AutosaveIndicatorProps {
  state: SaveState;
  lastSavedAt?: Date | null;
}
```

**Display Logic:**
- `saving`: "Saving…" (muted text)
- `error`: AlertCircle icon + error message (destructive text)
- `lastSavedAt`: "Autosaved X seconds/minutes ago" (muted text)
- Otherwise: Hidden

**Features:**
- Calculates time difference from lastSavedAt
- Formats as seconds (< 60s) or minutes (≥ 60s)
- Accessibility with role="status" and role="alert"

#### NotesEditorPage

**Location:** `src/components/notes/NotesEditorPage.tsx`

**Purpose:** Main container component that orchestrates the entire editor.

**Props:**
```typescript
interface NotesEditorPageProps {
  noteId?: string;
}
```

**Key Responsibilities:**

1. **State Management:**
   - Uses `useNoteEditor` hook
   - Manages form state through hook methods

2. **Validation:**
   - Client-side validation before save
   - Title: 1-120 characters (trimmed)
   - Note text: 10-1500 characters (trimmed)
   - Shows toast errors for validation failures

3. **Error Handling:**
   - Displays error toasts via sonner
   - Special handling for conflicts (409)
   - Network error messages
   - Not found error state (404)

4. **Navigation:**
   - Back button with unsaved changes confirmation
   - Redirects to edit mode after creating new note
   - Uses `window.location.href` for navigation

5. **Loading States:**
   - Skeleton UI while fetching note
   - Disabled inputs during save
   - Loading indicator in header

6. **Error States:**
   - Not found error page
   - Error banner with descriptive message
   - Back button remains functional

**Validation Logic:**
```typescript
const canSave =
  viewModel.title.trim().length > 0 &&
  viewModel.title.trim().length <= 120 &&
  viewModel.noteText.trim().length >= 10 &&
  viewModel.noteText.trim().length <= 1500;
```

### 3. Astro Routes

#### Create Route

**Location:** `src/pages/notes/new.astro`

**Configuration:**
```astro
export const prerender = false;
```

**Features:**
- Server-side rendering disabled for dynamic content
- Renders `NotesEditorPage` with no `noteId`
- Uses `client:only="react"` directive
- Protected by session middleware

#### Edit Route

**Location:** `src/pages/notes/[noteId].astro`

**Configuration:**
```astro
export const prerender = false;
const { noteId } = Astro.params;
```

**Features:**
- Dynamic route parameter for note ID
- Passes `noteId` to `NotesEditorPage`
- Uses `client:only="react"` directive
- Protected by session middleware

## API Integration

### Endpoints Used

| Action | Endpoint | Method | Request | Response |
|--------|----------|--------|---------|----------|
| Fetch note | `/api/notes/:noteId` | GET | - | `NoteResponse` |
| Create note | `/api/notes` | POST | `CreateNoteRequest` | `NoteResponse` (201) |
| Update note | `/api/notes/:noteId` | PUT | `UpdateNoteRequest` | `NoteResponse` |

### Request Types

**CreateNoteRequest / UpdateNoteRequest:**
```typescript
interface CreateNoteRequest {
  title: string;           // 1-120 chars
  note_text: string;       // 10-1500 chars
  trip_prefs?: TripPreferences;
}
```

**TripPreferences:**
```typescript
interface TripPreferences {
  terrain?: "paved" | "gravel" | "mixed";
  road_type?: "scenic" | "twisty" | "highway";
  duration_h?: number;     // 0.1-999.9
  distance_km?: number;    // 0.1-999999.9
}
```

### Error Handling

**HTTP Status Codes:**
- `400`: Validation error → Show toast with details
- `401`: Unauthorized → Redirect to `/`
- `404`: Not found → Show error state
- `409`: Conflict (duplicate title) → Show specific toast
- `5xx`: Server error → Show generic error toast
- Network error → Show connection error toast

**Error Response Format:**
```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, string>;
  timestamp?: string;
}
```

## User Interactions

### 1. Creating a New Note

**Flow:**
1. User navigates to `/notes/new`
2. Empty form loads
3. User enters title and note text
4. Optional: User overrides trip preferences
5. User clicks Save or waits for autosave
6. On success: Redirects to `/notes/:noteId` (edit mode)
7. Toast: "Note saved - Your note has been created"

### 2. Editing an Existing Note

**Flow:**
1. User navigates to `/notes/:noteId`
2. Loading skeleton appears
3. Note data fetched and populated
4. User modifies fields (dirty flag set)
5. Autosave triggers after 30s of inactivity
6. User clicks Save for immediate save
7. Toast: "Note saved - Your changes have been saved"

### 3. Validation Errors

**Scenarios:**
- Empty title → Toast: "Title required"
- Title > 120 chars → Toast: "Title too long"
- Note text < 10 chars → Toast: "Note too short"
- Note text > 1500 chars → Toast: "Note too long"
- Duplicate title → Toast: "Title already exists"

### 4. Unsaved Changes Warning

**Trigger:** User attempts to navigate away with `dirty=true`

**Behavior:**
- Browser shows native confirmation dialog
- Message: "You have unsaved changes. Are you sure you want to leave?"
- User can cancel or proceed

**Implementation:** `beforeunload` event listener

### 5. Autosave Behavior

**Conditions:**
- Dirty flag is true
- Title is not empty (after trim)
- Note text ≥ 10 characters (after trim)
- 30 seconds elapsed since last change

**Visual Feedback:**
- AutosaveIndicator shows "Saving…"
- SaveStatusChip shows saving state
- On success: "Autosaved X seconds ago"
- On error: Error message with retry info

## Styling and Layout

### Responsive Design

**Mobile (< 768px):**
- Full-width form
- Stacked layout
- Bottom TabBar (fixed)
- Sticky header

**Desktop (≥ 768px):**
- Max-width 768px (3xl)
- Centered content
- Same sticky header
- Bottom TabBar

### Color Scheme

**Status Colors:**
- Saving: `text-muted-foreground`
- Saved: `text-green-600 dark:text-green-500`
- Error: `text-destructive`

**Character Counters:**
- Normal: `text-muted-foreground`
- Over limit: `text-destructive`

### Spacing

- Page padding: `p-4`
- Form spacing: `space-y-6`
- Field spacing: `space-y-2`
- Bottom padding: `pb-16` (for TabBar)

## Accessibility

### ARIA Attributes

**Form Fields:**
- `aria-invalid`: Set when validation fails
- `aria-describedby`: Links to error messages
- `aria-label`: Descriptive labels for buttons

**Status Updates:**
- `role="status"` with `aria-live="polite"` for saves
- `role="alert"` with `aria-live="assertive"` for errors

**Icons:**
- `aria-hidden="true"` on decorative icons
- Descriptive text alongside icons

### Keyboard Navigation

- Tab order: Title → Note Text → Preferences → Save
- Enter in form submits (hidden submit button)
- Escape closes dialogs (browser default)

### Screen Reader Support

- Semantic HTML (`<form>`, `<label>`, `<input>`)
- Error messages announced via aria-live
- Status changes announced
- Field requirements indicated with asterisks

## Testing

### Unit Tests

**Location:** `src/lib/hooks/useNoteEditor.test.ts`

**Coverage:** 21 tests, all passing

**Test Suites:**

1. **Initialization - Create Mode (2 tests)**
   - Empty values when no noteId
   - No fetch call on mount

2. **Initialization - Edit Mode (4 tests)**
   - Fetches note data
   - Handles 404 not found
   - Redirects on 401 unauthorized
   - Handles network errors

3. **Field Updates (4 tests)**
   - Updates title and marks dirty
   - Updates note text and marks dirty
   - Updates trip preferences and marks dirty
   - Resets dirty flag

4. **Save - Create Note (3 tests)**
   - Creates via POST
   - Trims whitespace
   - Transitions save states

5. **Save - Update Note (1 test)**
   - Updates via PUT

6. **Save - Error Handling (4 tests)**
   - Handles validation errors (400)
   - Handles conflicts (409)
   - Handles network errors
   - Prevents concurrent saves

7. **Dirty State (2 tests)**
   - Marks as dirty on changes
   - Clears dirty after save

8. **Last Saved Tracking (1 test)**
   - Updates lastSavedAt timestamp

**Test Setup:**
- Mocked `window.fetch`
- Mocked `window.location`
- React Testing Library hooks
- Vitest framework

## Performance Considerations

### Optimization Strategies

1. **Debounced Autosave:**
   - 30-second interval prevents excessive API calls
   - Clears interval when not dirty

2. **Concurrent Save Prevention:**
   - Ref-based locking mechanism
   - Second save returns false immediately

3. **Visibility Change Handling:**
   - Pauses autosave when page hidden
   - Reduces unnecessary background operations

4. **Minimal Re-renders:**
   - useCallback for update functions
   - Controlled components with local state
   - No unnecessary effect dependencies

### Bundle Size

**Dependencies Added:**
- `react-textarea-autosize`: ~2KB gzipped
- No other new dependencies (uses existing shadcn components)

## Error Scenarios and Handling

### Client-Side Errors

| Scenario | Detection | Handling |
|----------|-----------|----------|
| Empty title | Pre-save validation | Toast error, prevent save |
| Title too long | Character counter | Visual warning, toast on save |
| Note too short | Character counter | Visual hint, toast on save |
| Note too long | Character counter | Visual warning, toast on save |
| Invalid preferences | Type validation | Inline error messages |

### Server-Side Errors

| Status | Scenario | Handling |
|--------|----------|----------|
| 400 | Validation failed | Toast with error message |
| 401 | Session expired | Redirect to `/` |
| 404 | Note not found | Error state page |
| 409 | Duplicate title | Specific toast message |
| 500 | Server error | Generic error toast |
| Network | Connection failed | Connection error toast |

### Edge Cases

1. **Rapid Field Updates:**
   - State updates batched by React
   - No performance issues

2. **Save During Autosave:**
   - Concurrent save prevention
   - Second save returns false

3. **Navigation During Save:**
   - Dirty flag prevents navigation
   - Browser confirmation dialog

4. **Page Hidden During Save:**
   - Save completes in background
   - Autosave paused until visible

## Dependencies

### New Dependencies

```json
{
  "react-textarea-autosize": "^8.5.3"
}
```

### Shadcn Components Used

- Button
- Input
- Label
- Select
- Textarea (newly added)
- Dialog (for confirmations)

### Existing Hooks/Services

- `useNoteEditor` (new, created for this view)
- Toast notifications (sonner)
- TabBar component (shared)

## File Structure

```
src/
├── components/
│   └── notes/
│       ├── NotesEditorPage.tsx       (main page component)
│       ├── EditorHeader.tsx          (header with save controls)
│       ├── SaveStatusChip.tsx        (save state indicator)
│       ├── AutosaveIndicator.tsx     (autosave status)
│       ├── TitleInput.tsx            (title field)
│       ├── NoteTextArea.tsx          (note content field)
│       ├── PreferencesOverrideForm.tsx (trip preferences)
│       └── index.ts                  (exports)
├── lib/
│   └── hooks/
│       ├── useNoteEditor.ts          (editor logic hook)
│       └── useNoteEditor.test.ts     (unit tests)
├── pages/
│   └── notes/
│       ├── new.astro                 (create route)
│       └── [noteId].astro            (edit route)
└── components/
    └── ui/
        └── textarea.tsx              (shadcn component)
```

## Future Enhancements

### Potential Improvements

1. **Rich Text Editor:**
   - Markdown support
   - Formatting toolbar
   - Preview mode

2. **Offline Support:**
   - IndexedDB caching
   - Sync when online
   - Conflict resolution

3. **Version History:**
   - Track changes
   - Restore previous versions
   - Diff view

4. **Collaborative Editing:**
   - Real-time updates
   - Presence indicators
   - Conflict resolution

5. **Advanced Autosave:**
   - Debounced on keystroke
   - Optimistic updates
   - Retry with exponential backoff

6. **Keyboard Shortcuts:**
   - Cmd/Ctrl+S for save
   - Cmd/Ctrl+Shift+S for save and close
   - Escape to cancel

7. **Draft Management:**
   - Auto-save drafts locally
   - Restore unsaved changes
   - Draft indicator

## Known Limitations

1. **Autosave Timing:**
   - Fixed 30-second interval
   - No adaptive timing based on user behavior

2. **Concurrent Editing:**
   - No conflict detection if same note edited elsewhere
   - Last write wins

3. **Character Counter:**
   - Counts all characters including whitespace
   - No word count

4. **Preferences Validation:**
   - Client-side only
   - Server should also validate

5. **Network Resilience:**
   - No retry mechanism for failed saves
   - User must manually retry

## Bug Fixes During Implementation

### 1. Undefined TripPreferences Error
**Issue:** `PreferencesOverrideForm` tried to access properties on undefined `value` prop during initial render.

**Fix:** Added defensive check to ensure value is always an object:
```typescript
const prefs = value ?? {};
```

### 2. TabBar Missing currentPath Prop
**Issue:** `TabBar` component received undefined `currentPath`, causing `startsWith` error.

**Fix:** Pass appropriate path based on route:
```tsx
<TabBar currentPath={noteId ? `/notes/${noteId}` : "/notes/new"} />
```

### 3. Radix UI Select Empty String Value
**Issue:** Radix UI's `SelectItem` doesn't allow empty string (`""`) as a value.

**Fix:** Used sentinel value `"__default__"` for "Use default" option:
```tsx
<SelectItem value="__default__">Use default</SelectItem>
```

And updated the change handler:
```tsx
onValueChange={(val) => (val === "__default__" ? clearField(...) : updateField(...))}
```

## Lessons Learned

1. **Autosave Complexity:**
   - Timer management requires careful cleanup
   - Visibility change handling prevents wasted API calls
   - Concurrent save prevention is critical

2. **Testing Async Hooks:**
   - Fake timers complicate async operations
   - Better to test behavior than implementation
   - Simplified tests are more maintainable

3. **Form State Management:**
   - Custom hook provides clean separation
   - Dirty tracking essential for UX
   - Validation should happen at multiple layers

4. **Error Handling:**
   - User-friendly messages improve experience
   - Different error types need different handling
   - Toast notifications work well for transient errors

## Conclusion

The Notes Editor view is fully implemented and tested, providing a robust interface for creating and editing motorcycle trip notes. The implementation follows best practices for React hooks, form management, and accessibility. The autosave feature and unsaved changes protection ensure users never lose their work, while the clean UI and real-time validation provide an excellent user experience.

All 21 unit tests pass, and the implementation adheres to the project's coding standards and architectural patterns. The view is ready for integration with the backend API and user testing.

