<conversation_summary>
<decisions>
1. Defined three primary rider personas: weekend group riders, after-work short-loop riders, and long-trip tourers.
2. MVP will generate high-level itineraries only (no turn-by-turn routing).
3. User preference inputs for MVP: terrain type, road type, duration, and distance; users manually enter target hours, km range, and waypoint cap.
4. AI route generation relies on internal model knowledge for MVP; outdated data will be ignored and covered by a placeholder disclaimer before GPX download.
5. Export format fixed to GPX 1.1; no specific GPS ecosystem support in MVP.
6. Success metrics gathered via database queries; initial metrics: profile completion rate and trip generation rate.
7. Core user flow: note → AI plan → review/regenerate (new prompt) → save/browse; no version history of plans kept.
8. Authentication limited to Google OAuth for MVP.
9. OpenAI chosen as LLM backend; global API key and spend limit set via environment variable; per-user spend tracking deferred.
10. Front end: online-first responsive web app, desktop-focused with mobile support; first page post-login is the profile form (required fields indicated, Save disabled until complete).
11. Database schema for MVP: `user_preferences` (default settings) and `notes` (note_text, trip_prefs_json, ai_summary) linked to `user_id`; database recreation acceptable during MVP.
12. Plain-text only for note input, limited to 1 500 characters.
13. Single concurrent generation per user; button disabled until current request completes; animated spinner indicates progress.
14. Generated GPX streamed directly to user without server storage.
15. Containerized application; deployment specifics deferred, but app must run locally for stakeholder demos.
16. Timeline set to four weeks with a single developer leveraging AI assistance.
</decisions>

<matched_recommendations>
1. Focus on three rider personas to guide feature prioritization. ✔️
2. Deliver high-level itinerary generation in MVP, postponing full routing. ✔️
3. Capture terrain, road type, duration, and distance as initial preference fields. ✔️
4. Use GPX 1.1 export and test in common tools later. ✔️
5. Collect core analytics events and query DB for metrics instead of full instrumentation. ✔️
6. Profile-first onboarding with required fields and disabled Save until complete. ✔️
7. Show a safety disclaimer modal before GPX download (placeholder for now). ✔️
8. Store prompt template with placeholders in a DB table for easy edits. ✔️
9. Disable Generate button while a request is in flight and show spinner. ✔️
10. Generate GPX in memory and stream as download to avoid storage complexity. ✔️
</matched_recommendations>

<prd_planning_summary>
The MVP targets three rider personas seeking quick, engaging motorcycle trip planning. Users will authenticate via Google, land on a profile page to enter their riding preferences (terrain, road type, duration, distance), and create a plain-text “note” describing their desired trip. The system builds an AI prompt from the note and structured preferences, calls OpenAI using internal route knowledge, and returns a high-level itinerary. Users may tweak inputs and regenerate; each generation replaces the previous result. A spinner indicates progress, and the GPX 1.1 file is streamed immediately after generation, preceded by a placeholder safety disclaimer.

Data is stored in two primary tables: `user_preferences` (per-user defaults) and `notes` (original note, per-trip preferences JSON, and AI summary). No historical trip versions or backups are maintained. Analytics rely on database queries counting profile completions and trip generations. A global OpenAI key and spending limit are supplied via environment variables; fine-grained spend controls are deferred. The application is containerized, runs locally for demos, and is expected to be feature-complete within four weeks by a single developer.
</prd_planning_summary>

<unresolved_issues>
1. Final copy and UI placement of the disclaimer modal.
2. Exact values for duration-to-distance validation rules (currently deferred).
3. CI pipeline, database migration tooling, and backup strategy to be defined during development.
4. Accessibility, privacy notice, and GDPR compliance postponed beyond MVP.
5. Deployment target (image base, hosting provider) still undecided.
</unresolved_issues>
</conversation_summary>
