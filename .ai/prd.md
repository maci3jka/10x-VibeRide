# Product Requirements Document (PRD) - VibeRide

## 1. Product Overview
VibeRide is an online-first, responsive web application that helps motorcycle enthusiasts quickly transform simple trip notes into engaging, high-level itineraries and downloadable GPX 1.1 files. The MVP targets three core rider personas—weekend group riders, after-work short-loop riders, and long-trip tourers—providing them with an AI-assisted planning flow that starts from a plain-text note and ends with an itinerary ready for the road.

Key flow: sign in with Google → complete riding preferences profile → create/edit a note → generate itinerary (with spinner) → review/regenerate → download GPX (after safety disclaimer) → save/browse past notes. All data is stored in a simple database (`user_preferences`, `notes`) while generation is handled by OpenAI with a global API key. The entire app runs containerized for easy local demos.

## 2. User Problem
Planning a motorcycle trip is time-consuming and often frustrating. Riders must research terrain, scenic roads, and attractions, then fit them into workable durations and distances. Existing tools either focus on precise routing (too detailed upfront) or generic travel advice (not motorcycle-specific). Riders need a quick way to turn rough ideas into a structured plan tailored to their preferences, without spending hours on research or complex mapping tools.

## 3. Functional Requirements
1. Authentication
   1.1 Google OAuth sign-in/out
2. User Profile
   2.1 Required fields: preferred terrain, road type, typical ride duration (hours), typical distance range (km)
   2.2 Save disabled until all required fields are complete
   2.3 Ability to update preferences at any time
3. Notes
   3.1 Create, read, update, delete plain-text notes (≤1 500 characters)
   3.2 Each note stores per-trip preference overrides
4. AI Itinerary Generation
   4.1 Build prompt from note + preferences
   4.2 Call OpenAI with global key; one generation at a time per user
   4.3 Display animated spinner during processing; disable Generate button
   4.4 Allow regeneration with modified inputs (replaces prior summary)
5. Itinerary Presentation
   5.1 Display high-level day/segment list (no turn-by-turn)
   5.2 Provide Download GPX button
   5.3 Show safety disclaimer modal before GPX download
6. GPX Export
   6.1 Stream GPX 1.1 file directly to browser without server storage
7. Data Model
   7.1 `user_preferences` (user_id PK)
   7.2 `notes` (note_id PK, user_id FK, note_text, trip_prefs_json, ai_summary)
8. Analytics
   8.1 Query DB for profile completion and generation counts
9. Performance & Reliability
   9.1 Global OpenAI spend limit via environment variable
   9.2 Containerized deployment; must run locally via Docker
10. Accessibility & Compliance (post-MVP)
   10.1 Basic keyboard navigation; full WCAG and GDPR deferred

## 4. Product Boundaries
In Scope (MVP):
- Google OAuth authentication
- Profile form with required preference fields
- Plain-text notes CRUD (≤1 500 chars)
- AI-generated high-level itineraries (no detailed routing)
- GPX 1.1 export streamed to user
- Safety disclaimer placeholder modal
- Basic analytics via DB queries
- Containerized application runnable locally

Out of Scope (Deferred):
- Sharing plans between users
- Turn-by-turn route creation
- Rich multimedia inputs/analysis (photos, videos)
- Advanced time/logistics planning
- Version history of itineraries
- Fine-grained OpenAI spend tracking per user
- CI/CD pipeline, DB migrations, backups
- Full accessibility & GDPR compliance
- Hosting/production deployment decisions

