# View Implementation Plan – Profile

## 1. Overview
The **Profile** view lets an authenticated rider create or update their default riding preferences (terrain, road type, typical duration, typical distance) and manage basic app settings (dark-mode toggle, analytics opt-out, sign-out). It blocks access to trip-planning features until preferences are completed (US-002) and enables later edits (US-003). All preference data is persisted via the `/api/user/preferences` GET/PUT endpoints.

## 2. View Routing
* **Path**: `/profile`
* **Route type**: Astro page with client-side React island for interactive form (`src/pages/profile.astro`).
* **Access control**: Protected by middleware – unauthenticated users redirected to sign-in. Page guards additionally redirect to **/notes** if preferences already complete and route visited explicitly.

## 3. Component Structure
```
ProfilePage (Astro)
 ├── Layout (site-wide)
 └── <ProfileScreen />          ← React island (hydrated)
      ├── <TabBar />           (cross-view nav)
      ├── <PreferencesForm />  (form fields)
      │     ├── <SelectField /> terrain
      │     ├── <SelectField /> road_type
      │     ├── <NumberField /> typical_duration_h
      │     └── <NumberField /> typical_distance_km
      ├── <AppSettingsSheet /> (dark mode, analytics opt-out) – modal/sheet
      ├── <SaveButton />       (enabled when form dirty & valid)
      ├── <ConflictDialog />   (updated_at mismatch)
      ├── <Toast />            (global feedback)
      └── <OfflineBanner />
```

## 4. Component Details

### ProfileScreen
* **Purpose**: Orchestrates data fetch, form state, mutations, error handling.
* **Main elements**: heading, PreferencesForm, SaveButton, link to AppSettingsSheet, TabBar.
* **Events**:
  * `onMount` → fetch preferences (GET).
  * `onSaveClick` → validate & PUT.
* **Validation**: Delegated to PreferencesForm.
* **Types**: `UserPreferencesResponse`, `UpdateUserPreferencesRequest`, `ProfileViewModel` (see §5).
* **Props**: none (root of island).

### PreferencesForm
* **Purpose**: Capture four preference fields.
* **Elements**: shadcn `Select`, `Input` (number), `Fieldset` with accessible labels.
* **Events**:
  * `onChange` per field → lift state up via `onUpdate`.
* **Validation** (client):
  * terrain & road_type – non-empty enums.
  * typical_duration_h – number >0 ≤999.9.
  * typical_distance_km – number >0 ≤999 999.9.
  * Real-time error messages below fields.
* **Types**: `PreferencesFormValues`.
* **Props**: `{ value: PreferencesFormValues; onUpdate(v); errors: Partial<Record<key, string>> }`.

### SaveButton
* **Purpose**: Triggers save with optimistic UI.
* **State**: idle | saving | success | error.
* **Disabled** when form invalid, untouched or request inflight.
* **Props**: `{ disabled: boolean; state: "idle"|"saving"|...; onClick() }`.

### AppSettingsSheet
* **Purpose**: Slide-over sheet for dark mode + analytics toggle + sign-out.
* **Handled events**: toggle darkMode (updates localStorage / document.class), toggle analyticsOptOut (localStorage), click signOut (calls auth client).
* **Validation**: none.
* **Props**: `isOpen`, `onClose`.

### ConflictDialog
* **Purpose**: Inform user their data changed on server (409). Offer overwrite vs reload.
* **Props**: `{ serverPrefs: UserPreferencesResponse; onOverwrite(); onReload(); }`.

### Toast, TabBar, OfflineBanner
* Re-used cross-view components; no new props.

## 5. Types
```
// Derived backend models
import { UserPreferencesResponse, UpdateUserPreferencesRequest } from "src/types";

// Client-only view model (=form values + meta)
export type PreferencesFormValues = {
  terrain: "paved" | "gravel" | "mixed" | ""; // empty string before selection
  road_type: "scenic" | "twisty" | "highway" | "";
  typical_duration_h: string;   // keep as string for controlled input
  typical_distance_km: string;
};

export interface ProfileViewModel {
  form: PreferencesFormValues;
  errors: Partial<Record<keyof PreferencesFormValues, string>>;
  serverData?: UserPreferencesResponse; // fetched copy for dirty check
  status: "loading" | "ready" | "saving" | "success" | "error";
}
```

