# UI Architecture for VibeRide

## 1. UI Structure Overview

VibeRide’s MVP UI is designed around three primary authenticated workspaces—Notes, Generate, and Profile an unauthenticated Landing area and system‐level error pages. A persistent bottom tab bar (mobile) or floating pill bar (desktop) provides first-level navigation for authenticated users, while deep links allow direct routing to individual resources (note, itinerary).

The architecture emphasises:
- Seamless progression from idea (note) → AI generation → GPX download.
- Instant feedback with skeleton loaders and toast notifications.
- Strict access control via Supabase session context; visitors are redirected to Landing when not authenticated.
- WCAG-compliant colours, 48 px tap targets, keyboard support, and reduced-motion friendliness.

## 2. View List

### 2.1 Landing
- **Path**: `/`
- **Purpose**: Marketing blurb & Google sign-in CTA.
- **Key info**: Product tagline, sign-in button, footer links (privacy, terms).
- **Components**: HeroSection, GoogleSignInButton, Footer.
- **UX/Accessibility/Security**: Minimal DOM, no tracker scripts, CSP headers, button labelled `Sign in with Google` (role="button").

### 2.2 Notes List
- **Path**: `/notes`
- **Purpose**: Browse, search, archive or delete trip notes.
- **Key info**: Paginated/infinite list of NoteCards (title, snippet, updated_at, status badges).
- **Components**: TabBar, NotesHeader (search + filters), InfiniteScrollList, NoteCard, ArchivedAccordion, ConfirmDialog, Toast.
- **UX**: Swipe left = delete, right = archive. Skeleton loaders for first paint.
- **Accessibility**: Swipe actions mirrored by visible buttons; list uses `role="list"` + `aria-live="polite"` updates.
- **Security**: Own-user data enforced by RLS; 401 → redirect.

### 2.3 Note Editor
- **Path**: `/notes/:noteId`
- **Purpose**: Create or edit a note and its preference overrides.
- **Key info**: Title field, 1500-char text area, override form (terrain, road, duration, distance), char counter.
- **Components**: TabBar, EditorHeader (Save status), TextAreaAutosize, PreferencesOverrideForm, SaveButton, AutosaveIndicator.
- **UX**: Manual Save + 30 s autosave; dirty prompt on route change.
- **Accessibility**: Form fields labelled, error messages announced via `aria-live`.
- **Security**: Max lengths validated client side; server returns 400 on violation.

### 2.4 Generate (Itinerary Workspace)
- **Path**: `/generate`
- **Purpose**: Trigger AI itinerary generation for selected note; display progress and result.
- **Key info**: Selected note preview, resolved preferences summary, Generate/Regenerate button, progress bar, itinerary summary, Download GPX.
- **Components**: TabBar, NotePreviewCard, ResolvedPreferencesCollapse, GenerateButton, SpinnerWheel, ProgressBar, ItinerarySummary, DownloadButton, SafetyDisclaimerInline, ErrorRetryCard.
- **UX**: Generate disabled when a generation is running; polling status every 2 s; smooth scroll to summary on completion.
- **Accessibility**: Progress bar uses `role="progressbar"`; inline disclaimer text for screen readers.
- **Security**: Concurrency guard (409) surfaced with toast; GPX download requires `acknowledged=true`.

### 2.5 Profile
- **Path**: `/profile`
- **Purpose**: View and update default riding preferences + app settings.
- **Key info**: Preference form, dark mode toggle, analytics opt-out, sign-out button.
- **Components**: TabBar, PreferencesForm, AppSettingsSheet, SaveButton, ConflictDialog.
- **UX**: Optimistic updates, conflict resolution via `updated_at`.
- **Accessibility**: Inputs grouped in fieldsets; toggle buttons labelled.
- **Security**: Service rejects incomplete/invalid data (400).

### 2.6 Analytics (Internal-only)
- **Path**: `/admin/analytics`
- **Purpose**: Display basic usage metrics to product owner.
- **Key info**: Profile completion rate, generation counts.
- **Components**: MetricCard, DateRangePicker, ChartArea.
- **Security**: Guarded by service_role JWT; hidden from normal users.