## 5. User Stories
| ID | Title | Description | Acceptance Criteria |
|----|-------|-------------|---------------------|
| US-001 | Sign in with Google | As a rider, I want to sign in using my Google account so that my preferences and notes are securely linked to me. | • Sign-in button initiates Google OAuth flow.<br>• On success, user record is created/retrieved.<br>• On failure, user sees an error and remains logged-out.<br>• Sign-out clears session and returns to landing page. |
| US-002 | Complete profile | As a new user, I must fill out my riding preferences before accessing trip planning so that AI plans match my style. | • Profile page loads automatically on first login.<br>• Required fields: terrain, road type, duration (hours), distance (km).<br>• Save button disabled until all fields valid.<br>• On save, data persists and user is redirected to Notes page. |
| US-003 | Update profile | As a user, I can edit my preferences later so that future plans reflect changes. | • Edit action available from nav.<br>• Existing values pre-filled.<br>• Validation identical to initial completion.<br>• Successful save updates `user_preferences`. |
| US-004 | Create note | As a user, I can create a plain-text note describing a potential trip. | • New Note button opens editor.<br>• Character count limited to 1 500.<br>• Save stores note in DB.<br>• Empty or over-limit notes are blocked with message. |
| US-005 | Edit note | As a user, I can edit an existing note to refine my trip idea. | • Selecting a note opens editor with content.<br>• Save updates DB record.<br>• Validation same as creation. |
| US-006 | Delete note | As a user, I can delete a note I no longer need. | • Delete action prompts confirmation.<br>• Confirm removes note from list and DB. |
| US-007 | List notes | As a user, I can browse my saved notes. | • Notes page lists titles/snippets sorted by updated date.<br>• Selecting a note opens detail view. |
| US-008 | Generate itinerary | As a user, I can generate a trip itinerary from my note and preferences. | • Generate button disabled if another generation is running.<br>• Spinner appears during API call.<br>• On success, itinerary summary displays.<br>• On failure, user sees error and can retry. |
| US-009 | Regenerate itinerary | As a user, I can modify inputs and regenerate to get a new plan. | • Changes to note or preferences enable Regenerate.<br>• New summary replaces previous.<br>• Same concurrency, spinner, and error behaviors as initial generation. |
| US-010 | Download GPX | As a user, I can download the generated itinerary as a GPX 1.1 file. | • Download button available after successful generation.<br>• Clicking shows safety disclaimer modal.<br>• Accept streams GPX to browser.<br>• Decline closes modal without download. |
| US-011 | Safety disclaimer | As a user, I must acknowledge a disclaimer before downloading GPX. | • Modal displays placeholder text.<br>• Accept and Decline options behave per US-010.<br>• Acceptance is not stored (placeholder). |
| US-012 | Concurrency guard | As a user, I cannot start multiple generations simultaneously. | • Generate/Regenerate button disabled while request in flight.<br>• Attempting to bypass via API returns 429. |
| US-013 | Preferences override | As a user, I can override default preferences per note. | • Note detail view shows override fields pre-filled with defaults.<br>• Overrides saved in `trip_prefs_json`.<br>• Generation uses overrides when present. |
| US-014 | Authentication required | As an unauthenticated visitor, I am redirected to sign-in when accessing protected routes. | • Direct URL access to /notes or /profile redirects to landing/login.<br>• After successful login, original target route loads. |
| US-015 | View analytics (internal) | As a product owner, I can query basic metrics to gauge success. | • SQL query examples documented.<br>• Queries return profile completion rate and generation count per user. |
| US-016 | Error handling | As a user, I receive clear messages when generation or download fails. | • Server timeouts show retry prompt.<br>• Unknown errors show generic fallback message.<br>• Errors are logged server-side. |
| US-017 | Environment configuration | As a developer, I can run the entire app locally in Docker. | • `docker-compose up` starts all services.<br>• App accessible at localhost with full functionality.<br>• README lists required env vars (OpenAI key, spend limit). |
| US-018 | Rate limiting OpenAI spend | As a system, I must ensure total OpenAI spend stays within a configured limit. | • Environment variable defines monthly spend cap.<br>• API usage tracked and blocked when cap reached.<br>• Admin alert triggered when 80% of cap used. |

## 6. Success Metrics
1. At least 90 % of registered users complete their profile (terrain, road type, duration, distance).
2. At least 75 % of users generate three or more trip itineraries per year.
3. Average itinerary generation time ≤20 seconds at p95.
4. <2 % generation failures per month (excluding user cancellations).
5. <1 % GPX download failures per month.
6. Monthly OpenAI cost remains ≤configured spend cap.