## 6. State Management
* **useProfileState** (custom hook in `src/lib/hooks/useProfileState.ts`)
  * Holds `ProfileViewModel` state.
  * Exposes `updateField`, `validate`, `save`, `reset` helpers.
  * Consumes `useUserPreferences` (below).
* **useUserPreferences** (shared)
  * `fetch()` → GET /api/user/preferences.
  * `upsert(data)` → PUT.
  * Returns `{ data, error, isFetching, upsert, isMutating }`.
* React Context not needed; local state suffices.

## 7. API Integration
* **GET /api/user/preferences**
  * Called on mount.
  * Success → populate form, status `ready`.
  * 404 → treat as first-time user (form empty).
* **PUT /api/user/preferences**
  * Payload: `UpdateUserPreferencesRequest` built from validated form.
  * On 200/201 → update local `serverData`, show success toast.
  * On 400 → surface field errors returned in `details`.
  * On 401 → redirect to sign-in.
  * On 409/500 → show error toast; if 409 map to ConflictDialog.
* **Headers**: `Content-Type: application/json`.

## 8. User Interactions
1. **Load Profile** → shows spinner until data fetched.
2. **Edit fields** → validation runs per change; SaveButton enabled when valid & dirty.
3. **Click Save** → button enters saving state, optimistic update (disable inputs), toast on success.
4. **Open Settings** → sheet slides in; dark-mode toggle persists to localStorage and adds `dark` class.
5. **Toggle analytics** → persists flag.
6. **Sign out** → invokes auth client, redirects to landing.
7. **Offline** → OfflineBanner visible, Save disabled.

## 9. Conditions and Validation
| Field | Condition | Component | UI Feedback |
|-------|-----------|-----------|-------------|
| terrain | one of enum | SelectField | red border + message |
| road_type | one of enum | SelectField | red border |
| typical_duration_h | numeric >0 ≤999.9 | NumberField | inline error |
| typical_distance_km | numeric >0 ≤999 999.9 | NumberField | inline error |
| All | form valid & dirty → Save enabled | SaveButton | disabled attr |
| Auth | redirect if locals.user missing | ProfilePage | — |

## 10. Error Handling
* **Network / 5xx**: Toast with retry link; SaveButton reverts to idle.
* **Validation (400)**: map `details` keys to field errors.
* **Unauthenticated (401)**: Global middleware handles; fallback redirect.
* **Not Found (404)**: treat as new profile.
* **Conflict (updated_at mismatch)**: show ConflictDialog – allow user to reload or overwrite.
* **Offline**: detect via `navigator.onLine` – show OfflineBanner and disable Save.

## 11. Implementation Steps
1. **Scaffold route** `src/pages/profile.astro` importing Layout & React island.
2. **Create hook** `useUserPreferences` with fetch & upsert using `fetch` API.
3. **Create hook** `useProfileState` managing form, validation via Zod (`updateUserPreferencesSchema`).
4. **Build PreferencesForm** using shadcn/ui components + client validation.
5. **Build SaveButton** component with state prop.
6. **Implement ProfileScreen**: integrate hooks, handle events, render components.
7. **Add AppSettingsSheet** with dark-mode & analytics toggles; reuse in other views if needed.
8. **Add ConflictDialog** and integrate with PUT error handler.
9. **Integrate TabBar, Toast, OfflineBanner** (existing shared components).
10. **Write unit tests** for hooks (validation, save), component render, disabled logic.
11. **Write integration test** (Cypress/Playwright) covering happy path & validation errors.
12. **Run linter & fix**; ensure zero errors.
13. **Update docs** (`.ai/ui-plan.md` links) & commit.