### 2.7 Error Screens
- **Paths**: `/404`, `/500`, network/offline overlay.
- **Purpose**: Graceful handling of unknown routes, server errors, offline state.
- **Components**: ErrorIllustration, RetryButton, OfflineBanner.
- **Accessibility**: Focus trap within error layout; retry button labelled.

## 3. User Journey Map

1. **Visitor lands** on `/` → clicks **Sign in with Google**.
2. Upon OAuth success, middleware redirects to **/profile** if preferences incomplete (US-002) or **/notes** otherwise.
3. From **Notes List**, rider taps **New Note** → opens **Note Editor** → fills content → **Save**.
4. After save, bottom tab (**Generate**) becomes active; rider navigates there.
5. In **Generate**, resolved preferences are shown; rider presses **Generate**.
6. UI shows spinner + progress (poll `/status`).
7. On completion, **Itinerary Summary** renders with **Download GPX** (US-010) and inline disclaimer (US-011). Rider acknowledges and downloads.
8. Rider returns to **Notes List**; can archive or delete note via swipe – updates list instantly.
9. At any time, rider accesses **Profile** to update defaults; changes reflected in next generation.
10. Error conditions: 401 triggers sign-out toast + redirect; 429 shows rate-limit toast with countdown.

## 4. Layout and Navigation Structure

- **Unauthenticated**: Single-page Landing (no TabBar).
- **Authenticated**: Root `AuthenticatedLayout` wraps Notes, Generate, Profile, Analytics. Contains:
  - **TabBar** (mobile) or floating pill (desktop) with three tabs + avatar menu.
  - Top breadcrumb/navigation hidden; deep links push internal in-tab stacks (Notes → Editor).
- **Routing Rules**:
  - `/notes` default; `/notes/:id` stacked on Notes view (uses sliding transition).
  - `/generate` requires at least one note; if none, redirect to `/notes` with toast.
  - `/profile` always accessible; unsaved changes prompt before leaving.
  - `/admin/*` behind role guard.
- **Global Providers**: SessionContext, ThemeProvider, QueryClientProvider, ToastProvider.

## 5. Key Components (Cross-View)

| Component | Purpose |
|-----------|---------|
| **TabBar / FloatingNav** | Primary navigation between Notes, Generate, Profile. 48 px buttons, icons + labels. |
| **NoteCard** | Displays title, snippet, updated_at, badges; supports swipe actions. |
| **PreferencesForm** | Collects terrain, road type, duration, distance; reused in Profile & override sheet. |
| **GenerateButton** | Handles concurrency state (idle/running/disabled) and tooltips. |
| **SpinnerWheel** | Motorcycle wheel SVG rotates 1 rev/s during generation. |
| **ItinerarySummary** | Renders AI output: day list, highlights, totals. |
| **DownloadButton** | Streams GPX; shows skeleton filename and handles disclaimer param. |
| **Toast** | Centralised feedback: success, error, info, rate-limit countdown. |
| **ConfirmDialog** | Reusable modal for delete/archive with ARIA roles. |
| **ErrorRetryCard** | Displays server errors with retry_after countdown. |
| **SkeletonLoader** | Placeholder for lists, cards, filename. |
| **OfflineBanner** | Detects `navigator.onLine` and alerts user. |

---

### Mapping PRD User Stories to UI Elements (excerpt)

| User Story | UI Location / Element |
|------------|-----------------------|
| US-001 Sign in with Google | Landing → GoogleSignInButton |
| US-002 Complete profile | Profile → PreferencesForm (save validation) |
| US-004 Create note | Notes List → New Note → Note Editor |
| US-008 Generate itinerary | Generate → GenerateButton + Spinner/Progress |
| US-010 Download GPX | Generate → DownloadButton + SafetyDisclaimerInline |
| US-012 Concurrency guard | GenerateButton disabled; toast on 409 |
| US-016 Error handling | ToastProvider + ErrorRetryCard |
| US-017 Local Docker run | No UI impact (dev) |

The full matrix is documented inline in the file for traceability.
