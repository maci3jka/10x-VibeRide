# VibeRide MVP – UI Architecture Planning Summary

<conversation_summary>

<decisions>
1. Landing page requires Google sign-in CTA; nav hidden until authenticated.
2. Notes list uses infinite scroll/pagination with updated-at desc sort.
3. Itinerary generation view shows progress bar via status polling; Generate button disabled during runs.
4. Safety disclaimer rendered as inline note under Download GPX button (no modal).
5. Mobile navigation uses bottom tab bar (Notes, Generate, Profile) with swipe gestures for note actions; sidebar on desktop.
6. Theming standardized on Tailwind + Shadcn/ui with a dark-mode toggle in tab bar.
7. Global state managed by React context + TanStack Query; optimistic updates and caching configured.
8. Centralized HTTP/error handler surfaces toasts; 401 triggers sign-out toast then redirect.
9. Swipe left deletes, swipe right archives notes with confirm dialog; archived list collapsible.
10. Pre-fetch user preferences at app load; last-opened note restored from sessionStorage.
11. Skeleton loaders, minimum 48×48 px tap targets, bottom bar hides on keyboard open.
12. Session refresh handled via Supabase listener; throttle retries.
13. Full-page 404/500 error screens; AbortController 15 s fetch timeout.

</decisions>

<matched_recommendations>
1. Avatar dropdown for Profile / Sign-out in global nav.
2. Inline profile completion indicator in nav.
3. Note editor manual Save + 30 s autosave debounce.
4. Empty-state SVG with create-note CTA.
5. Lucide icons for all UI glyphs.
6. API rate-limit (429) toast with retry countdown.
7. Deep link handling with in-tab stack navigation.
8. Reusable ConfirmDialog component with ARIA roles.
9. Spinner: motorcycle wheel SVG (1 rev/s) during generation.
10. Offline slim banner using navigator.onLine.
11. Bottom-tab view transitions (fade/slide 150 ms, respects reduced-motion).
12. Preference conflict dialog (overwrite/reload) using updated_at check.
13. Resolved Preferences collapsible summary before Generate.
14. Error retry card with timer on 500 + retry_after.
15. GPX filename skeleton placeholder.
16. Preload icons/fonts via link preload.

</matched_recommendations>

<ui_architecture_planning_summary>
The MVP UI comprises three primary authenticated views—Notes, Generate, and Profile—accessed through a persistent bottom tab bar on mobile (floating pill on desktop). Unauthenticated users see a minimalist landing page with a Google sign-in button.

The Notes tab lists user notes sorted by `updated_at` desc, supports infinite scroll with TanStack Query pagination, and provides swipe gestures (left = delete, right = archive). Archived notes reside under a collapsible header. Empty state shows an illustration prompting note creation. Selecting a note opens an editor with manual save plus autosave. The last opened note ID is stored in sessionStorage for restoration.

The Generate tab shows the selected note’s details and a collapsible “Resolved Preferences” card combining defaults and overrides. Pressing Generate posts to `/api/notes/:id/itineraries`; while a generation is running, the button is disabled, a dim overlay with a rotating motorcycle wheel spinner appears, and progress is polled via `/status`. Duplicate generations are blocked and indicated via a tooltip. Server 500s with `retry_after` render an error card with a countdown button.

On success, the itinerary summary appears with a Download GPX button followed by an inline safety disclaimer text. Clicking Download fetches the file with `acknowledged=true`. A skeleton placeholder shows while the filename resolves.

The Profile tab loads instantly using pre-fetched preferences, allowing updates with optimistic UI and conflict detection via `updated_at`. A settings sheet exposes hotkey toggles and analytics opt-out; dark mode is toggled via a sun/moon icon in the tab bar and stored in localStorage.

Global state: Supabase client for auth, React context for session, TanStack Query for server cache (stale-while-revalidate, optimistic mutations, abort after 15 s). Error handling funnels through a custom HTTP wrapper mapping codes to toast notifications. 401 responses and token-refresh failures trigger a toast then redirect. Network offline status shows a slim banner.

Accessibility: WCAG-compliant colors, 48 px tap targets, ARIA-labeled tab bar (`role="tab"`), focus-trapped dialogs, reduced-motion respects user preference.

Responsiveness: Mobile-first Tailwind breakpoints, bottom bar hides on keyboard; desktop layout constrained to 1280 px with centered floating tab bar. Icons/fonts preloaded to avoid shift.

Security: All API calls include Supabase JWT; authenticated middleware guards protected routes. Error pages prevent info leaks. No local storage of sensitive data.

</ui_architecture_planning_summary>

<unresolved_issues>
1. Landing-page hero copy regarding GPX accuracy deferred.
2. AI spend-cap banner and onboarding tooltip tour postponed—revisit post-MVP.
3. Quick note filters, itinerary version history, “New” feature badge not included in MVP.
4. Decision on communicating dark-mode local scope intentionally skipped.
</unresolved_issues>

</conversation_summary>
