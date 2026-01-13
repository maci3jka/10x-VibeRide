## Executive Summary
The generation, download, notes, and past-itinerary views contain oversized React components with duplicated logic and scattered side-effects. Refactoring will extract reusable hooks/services, split monolith components, and centralise utilities, reducing complexity and technical debt while improving testability.

## Identified Issues
- Five components exceed 250 LOC, breaching SRP.
- Duplicate map-provider API calls and error handling.
- Repeated online-status, localStorage, and toast logic.
- Inline validation and preference-resolution utilities.
- Excessive `useEffect` chains creating tangled side-effects.
- Navigation performed via `window.location` across components.

## Proposed Changes
### High Priority
- **Split monolith components** (`PastItinerariesSection`, `GeneratePage`, `DownloadSection`, `NotesPage`, `NotesEditorPage`) into smaller presentational units and dedicated containers. *Complexity: Moderate*. *Depends on: none*.
- **Create shared hooks**: `useMapProvider`, `useOnlineStatus`, `useErrorToast`, `useSelectedNote`. *Complexity: Moderate*. *Depends on: hook extraction groundwork*.
- **Move GeoJSON, date, preference helpers** to `src/lib/services` & `src/lib/utils`. *Complexity: Simple*. *Depends on: none*.

### Medium Priority
- **Introduce state reducers/state-machine hooks** in `GeneratePage` and `NotesPage` to replace scattered `useState`+`useEffect`. *Complexity: Complex*. *Depends on: component split*.
- **Centralise validation** in `noteValidators.ts`; remove inline checks in `NotesEditorPage`. *Complexity: Simple*. *Depends on: utilities extraction*.
- **Create navigation service** wrapping `window.location` to standardise routing side-effects. *Complexity: Simple*. *Depends on: none*.
- **Extract download-format and error constants** to config files. *Complexity: Simple*. *Depends on: utilities extraction*.

### Low Priority
- **Enforce <150 LOC component guideline via lint rule/docs**. *Complexity: Simple*. *Depends on: component split*.
- **Add tests for new hooks and services** using Vitest & React Testing Library. *Complexity: Moderate*. *Depends on: hook creation*.

## Implementation Order
1. Extract shared utilities (helpers, config)
2. Split `PastItinerariesSection` and create `useMapProvider`
3. Split `DownloadSection` using shared hook
4. Create `useOnlineStatus`, `useErrorToast`, navigation service
5. Refactor `GeneratePage` with new hooks and reducer
6. Refactor `NotesPage` similarly
7. Move validation to `noteValidators.ts` and clean `NotesEditorPage`
8. Add tests and enforce LOC guideline

## Risks & Considerations
- Behavioural regressions during component splits; mitigate with snapshot/component tests.
- Tight coupling to existing hooks may break; refactor incrementally and keep API stable.
- State-machine introduction increases upfront effort but simplifies future maintenance.
- Ensure centralised services avoid React-specific code to remain framework-agnostic.
