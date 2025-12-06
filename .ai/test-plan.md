# Testing Plan: VibeRide REST API

## 1. Testing Overview

### What's Being Tested
This testing plan covers the comprehensive REST API implementation for VibeRide, a motorcycle trip planning application. The API enables users to manage riding preferences, create trip notes, generate AI-powered itineraries, and export GPX files. Testing encompasses authentication flows, CRUD operations, AI service integration, data validation, error handling, and business logic enforcement.

### Testing Objectives
- Ensure all API endpoints function correctly and return expected responses
- Validate data integrity and business rule enforcement at all layers
- Verify authentication and authorization mechanisms protect user data
- Confirm AI service integration handles success and failure scenarios
- Validate GPX generation and export functionality
- Ensure error handling provides clear, actionable feedback
- Verify performance meets defined targets (p95 < 20s for generation)

### Success Criteria
- ≥80% code coverage for services and validators
- ≥60% code coverage for API endpoints
- ≥70% code coverage for React components
- All critical user flows covered by integration tests
- Zero P0 test failures in main branch
- Test suite executes in <30 seconds locally
- All tests integrated into CI/CD pipeline with coverage reporting
- 100% of API endpoints have both success and error path tests

---

## 2. Test Scope

### In Scope

**API Endpoints:**
- Authentication (sign-out)
- User preferences (GET, PUT)
- Notes (CRUD, archive, unarchive, list with pagination)
- Itineraries (generate, list, get, cancel, delete)
- GPX export
- Health check

**Business Logic:**
- Profile completion gate (must complete preferences before creating notes)
- Concurrency control (one generation per user at a time)
- Title uniqueness per user
- Soft deletion cascades
- Version management for itineraries
- Preference override resolution
- OpenRouter spend limiting

**Data Validation:**
- Zod schema validation for all request payloads
- Enum validation (terrain, road_type, itinerary_status)
- Numeric range validation (duration, distance)
- String length validation (title, note_text)
- Required field enforcement

**Services:**
- UserPreferencesService
- NotesService (future)
- ItinerariesService (future)
- OpenRouterService (already tested)
- GPX generation service (future)

**Middleware:**
- Authentication middleware
- Request validation
- Error handling

**Utilities:**
- HTTP response helpers
- Logger
- Type guards

### Out of Scope (Deferred to Post-MVP)
- Browser-based E2E tests (Playwright/Cypress)
- Performance/load testing
- Security penetration testing
- Accessibility automated testing (WCAG compliance)
- Visual regression testing
- Mobile device testing
- Database migration testing
- Backup/restore testing
- Multi-region deployment testing
- WebSocket real-time features (not in MVP)

---

## 3. Testing Strategy

### Overall Approach
The testing strategy follows the **test pyramid** principle to maximize coverage while maintaining fast feedback cycles and minimizing maintenance overhead:

```
         /\
        /  \  E2E Tests (Future)
       /____\  ~5% - Critical user journeys
      /      \
     / Integ. \ Integration Tests
    /  Tests   \ ~25% - API endpoints, DB operations
   /____________\
  /              \
 /  Unit Tests    \ Unit Tests
/__________________\ ~70% - Services, validators, utilities
```

### Test Pyramid Distribution
- **70% Unit Tests**: Services, validators, utilities, pure functions
  - Fast execution (<10s for entire suite)
  - No external dependencies (mocked)
  - High coverage of business logic
  - Easy to debug and maintain

- **25% Integration Tests**: API endpoints, database operations, service integration
  - Moderate execution time (<20s)
  - Real database or mocked Supabase client
  - Verify component interactions
  - Catch integration issues early

- **5% Component Tests**: React UI components (in scope for this plan)
  - Test user interactions
  - Verify state management
  - Validate form behaviors

### Key Testing Principles
1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Independence**: Each test runs in isolation with its own setup and teardown
3. **Determinism**: Tests produce consistent results regardless of execution order
4. **Fast Feedback**: Prioritize test speed to encourage frequent execution
5. **Clear Failures**: Test names and assertions clearly indicate what failed and why
6. **Maintainability**: Tests are easy to understand and update as requirements evolve

### Rationale
- **Unit-heavy approach**: VibeRide's core value is in business logic (preference resolution, validation, AI integration), which is best tested at the unit level
- **Integration focus on APIs**: API contracts are critical for frontend-backend communication
- **Deferred E2E**: Browser-based E2E tests are expensive to maintain and slow; component tests provide sufficient UI coverage for MVP
- **Mock external services**: OpenRouter and Supabase are mocked in unit tests to avoid API costs, rate limits, and non-deterministic behavior

---

## 4. Test Types and Coverage

### 4.1 Unit Tests

**Coverage Target**: ≥80% for services, validators, and utilities

**Tools**: 
- Vitest (test runner)
- Vitest mocking (`vi.mock`, `vi.fn()`)
- Zod (schema validation)

**Focus Areas**:

**Services:**
- `UserPreferencesService`: CRUD operations, error handling, Supabase client interaction
- `NotesService` (future): Create, update, delete, archive, list with pagination
- `ItinerariesService` (future): Generation, status polling, cancellation, version management
- `GPXService` (future): GPX 1.1 file generation, metadata handling
- `OpenRouterService`: ✅ Already comprehensively tested

**Validators:**
- `userPreferencesSchema`: Terrain, road_type, duration, distance validation
- `noteSchema` (future): Title, note_text, trip_prefs validation
- `itinerarySchema` (future): Request_id, status transitions

**Utilities:**
- `http.ts`: `jsonResponse()`, `errorResponse()` formatting
- `logger.ts`: Log levels, structured logging, error serialization
- `types.ts`: Type guards (`isTerrain()`, `isRoadType()`, `isItineraryStatus()`)

**Test Patterns**:
```typescript
describe('UserPreferencesService', () => {
  let mockSupabase: MockSupabaseClient;
  
  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  describe('getUserPreferences', () => {
    it('should return preferences for existing user', async () => {
      // Arrange: Mock Supabase response
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockPreferences.default,
        error: null
      });

      // Act: Call service method
      const result = await UserPreferencesService.get(mockSupabase, 'user-123');

      // Assert: Verify result
      expect(result).toEqual(mockPreferences.default);
      expect(mockSupabase.from).toHaveBeenCalledWith('viberide.user_preferences');
    });

    it('should return null for non-existent user', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const result = await UserPreferencesService.get(mockSupabase, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: '500', message: 'Database error' }
      });

      await expect(
        UserPreferencesService.get(mockSupabase, 'user-123')
      ).rejects.toThrow('Database error');
    });
  });
});
```

---

### 4.2 Integration Tests

**Coverage Target**: ≥60% for API endpoints

**Tools**:
- Vitest
- Astro endpoint testing (direct function calls)
- Mock Supabase client or test database
- Mock OpenRouter service

**Integration Points**:

**Authentication Flow:**
- Middleware extracts user from JWT
- Protected routes require valid session
- Sign-out clears session and cookies

**API Endpoints:**
- `GET /api/user/preferences`: Fetch user preferences
- `PUT /api/user/preferences`: Create/update preferences
- `POST /api/auth/signout`: Sign out user
- `GET /api/notes`: List notes with pagination
- `POST /api/notes`: Create note
- `GET /api/notes/:noteId`: Get note by ID
- `PUT /api/notes/:noteId`: Update note
- `DELETE /api/notes/:noteId`: Soft delete note
- `POST /api/notes/:noteId/archive`: Archive note
- `POST /api/notes/:noteId/unarchive`: Unarchive note
- `POST /api/notes/:noteId/itineraries`: Generate itinerary
- `GET /api/notes/:noteId/itineraries`: List itineraries for note
- `GET /api/itineraries/:itineraryId`: Get itinerary by ID
- `GET /api/itineraries/:itineraryId/status`: Poll generation status
- `POST /api/itineraries/:itineraryId/cancel`: Cancel generation
- `DELETE /api/itineraries/:itineraryId`: Delete itinerary
- `GET /api/itineraries/:itineraryId/gpx`: Download GPX file
- `GET /api/health`: Health check

**Database Operations:**
- RLS policy enforcement (users can only access own data)
- Soft delete cascades (deleting note soft-deletes itineraries)
- Unique constraints (title per user, version per note)
- Concurrency constraints (one running generation per user)

**Test Patterns**:
```typescript
describe('PUT /api/user/preferences', () => {
  it('should create new preferences (201)', async () => {
    const mockLocals = {
      user: { id: 'user-123' },
      supabase: mockSupabaseClient
    };

    mockSupabaseClient.from().upsert().select().single.mockResolvedValue({
      data: { ...mockPreferences.default, user_id: 'user-123' },
      error: null
    });

    const request = new Request('http://localhost/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terrain: 'paved',
        road_type: 'scenic',
        typical_duration_h: 2.5,
        typical_distance_km: 150.0
      })
    });

    const response = await PUT({ request, locals: mockLocals });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user_id).toBe('user-123');
    expect(data.terrain).toBe('paved');
  });

  it('should return 401 when not authenticated', async () => {
    const mockLocals = { user: null, supabase: mockSupabaseClient };
    const request = new Request('http://localhost/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({})
    });

    const response = await PUT({ request, locals: mockLocals });
    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid payload', async () => {
    const mockLocals = {
      user: { id: 'user-123' },
      supabase: mockSupabaseClient
    };

    const request = new Request('http://localhost/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terrain: 'invalid',  // Invalid enum
        road_type: 'scenic',
        typical_duration_h: -5,  // Negative value
        typical_distance_km: 150.0
      })
    });

    const response = await PUT({ request, locals: mockLocals });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('validation_failed');
    expect(data.details).toHaveProperty('terrain');
    expect(data.details).toHaveProperty('typical_duration_h');
  });
});
```

---

### 4.3 Component Tests

**Coverage Target**: ≥70% for React components

**Tools**:
- Vitest
- @testing-library/react
- @testing-library/user-event
- @testing-library/jest-dom

**Critical Components**:

**Forms:**
- `PreferencesForm`: Validation, submission, error display
- `NoteForm` (future): Character count, trip preference overrides

**Buttons:**
- `SaveButton`: Pristine, dirty, loading, success, error states

**Screens:**
- `ProfileScreen`: User info display, settings sheet, sign-out dialog

**Dialogs/Sheets:**
- `SettingsSheet`: Open/close, form submission
- `SignOutDialog`: Confirmation flow

**Test Patterns**:
```typescript
describe('PreferencesForm', () => {
  it('should render with initial values', () => {
    const initialPrefs = mockPreferences.default;
    render(<PreferencesForm initialValues={initialPrefs} />);

    expect(screen.getByLabelText(/terrain/i)).toHaveValue('paved');
    expect(screen.getByLabelText(/road type/i)).toHaveValue('scenic');
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(await screen.findByText(/terrain is required/i)).toBeInTheDocument();
  });

  it('should submit valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PreferencesForm onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText(/terrain/i), 'paved');
    await user.selectOptions(screen.getByLabelText(/road type/i), 'scenic');
    await user.type(screen.getByLabelText(/duration/i), '2.5');
    await user.type(screen.getByLabelText(/distance/i), '150');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      terrain: 'paved',
      road_type: 'scenic',
      typical_duration_h: 2.5,
      typical_distance_km: 150.0
    });
  });

  it('should display submission errors', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed to save'));
    render(<PreferencesForm onSubmit={onSubmit} />);

    // Fill form and submit
    await user.selectOptions(screen.getByLabelText(/terrain/i), 'paved');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/failed to save/i)).toBeInTheDocument();
  });
});
```

---

### 4.4 Performance Testing (Future - Out of MVP Scope)

**Tools**: k6, Artillery, or Apache JMeter

**Scenarios**:
- Load testing: 100 concurrent users generating itineraries
- Stress testing: Gradual ramp-up to identify breaking point
- Spike testing: Sudden traffic surge handling

**Benchmarks**:
- GET requests: p95 < 100ms
- POST/PUT/DELETE: p95 < 200ms
- Itinerary generation: p95 < 20s
- GPX download: < 2s for typical file

---

### 4.5 Security Testing (Manual for MVP)

**Authentication Tests**:
- Unauthorized access blocked (401)
- Expired JWT handling
- Session refresh flow
- Cookie security flags (httpOnly, secure, sameSite)

**Authorization Tests**:
- Users can only access own data (RLS enforcement)
- Service role has elevated permissions
- Cross-user data access blocked (403)

**Input Validation Tests**:
- XSS prevention in text inputs
- SQL injection prevention (parameterized queries)
- Malformed JSON handling
- File upload restrictions (GPX only)
- Request size limits

**Rate Limiting Tests**:
- Per-user rate limits enforced
- OpenRouter spend cap enforced
- Concurrent generation limit (1 per user)

---

## 5. Test Scenarios and Cases

### 5.1 User Preferences

#### Test Case 1.1: Get User Preferences (Success)
- **Priority**: P0
- **Type**: Integration
- **Description**: Authenticated user retrieves their preferences
- **Preconditions**: User has completed profile
- **Test Steps**:
  1. Authenticate as user-123
  2. Send GET /api/user/preferences
  3. Verify response status 200
  4. Verify response contains terrain, road_type, duration, distance
- **Expected Result**: Preferences returned with correct values
- **Edge Cases**: 
  - User with no preferences returns 404
  - Unauthenticated request returns 401

#### Test Case 1.2: Create User Preferences (Success)
- **Priority**: P0
- **Type**: Integration
- **Description**: New user creates preferences for first time
- **Preconditions**: User authenticated, no existing preferences
- **Test Steps**:
  1. Authenticate as new-user
  2. Send PUT /api/user/preferences with valid payload
  3. Verify response status 201
  4. Verify response contains created_at, updated_at
  5. Verify data persisted in database
- **Expected Result**: Preferences created successfully
- **Edge Cases**:
  - Invalid terrain enum returns 400
  - Negative duration returns 400
  - Missing required field returns 400

#### Test Case 1.3: Update User Preferences (Success)
- **Priority**: P0
- **Type**: Integration
- **Description**: Existing user updates preferences
- **Preconditions**: User has existing preferences
- **Test Steps**:
  1. Authenticate as user-123
  2. Send PUT /api/user/preferences with updated values
  3. Verify response status 200
  4. Verify updated_at timestamp changed
  5. Verify new values persisted
- **Expected Result**: Preferences updated successfully
- **Edge Cases**:
  - Partial update (only some fields) succeeds
  - Invalid values rejected with 400

#### Test Case 1.4: Validation Errors
- **Priority**: P0
- **Type**: Unit
- **Description**: Schema validation catches invalid inputs
- **Preconditions**: None
- **Test Steps**:
  1. Parse payload with invalid terrain: "dirt"
  2. Parse payload with negative duration: -5
  3. Parse payload with missing road_type
  4. Parse payload with duration > 999.9
  5. Parse payload with distance > 999999.9
- **Expected Result**: Each validation returns specific error message
- **Edge Cases**:
  - Boundary values (0.1, 999.9, 0.1, 999999.9) are valid
  - Zero values are invalid

---

### 5.2 Notes

#### Test Case 2.1: Create Note (Success)
- **Priority**: P0
- **Type**: Integration
- **Description**: User creates a new trip note
- **Preconditions**: User authenticated, preferences completed
- **Test Steps**:
  1. Authenticate as user-123
  2. Send POST /api/notes with title, note_text, trip_prefs
  3. Verify response status 201
  4. Verify note_id generated
  5. Verify ai_summary is null initially
- **Expected Result**: Note created successfully
- **Edge Cases**:
  - Title exactly 120 characters succeeds
  - Note text exactly 1500 characters succeeds
  - Trip prefs with partial overrides succeeds
  - Empty trip_prefs defaults to user preferences

#### Test Case 2.2: Create Note Without Profile
- **Priority**: P0
- **Type**: Integration
- **Description**: User without completed profile cannot create notes
- **Preconditions**: User authenticated, no preferences
- **Test Steps**:
  1. Authenticate as new-user
  2. Send POST /api/notes
  3. Verify response status 403
  4. Verify error message indicates profile incomplete
- **Expected Result**: Request rejected with clear message
- **Edge Cases**: None

#### Test Case 2.3: Title Uniqueness Constraint
- **Priority**: P1
- **Type**: Integration
- **Description**: User cannot create notes with duplicate titles
- **Preconditions**: User has note with title "Weekend Ride"
- **Test Steps**:
  1. Authenticate as user-123
  2. Send POST /api/notes with title "Weekend Ride"
  3. Verify response status 409
  4. Verify error indicates title conflict
- **Expected Result**: Duplicate title rejected
- **Edge Cases**:
  - Different user can use same title
  - Deleted note title can be reused

#### Test Case 2.4: List Notes with Pagination
- **Priority**: P1
- **Type**: Integration
- **Description**: User retrieves paginated list of notes
- **Preconditions**: User has 45 notes
- **Test Steps**:
  1. Authenticate as user-123
  2. Send GET /api/notes?page=1&limit=20
  3. Verify response contains 20 notes
  4. Verify pagination metadata (total: 45, total_pages: 3)
  5. Send GET /api/notes?page=2&limit=20
  6. Verify response contains next 20 notes
- **Expected Result**: Pagination works correctly
- **Edge Cases**:
  - Page beyond total_pages returns empty array
  - Limit > 100 capped at 100
  - Invalid page number returns 400

#### Test Case 2.5: Search Notes
- **Priority**: P2
- **Type**: Integration
- **Description**: User searches notes by content
- **Preconditions**: User has notes with various content
- **Test Steps**:
  1. Authenticate as user-123
  2. Send GET /api/notes?search=mountain
  3. Verify only notes containing "mountain" returned
  4. Verify search is case-insensitive
- **Expected Result**: Search returns matching notes
- **Edge Cases**:
  - Empty search returns all notes
  - No matches returns empty array

#### Test Case 2.6: Update Note
- **Priority**: P0
- **Type**: Integration
- **Description**: User updates existing note
- **Preconditions**: User has note with note_id
- **Test Steps**:
  1. Authenticate as user-123
  2. Send PUT /api/notes/:noteId with updated content
  3. Verify response status 200
  4. Verify updated_at timestamp changed
  5. Verify new content persisted
- **Expected Result**: Note updated successfully
- **Edge Cases**:
  - Updating to duplicate title returns 409
  - Updating non-existent note returns 404
  - Updating another user's note returns 403

#### Test Case 2.7: Soft Delete Note
- **Priority**: P0
- **Type**: Integration
- **Description**: User deletes note (soft delete)
- **Preconditions**: User has note with itineraries
- **Test Steps**:
  1. Authenticate as user-123
  2. Send DELETE /api/notes/:noteId
  3. Verify response status 200
  4. Verify deleted_at timestamp set
  5. Verify note excluded from list queries
  6. Verify associated itineraries also soft-deleted
- **Expected Result**: Note and itineraries soft-deleted
- **Edge Cases**:
  - Deleting already-deleted note returns 404
  - Deleting another user's note returns 403

#### Test Case 2.8: Archive/Unarchive Note
- **Priority**: P2
- **Type**: Integration
- **Description**: User archives and unarchives note
- **Preconditions**: User has active note
- **Test Steps**:
  1. Send POST /api/notes/:noteId/archive
  2. Verify archived_at timestamp set
  3. Verify note excluded from default list (archived=false)
  4. Send GET /api/notes?archived=true
  5. Verify archived note included
  6. Send POST /api/notes/:noteId/unarchive
  7. Verify archived_at cleared
- **Expected Result**: Archive/unarchive works correctly
- **Edge Cases**: Archiving archived note is idempotent

---

### 5.3 Itineraries

#### Test Case 3.1: Generate Itinerary (Success)
- **Priority**: P0
- **Type**: Integration
- **Description**: User generates itinerary for note
- **Preconditions**: User has note, no active generation
- **Test Steps**:
  1. Authenticate as user-123
  2. Send POST /api/notes/:noteId/itineraries with request_id
  3. Verify response status 202
  4. Verify itinerary_id returned
  5. Verify status is "pending"
  6. Verify version is 1 (first generation)
- **Expected Result**: Generation initiated successfully
- **Edge Cases**:
  - Request_id must be unique per user
  - Note must exist and belong to user

#### Test Case 3.2: Concurrent Generation Prevention
- **Priority**: P0
- **Type**: Integration
- **Description**: User cannot start multiple generations simultaneously
- **Preconditions**: User has running generation
- **Test Steps**:
  1. Authenticate as user-123
  2. Send POST /api/notes/:noteId/itineraries
  3. Verify response status 409
  4. Verify error indicates generation in progress
  5. Verify active_request_id included in response
- **Expected Result**: Concurrent generation blocked
- **Edge Cases**:
  - Completed generation allows new generation
  - Failed generation allows new generation
  - Cancelled generation allows new generation

#### Test Case 3.3: Poll Generation Status
- **Priority**: P0
- **Type**: Integration
- **Description**: User polls itinerary generation status
- **Preconditions**: User has pending/running itinerary
- **Test Steps**:
  1. Authenticate as user-123
  2. Send GET /api/itineraries/:itineraryId/status
  3. Verify response contains status, progress, message
  4. Poll until status changes to "completed"
  5. Verify summary_json included when completed
- **Expected Result**: Status polling works correctly
- **Edge Cases**:
  - Polling non-existent itinerary returns 404
  - Polling another user's itinerary returns 403

#### Test Case 3.4: Cancel Generation
- **Priority**: P1
- **Type**: Integration
- **Description**: User cancels in-progress generation
- **Preconditions**: User has running generation
- **Test Steps**:
  1. Authenticate as user-123
  2. Send POST /api/itineraries/:itineraryId/cancel
  3. Verify response status 200
  4. Verify status changed to "cancelled"
  5. Verify cancelled_at timestamp set
- **Expected Result**: Generation cancelled successfully
- **Edge Cases**:
  - Cancelling completed generation returns 400
  - Cancelling already-cancelled generation returns 400

#### Test Case 3.5: List Itineraries for Note
- **Priority**: P1
- **Type**: Integration
- **Description**: User retrieves all itinerary versions for note
- **Preconditions**: User has note with 3 itinerary versions
- **Test Steps**:
  1. Authenticate as user-123
  2. Send GET /api/notes/:noteId/itineraries
  3. Verify response contains all 3 versions
  4. Verify sorted by version DESC (latest first)
  5. Send GET /api/notes/:noteId/itineraries?status=completed
  6. Verify only completed itineraries returned
- **Expected Result**: List returns correct itineraries
- **Edge Cases**:
  - Note with no itineraries returns empty array
  - Invalid status filter returns 400

#### Test Case 3.6: Version Management
- **Priority**: P1
- **Type**: Unit
- **Description**: Itinerary versions increment correctly
- **Preconditions**: Note has existing itineraries
- **Test Steps**:
  1. Create itinerary for note (version 1)
  2. Create second itinerary for note (version 2)
  3. Create third itinerary for note (version 3)
  4. Verify each version is unique
  5. Verify versions are sequential
- **Expected Result**: Versions increment correctly
- **Edge Cases**:
  - Concurrent version creation handled by unique constraint

#### Test Case 3.7: OpenRouter Spend Limit
- **Priority**: P0
- **Type**: Integration
- **Description**: Generation blocked when spend limit reached
- **Preconditions**: Monthly spend at 100% of cap
- **Test Steps**:
  1. Authenticate as user-123
  2. Send POST /api/notes/:noteId/itineraries
  3. Verify response status 429
  4. Verify error indicates quota exceeded
  5. Verify retry-after guidance included
- **Expected Result**: Generation blocked with clear message
- **Edge Cases**:
  - 80% threshold triggers admin alert
  - Spend resets on first day of month

---

### 5.4 GPX Export

#### Test Case 4.1: Download GPX (Success)
- **Priority**: P0
- **Type**: Integration
- **Description**: User downloads GPX file for completed itinerary
- **Preconditions**: User has completed itinerary
- **Test Steps**:
  1. Authenticate as user-123
  2. Send GET /api/itineraries/:itineraryId/gpx?acknowledged=true
  3. Verify response status 200
  4. Verify Content-Type: application/gpx+xml
  5. Verify Content-Disposition header with filename
  6. Verify GPX 1.1 XML structure
- **Expected Result**: GPX file streamed successfully
- **Edge Cases**:
  - Missing acknowledged param returns 400
  - acknowledged=false returns 400 with disclaimer
  - Incomplete itinerary returns 422

#### Test Case 4.2: Safety Disclaimer Enforcement
- **Priority**: P0
- **Type**: Integration
- **Description**: User must acknowledge disclaimer before download
- **Preconditions**: User has completed itinerary
- **Test Steps**:
  1. Authenticate as user-123
  2. Send GET /api/itineraries/:itineraryId/gpx (no acknowledged param)
  3. Verify response status 400
  4. Verify error message includes disclaimer text
  5. Send GET /api/itineraries/:itineraryId/gpx?acknowledged=false
  6. Verify response status 400
- **Expected Result**: Disclaimer enforcement works
- **Edge Cases**: None

#### Test Case 4.3: GPX Generation
- **Priority**: P1
- **Type**: Unit
- **Description**: GPX file generated correctly from itinerary
- **Preconditions**: Itinerary with summary_json
- **Test Steps**:
  1. Call GPX generation function with itinerary data
  2. Verify XML structure matches GPX 1.1 spec
  3. Verify waypoints included
  4. Verify metadata (name, description, author)
  5. Verify route segments
- **Expected Result**: Valid GPX 1.1 file generated
- **Edge Cases**:
  - Empty itinerary generates minimal valid GPX
  - Special characters in names are escaped

---

### 5.5 Authentication & Authorization

#### Test Case 5.1: Authentication Middleware
- **Priority**: P0
- **Type**: Integration
- **Description**: Middleware extracts user from valid JWT
- **Preconditions**: Valid JWT in cookie
- **Test Steps**:
  1. Send request with valid JWT cookie
  2. Verify middleware extracts user ID
  3. Verify user attached to request locals
  4. Verify Supabase client attached to locals
- **Expected Result**: User authenticated successfully
- **Edge Cases**:
  - Missing JWT returns 401
  - Expired JWT triggers refresh flow
  - Invalid JWT returns 401

#### Test Case 5.2: Sign Out
- **Priority**: P0
- **Type**: Integration
- **Description**: User signs out and session cleared
- **Preconditions**: User authenticated
- **Test Steps**:
  1. Authenticate as user-123
  2. Send POST /api/auth/signout
  3. Verify response status 200
  4. Verify session cookie cleared
  5. Verify Supabase signOut called
  6. Verify subsequent requests return 401
- **Expected Result**: Sign out successful
- **Edge Cases**:
  - Signing out without session returns 401
  - Supabase error handled gracefully

#### Test Case 5.3: RLS Policy Enforcement
- **Priority**: P0
- **Type**: Integration
- **Description**: Users can only access own data
- **Preconditions**: Two users with data
- **Test Steps**:
  1. Authenticate as user-123
  2. Attempt to access user-456's note
  3. Verify response status 403 or 404
  4. Attempt to update user-456's preferences
  5. Verify response status 403
- **Expected Result**: Cross-user access blocked
- **Edge Cases**:
  - Service role can access all data
  - Public endpoints (health check) don't require auth

---

### 5.6 Error Handling

#### Test Case 6.1: Validation Errors
- **Priority**: P0
- **Type**: Integration
- **Description**: Validation errors return structured response
- **Preconditions**: None
- **Test Steps**:
  1. Send PUT /api/user/preferences with invalid payload
  2. Verify response status 400
  3. Verify error format: { error, message, details, timestamp }
  4. Verify details contains field-level errors
  5. Verify error messages are user-friendly
- **Expected Result**: Structured error response
- **Edge Cases**:
  - Multiple validation errors all included
  - Nested field errors formatted correctly

#### Test Case 6.2: Database Errors
- **Priority**: P1
- **Type**: Integration
- **Description**: Database errors handled gracefully
- **Preconditions**: Mock database failure
- **Test Steps**:
  1. Mock Supabase client to return error
  2. Send GET /api/user/preferences
  3. Verify response status 500
  4. Verify error logged server-side
  5. Verify user sees generic error message
  6. Verify technical details not exposed
- **Expected Result**: Database error handled gracefully
- **Edge Cases**:
  - Connection timeout returns 500
  - Query timeout returns 500

#### Test Case 6.3: OpenRouter Errors
- **Priority**: P0
- **Type**: Integration
- **Description**: OpenRouter API errors handled gracefully
- **Preconditions**: Mock OpenRouter failure
- **Test Steps**:
  1. Mock OpenRouter to return 500
  2. Send POST /api/notes/:noteId/itineraries
  3. Verify itinerary status set to "failed"
  4. Verify error message stored
  5. Verify user can retry generation
- **Expected Result**: OpenRouter error handled gracefully
- **Edge Cases**:
  - Network timeout returns 502
  - Rate limit returns 429
  - Invalid API key returns 401

#### Test Case 6.4: Malformed Requests
- **Priority**: P1
- **Type**: Integration
- **Description**: Malformed requests rejected cleanly
- **Preconditions**: None
- **Test Steps**:
  1. Send request with invalid JSON
  2. Verify response status 400
  3. Verify error indicates JSON parse failure
  4. Send request with wrong Content-Type
  5. Verify response status 400
- **Expected Result**: Malformed requests rejected
- **Edge Cases**:
  - Empty body returns 400
  - Extremely large body rejected

---

### 5.7 Business Logic

#### Test Case 7.1: Preference Override Resolution
- **Priority**: P1
- **Type**: Unit
- **Description**: Trip preferences override user defaults correctly
- **Preconditions**: User has default preferences
- **Test Steps**:
  1. Create note with partial trip_prefs override (terrain only)
  2. Resolve preferences for generation
  3. Verify terrain from override
  4. Verify road_type, duration, distance from defaults
  5. Create note with full override
  6. Verify all values from override
- **Expected Result**: Override resolution works correctly
- **Edge Cases**:
  - Empty trip_prefs uses all defaults
  - Null values in trip_prefs use defaults

#### Test Case 7.2: Soft Delete Cascade
- **Priority**: P1
- **Type**: Integration
- **Description**: Deleting note soft-deletes itineraries
- **Preconditions**: Note has 3 itineraries
- **Test Steps**:
  1. Authenticate as user-123
  2. Send DELETE /api/notes/:noteId
  3. Verify note.deleted_at set
  4. Query itineraries for note
  5. Verify all itineraries have deleted_at set
  6. Verify itineraries excluded from list queries
- **Expected Result**: Cascade delete works
- **Edge Cases**:
  - Note with no itineraries deletes cleanly
  - Already-deleted itineraries not affected

---

## 6. Test Data Strategy

### Fixtures

**Location**: `tests/fixtures/`

**Files**:
- `users.ts`: Mock user objects
- `preferences.ts`: Various preference combinations
- `notes.ts`: Note samples with different content
- `itineraries.ts`: Itinerary samples with different statuses
- `gpx.ts`: GPX metadata samples

**Example Fixture**:
```typescript
// tests/fixtures/preferences.ts
export const mockPreferences = {
  default: {
    user_id: 'user-123',
    terrain: 'paved' as const,
    road_type: 'scenic' as const,
    typical_duration_h: 2.5,
    typical_distance_km: 150.0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  gravel: {
    user_id: 'user-456',
    terrain: 'gravel' as const,
    road_type: 'twisty' as const,
    typical_duration_h: 4.0,
    typical_distance_km: 200.0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  mixed: {
    user_id: 'user-789',
    terrain: 'mixed' as const,
    road_type: 'highway' as const,
    typical_duration_h: 6.0,
    typical_distance_km: 400.0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};
```

### Mocks

**Supabase Client Mock**:
```typescript
// tests/utils/mockSupabase.ts
export function createMockSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: null }, 
        error: null 
      })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    }
  } as any;
}
```

**OpenRouter Mock**:
```typescript
// tests/utils/mockOpenRouter.ts
export function createMockOpenRouter() {
  return {
    chat: vi.fn(() => Promise.resolve({
      content: 'Mock itinerary content',
      model: 'gpt-4',
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      finish_reason: 'stop'
    })),
    chatStream: vi.fn(async function* () {
      yield { content: 'Mock ', model: 'gpt-4' };
      yield { content: 'stream', model: 'gpt-4', finish_reason: 'stop' };
    }),
    validateJson: vi.fn((json, schema) => schema.parse(JSON.parse(json)))
  };
}
```

### Database Seeding (Future)

For integration tests that require real database:
- Use Supabase test project or local instance
- Create seed scripts for common scenarios
- Implement cleanup after each test (transaction rollback or explicit delete)
- Use test-specific schema or namespace

### Test Data Cleanup

**Strategy**:
- Unit tests: No cleanup needed (mocked data)
- Integration tests with mocks: Clear mocks in `afterEach`
- Integration tests with real DB: Rollback transactions or delete test data
- Component tests: Unmount components in `afterEach`

**Example**:
```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
```

---

## 7. Test Environment Setup

### Prerequisites

**Software**:
- Node.js 22.14.0 (LTS)
- npm 10.x
- Git
- Supabase CLI (for local database)

**Dependencies**:
```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D happy-dom  # For component tests
```

### Environment Variables

**File**: `.env.test`

```bash
# Supabase (use test project or local instance)
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# OpenRouter (use test key or mock)
OPENROUTER_API_KEY=test-openrouter-key

# Development mode (disables auth for testing)
DEVENV=true

# Logging
LOG_LEVEL=debug
```

### Vitest Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/types.ts',
        'src/env.d.ts',
        'src/**/*.config.ts'
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70
    },
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.astro']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

### Test Setup File

**File**: `tests/setup.ts`

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest matchers with jest-dom
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.DEVENV = 'true';
```

### Setup Steps

1. **Clone repository**:
   ```bash
   git clone https://github.com/your-org/viberide.git
   cd viberide
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create test environment file**:
   ```bash
   cp .env.example .env.test
   # Edit .env.test with test values
   ```

4. **Run tests**:
   ```bash
   npm run test
   ```

5. **Optional: Start local Supabase** (for integration tests with real DB):
   ```bash
   npx supabase start
   ```

---

## 8. Testing Tools and Frameworks

| Test Type | Tool/Framework | Version | Justification |
|-----------|---------------|---------|---------------|
| Test Runner | Vitest | ^2.x | Fast, ESM-native, Vite integration, better DX than Jest |
| Assertions | Vitest expect | Built-in | Comprehensive matcher library, Jest-compatible |
| Mocking | Vitest vi | Built-in | Powerful mocking, spying, stubbing capabilities |
| Component Testing | @testing-library/react | ^16.x | Best practices for testing React components, accessibility-focused |
| User Events | @testing-library/user-event | ^14.x | Realistic user interaction simulation |
| DOM Matchers | @testing-library/jest-dom | ^6.x | Extended matchers for DOM assertions |
| Test Environment | happy-dom | ^15.x | Lightweight DOM implementation, faster than jsdom |
| Coverage | @vitest/coverage-v8 | ^2.x | Fast, accurate coverage reporting with V8 |
| API Testing | Direct imports | N/A | Test Astro endpoints directly (no need for supertest) |
| Database Mocking | Custom factory | N/A | Type-safe Supabase client mock |
| OpenRouter Mocking | Custom factory | N/A | Consistent AI service mocking |

### Tool Selection Rationale

**Vitest over Jest**:
- Native ESM support (no transpilation needed)
- 10-20x faster than Jest for our use case
- Better TypeScript support out of the box
- Vite-native (matches our build tool)
- Compatible with Jest ecosystem (easy migration)

**@testing-library/react over Enzyme**:
- Encourages testing user behavior, not implementation
- Better accessibility testing support
- Active maintenance and community
- Works well with modern React (hooks, concurrent features)

**happy-dom over jsdom**:
- 2-3x faster for most operations
- Sufficient for our component testing needs
- Smaller memory footprint

**Custom mocks over MSW**:
- Simpler for unit tests (no HTTP layer needed)
- Faster test execution
- More control over mock behavior
- MSW can be added later for E2E tests

---

## 9. Mocking and Stubbing Strategy

### What to Mock

**Always Mock**:
- External HTTP APIs (OpenRouter)
- Database clients (Supabase) in unit tests
- File system operations
- Date/time (for deterministic tests)
- Random number generation
- Environment variables (when testing different configs)

**Never Mock**:
- Code under test
- Pure utility functions
- Type definitions
- Simple data transformations

**Conditionally Mock**:
- Database in integration tests (use real DB or mock based on test type)
- Logger (mock in unit tests, use real in integration tests)

### Mocking Patterns

#### Pattern 1: Service Mocking (Unit Tests)

```typescript
// Mock at module level
vi.mock('@/lib/services/openRouterService', () => ({
  OpenRouterService: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    chatStream: vi.fn(),
    validateJson: vi.fn()
  }))
}));

// Use in test
it('should generate itinerary', async () => {
  const mockChat = vi.fn().mockResolvedValue({
    content: '{"title": "Mountain Ride"}',
    finish_reason: 'stop'
  });
  
  const service = new OpenRouterService();
  service.chat = mockChat;
  
  // Test code using service
});
```

#### Pattern 2: Database Mocking (Unit Tests)

```typescript
import { createMockSupabase } from '@/tests/utils/mockSupabase';

it('should fetch user preferences', async () => {
  const mockSupabase = createMockSupabase();
  
  // Configure mock response
  mockSupabase.from().select().eq().single.mockResolvedValue({
    data: mockPreferences.default,
    error: null
  });
  
  const result = await UserPreferencesService.get(mockSupabase, 'user-123');
  
  expect(result).toEqual(mockPreferences.default);
  expect(mockSupabase.from).toHaveBeenCalledWith('viberide.user_preferences');
});
```

#### Pattern 3: Time Mocking

```typescript
import { vi } from 'vitest';

it('should use current timestamp', () => {
  const mockDate = new Date('2024-01-01T00:00:00Z');
  vi.setSystemTime(mockDate);
  
  const result = createNote({ title: 'Test' });
  
  expect(result.created_at).toBe('2024-01-01T00:00:00Z');
  
  vi.useRealTimers();
});
```

#### Pattern 4: Partial Mocking

```typescript
// Mock only specific methods
vi.spyOn(UserPreferencesService, 'get').mockResolvedValue(mockPreferences.default);

// Original implementation still available
await UserPreferencesService.upsert(/* ... */);  // Real implementation
```

### Stubbing External Services

#### OpenRouter Stubbing

```typescript
// tests/utils/mockOpenRouter.ts
export const mockOpenRouterResponses = {
  success: {
    content: JSON.stringify({
      title: 'Mountain Loop',
      days: [/* ... */],
      total_distance_km: 285.5,
      total_duration_h: 5.5
    }),
    model: 'gpt-4',
    finish_reason: 'stop',
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
  },
  rateLimitError: {
    status: 429,
    error: 'Rate limit exceeded'
  },
  serverError: {
    status: 500,
    error: 'Internal server error'
  }
};
```

#### Supabase Stubbing

```typescript
// tests/utils/mockSupabase.ts
export const mockSupabaseResponses = {
  userPreferencesFound: {
    data: mockPreferences.default,
    error: null
  },
  userPreferencesNotFound: {
    data: null,
    error: { code: 'PGRST116', message: 'Not found' }
  },
  databaseError: {
    data: null,
    error: { code: '500', message: 'Database connection failed' }
  }
};
```

### Mock Lifecycle Management

```typescript
describe('UserPreferencesService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  
  beforeEach(() => {
    // Create fresh mocks before each test
    mockSupabase = createMockSupabase();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });
  
  it('test case', () => {
    // Test uses mockSupabase
  });
});
```

---

## 10. Error and Edge Cases

### Error Scenarios

#### Network Errors
- **Scenario**: OpenRouter API unreachable
- **Test**: Mock network timeout, verify graceful degradation
- **Expected**: Itinerary status set to "failed", user can retry

#### Database Errors
- **Scenario**: Supabase connection lost
- **Test**: Mock database error, verify error handling
- **Expected**: 500 response, error logged, generic user message

#### Authentication Errors
- **Scenario**: JWT expired
- **Test**: Send request with expired token
- **Expected**: 401 response, redirect to login

#### Validation Errors
- **Scenario**: Invalid request payload
- **Test**: Send malformed JSON, invalid enum values
- **Expected**: 400 response with field-level errors

#### Business Rule Violations
- **Scenario**: Concurrent generation attempt
- **Test**: Start generation while one is running
- **Expected**: 409 response with active request ID

#### Resource Not Found
- **Scenario**: Access non-existent note
- **Test**: GET /api/notes/invalid-uuid
- **Expected**: 404 response

#### Authorization Errors
- **Scenario**: Access another user's data
- **Test**: User A tries to access User B's note
- **Expected**: 403 response

### Edge Cases

#### Boundary Values
- **Title length**: 0, 1, 119, 120, 121 characters
- **Note text length**: 0, 9, 10, 1499, 1500, 1501 characters
- **Duration**: 0, 0.1, 999.9, 1000.0 hours
- **Distance**: 0, 0.1, 999999.9, 1000000.0 km

#### Special Characters
- **Unicode in titles**: Emoji, non-Latin scripts
- **SQL injection attempts**: `'; DROP TABLE notes; --`
- **XSS attempts**: `<script>alert('xss')</script>`
- **JSON injection**: Malformed JSON in trip_prefs

#### Null and Empty Values
- **Null user_id**: Should never occur (middleware ensures auth)
- **Empty string title**: Should be rejected (min length 1)
- **Null trip_prefs**: Should default to empty object `{}`
- **Empty note list**: Should return `{ data: [], pagination: {...} }`

#### Concurrent Operations
- **Simultaneous note creation**: Both should succeed with unique IDs
- **Simultaneous generation**: Second should be rejected (409)
- **Race condition on version**: Unique constraint prevents duplicates

#### Soft Delete Scenarios
- **Delete already-deleted note**: Should return 404
- **Access deleted note**: Should return 404
- **Reuse deleted note title**: Should succeed (unique constraint excludes deleted)

#### Pagination Edge Cases
- **Page 0**: Should return 400 or default to page 1
- **Page beyond total**: Should return empty array
- **Limit 0**: Should return 400 or default to 20
- **Limit > 100**: Should be capped at 100

#### Archiving Edge Cases
- **Archive archived note**: Should be idempotent (no error)
- **Unarchive active note**: Should be idempotent (no error)
- **List with archived=true**: Should include archived notes

---

## 11. Performance Testing (Future - Post-MVP)

### Load Testing Scenarios

**Scenario 1: Normal Load**
- **Users**: 50 concurrent
- **Duration**: 10 minutes
- **Actions**: Create notes, generate itineraries, download GPX
- **Success Criteria**: p95 response time < 200ms for CRUD, < 20s for generation

**Scenario 2: Peak Load**
- **Users**: 200 concurrent
- **Duration**: 5 minutes
- **Actions**: Same as normal load
- **Success Criteria**: p95 response time < 500ms for CRUD, < 30s for generation

**Scenario 3: Stress Test**
- **Users**: Ramp from 0 to 500 over 10 minutes
- **Duration**: 15 minutes
- **Goal**: Identify breaking point
- **Success Criteria**: System degrades gracefully, no data corruption

### Performance Benchmarks

| Endpoint | Target (p95) | Acceptable (p99) |
|----------|--------------|------------------|
| GET /api/user/preferences | 100ms | 200ms |
| PUT /api/user/preferences | 200ms | 400ms |
| GET /api/notes | 150ms | 300ms |
| POST /api/notes | 200ms | 400ms |
| POST /api/notes/:id/itineraries | 20s | 30s |
| GET /api/itineraries/:id/gpx | 2s | 5s |

### Tools
- **k6**: Scriptable load testing
- **Artillery**: YAML-based load testing
- **Grafana**: Metrics visualization
- **Prometheus**: Metrics collection

---

## 12. Security Testing

### Authentication Tests

**Test 1: JWT Validation**
- Valid JWT: Access granted
- Expired JWT: 401 response, refresh attempted
- Invalid signature: 401 response
- Missing JWT: 401 response

**Test 2: Session Management**
- Session refresh on expiry
- Sign-out clears cookies
- Concurrent sessions allowed (multiple devices)

**Test 3: Cookie Security**
- httpOnly flag set (prevents XSS)
- secure flag set (HTTPS only)
- sameSite=strict (prevents CSRF)

### Authorization Tests

**Test 1: RLS Policy Enforcement**
- User can read own preferences: ✅
- User cannot read other user's preferences: ❌
- Service role can read all preferences: ✅

**Test 2: Endpoint Authorization**
- Unauthenticated access to protected routes: 401
- Authenticated access to own resources: 200
- Authenticated access to other user's resources: 403

### Input Validation Tests

**Test 1: XSS Prevention**
- Input: `<script>alert('xss')</script>` in note title
- Expected: Stored as plain text, rendered safely

**Test 2: SQL Injection Prevention**
- Input: `'; DROP TABLE notes; --` in note title
- Expected: Stored as plain text, no SQL execution

**Test 3: JSON Injection**
- Input: Malformed JSON in trip_prefs
- Expected: 400 response with parse error

**Test 4: Request Size Limits**
- Input: 10MB JSON payload
- Expected: 413 Payload Too Large

### Rate Limiting Tests

**Test 1: Per-User Rate Limit**
- Send 1001 requests in 1 hour
- Expected: Request 1001 returns 429

**Test 2: OpenRouter Spend Limit**
- Exhaust monthly spend cap
- Expected: Generation returns 429 with quota message

**Test 3: Concurrent Generation Limit**
- Start two generations simultaneously
- Expected: Second returns 409

---

## 13. Test Maintenance Strategy

### Avoiding Flakiness

**1. Eliminate Non-Determinism**
- Mock Date.now() and Math.random()
- Use fixed test data (no random generation)
- Avoid timing-dependent assertions
- Use `waitFor` for async operations

**2. Ensure Test Independence**
- Each test creates its own data
- Clear mocks in `beforeEach`/`afterEach`
- No shared mutable state between tests
- Tests can run in any order

**3. Proper Async Handling**
```typescript
// ❌ Bad: Missing await
it('should fetch data', () => {
  const result = fetchData();  // Promise not awaited
  expect(result).toBe('data');  // Will fail
});

// ✅ Good: Proper async handling
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBe('data');
});
```

**4. Avoid Implementation Details**
```typescript
// ❌ Bad: Testing internal state
expect(component.state.isLoading).toBe(false);

// ✅ Good: Testing user-visible behavior
expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
```

### Test Refactoring

**When to Refactor**:
- Test becomes hard to understand
- Test is duplicated across multiple files
- Test takes too long to run
- Test fails intermittently

**How to Refactor**:
1. Extract common setup to `beforeEach`
2. Create helper functions for repeated logic
3. Use fixtures for test data
4. Split large tests into smaller, focused tests

**Example**:
```typescript
// Before: Duplicated setup
it('test 1', () => {
  const mockSupabase = createMockSupabase();
  mockSupabase.from().select().eq().single.mockResolvedValue({
    data: mockPreferences.default,
    error: null
  });
  // Test code
});

it('test 2', () => {
  const mockSupabase = createMockSupabase();
  mockSupabase.from().select().eq().single.mockResolvedValue({
    data: mockPreferences.default,
    error: null
  });
  // Test code
});

// After: Extracted setup
describe('UserPreferencesService', () => {
  let mockSupabase;
  
  beforeEach(() => {
    mockSupabase = createMockSupabase();
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: mockPreferences.default,
      error: null
    });
  });
  
  it('test 1', () => { /* Test code */ });
  it('test 2', () => { /* Test code */ });
});
```

### Test Documentation

**1. Test Names**
- Use descriptive names: `should return 404 when note not found`
- Start with "should" for clarity
- Include context: `when user is authenticated`

**2. Comments**
- Explain WHY, not WHAT
- Document complex setup
- Note known limitations or workarounds

**3. Test Organization**
- Group related tests in `describe` blocks
- Use nested `describe` for sub-features
- Keep test files focused (one component/service per file)

### Test Debt Management

**1. Track Test Debt**
- Use TODO comments for skipped tests
- Create tickets for missing test coverage
- Review test debt in sprint retrospectives

**2. Prioritize Test Debt**
- P0: Critical paths without tests
- P1: High-risk areas with low coverage
- P2: Nice-to-have tests for edge cases

**3. Address Test Debt**
- Allocate 10% of sprint capacity to test debt
- Fix flaky tests immediately
- Update tests when requirements change

---

## 14. CI/CD Integration

### Test Execution in Pipeline

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.14.0'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
      
      - name: Check coverage thresholds
        run: |
          npm run test:coverage -- --reporter=json > coverage.json
          node scripts/check-coverage.js
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Test Reporting

**Coverage Report**:
- HTML report: `coverage/index.html`
- LCOV format: `coverage/lcov.info`
- JSON format: `coverage/coverage-final.json`
- Text summary in CI logs

**Test Results**:
- JUnit XML format for CI integration
- Test summary in PR comments
- Failure details with stack traces

### Failure Handling

**On Test Failure**:
1. CI pipeline fails (blocks merge)
2. GitHub status check marked as failed
3. PR comment added with failure details
4. Slack notification sent to team channel

**Retry Strategy**:
- Flaky tests: Retry up to 3 times
- Network errors: Retry with exponential backoff
- Persistent failures: Require manual investigation

### Coverage Requirements

**Minimum Coverage Gates**:
- Overall: 70%
- Services: 80%
- Validators: 80%
- API endpoints: 60%
- Components: 70%

**Coverage Enforcement**:
```typescript
// vitest.config.ts
coverage: {
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
  thresholds: {
    'src/lib/services/**': {
      lines: 80,
      functions: 80
    },
    'src/lib/validators/**': {
      lines: 80,
      functions: 80
    },
    'src/pages/api/**': {
      lines: 60,
      functions: 60
    }
  }
}
```

### Pre-commit Hooks

**Husky Configuration** (`.husky/pre-commit`):

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linter
npm run lint

# Run type check
npm run type-check

# Run tests (fast unit tests only)
npm run test:unit

# Check for TODO/FIXME in staged files
git diff --cached --name-only | xargs grep -l "TODO\|FIXME" && echo "⚠️  Found TODO/FIXME in staged files" || true
```

**Pre-push Hook** (`.husky/pre-push`):

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run full test suite before push
npm run test

# Verify coverage thresholds
npm run test:coverage
```

---

## 15. Implementation Steps

### Step 1: Setup Testing Infrastructure (Week 1, Days 1-2)

**1.1 Install Testing Dependencies**
```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D happy-dom
```

**1.2 Configure Vitest**
- Create `vitest.config.ts` with coverage thresholds
- Set up test environment (happy-dom)
- Configure path aliases
- Set up test file patterns

**1.3 Create Test Directory Structure**
```bash
mkdir -p tests/{unit,integration,components,fixtures,utils}
mkdir -p tests/unit/{services,validators,lib}
mkdir -p tests/integration/{api,database}
```

**1.4 Create Test Utilities**
- `tests/utils/mockSupabase.ts`: Supabase client mock factory
- `tests/utils/mockOpenRouter.ts`: OpenRouter service mock
- `tests/utils/testHelpers.ts`: Common test helpers
- `tests/setup.ts`: Global test setup

**1.5 Create Fixtures**
- `tests/fixtures/users.ts`
- `tests/fixtures/preferences.ts`
- `tests/fixtures/notes.ts`
- `tests/fixtures/itineraries.ts`

**Deliverables**:
- ✅ Vitest configured and running
- ✅ Test directory structure created
- ✅ Mock factories implemented
- ✅ Fixtures created
- ✅ `npm run test` executes successfully (even with 0 tests)

---

### Step 2: Implement Validator Tests (Week 1, Days 3-4)

**Priority**: High (validators are foundation for all API endpoints)

**2.1 User Preferences Validator** (`tests/unit/validators/userPreferences.test.ts`)

Test cases:
- ✅ Valid preferences accepted
- ✅ Invalid terrain rejected
- ✅ Invalid road_type rejected
- ✅ Negative duration rejected
- ✅ Negative distance rejected
- ✅ Duration > 999.9 rejected
- ✅ Distance > 999999.9 rejected
- ✅ Missing required fields rejected
- ✅ Boundary values (0.1, 999.9) accepted

**2.2 Notes Validator** (Future - when notes endpoints implemented)

**Deliverables**:
- ✅ User preferences validator tests (100% coverage)
- ✅ All edge cases covered
- ✅ Tests passing

---

### Step 3: Implement Service Layer Tests (Week 1-2, Days 5-7)

**Priority**: High (services contain core business logic)

**3.1 UserPreferencesService** (`tests/unit/services/userPreferencesService.test.ts`)

Test cases:
- ✅ `getUserPreferences`: Returns preferences for existing user
- ✅ `getUserPreferences`: Returns null for non-existent user
- ✅ `getUserPreferences`: Throws error on database failure
- ✅ `upsertUserPreferences`: Creates new preferences
- ✅ `upsertUserPreferences`: Updates existing preferences
- ✅ `upsertUserPreferences`: Handles validation errors
- ✅ `upsertUserPreferences`: Throws error on database failure

**3.2 NotesService** (Future)

**3.3 ItinerariesService** (Future)

**Deliverables**:
- ✅ UserPreferencesService tests (≥80% coverage)
- ✅ All error paths tested
- ✅ Supabase client mocking working correctly

---

### Step 4: Implement API Endpoint Tests (Week 2, Days 8-10)

**Priority**: High (API contracts are critical)

**4.1 User Preferences Endpoints** (`tests/integration/api/user/preferences.test.ts`)

Test cases for GET:
- ✅ Returns preferences when authenticated
- ✅ Returns 401 when not authenticated
- ✅ Returns 404 when preferences not found
- ✅ Returns 500 on database error

Test cases for PUT:
- ✅ Creates new preferences (201)
- ✅ Updates existing preferences (200)
- ✅ Returns 400 for invalid payload
- ✅ Returns 400 for missing Content-Type
- ✅ Returns 401 when not authenticated
- ✅ Returns 500 on database error

**4.2 Auth Endpoints** (`tests/integration/api/auth/signout.test.ts`)

Test cases:
- ✅ Signs out successfully
- ✅ Clears session cookie
- ✅ Returns 401 when not authenticated
- ✅ Handles Supabase error gracefully

**4.3 Notes Endpoints** (Future)

**4.4 Itineraries Endpoints** (Future)

**Deliverables**:
- ✅ User preferences endpoint tests (≥60% coverage)
- ✅ Auth endpoint tests (≥60% coverage)
- ✅ All success and error paths tested

---

### Step 5: Implement Utility Tests (Week 2, Days 11-12)

**Priority**: Medium (utilities are simple but important)

**5.1 HTTP Utilities** (`tests/unit/lib/http.test.ts`)

Test cases:
- ✅ `jsonResponse`: Formats JSON response correctly
- ✅ `errorResponse`: Formats error response correctly
- ✅ Status codes set correctly
- ✅ Headers included

**5.2 Logger** (`tests/unit/lib/logger.test.ts`)

Test cases:
- ✅ Different log levels work
- ✅ Structured logging format
- ✅ Context included in logs
- ✅ Error serialization

**5.3 Type Guards** (`tests/unit/types.test.ts`)

Test cases:
- ✅ `isTerrain`: Valid and invalid values
- ✅ `isRoadType`: Valid and invalid values
- ✅ `isItineraryStatus`: Valid and invalid values
- ✅ `isTerminalStatus`: Correct statuses identified
- ✅ `isCancellable`: Correct statuses identified

**Deliverables**:
- ✅ Utility tests (≥80% coverage)
- ✅ All type guards tested

---

### Step 6: Implement Component Tests (Week 3, Days 13-15)

**Priority**: Medium (component tests ensure UI works)

**6.1 SaveButton** (`tests/components/SaveButton.test.tsx`)

Test cases:
- ✅ Renders disabled when pristine
- ✅ Renders enabled when dirty
- ✅ Shows loading state
- ✅ Shows success state
- ✅ Shows error state
- ✅ Calls onClick when clicked

**6.2 PreferencesForm** (`tests/components/PreferencesForm.test.tsx`)

Test cases:
- ✅ Renders with initial values
- ✅ Validates required fields
- ✅ Submits valid data
- ✅ Displays submission errors
- ✅ Disables save button while submitting

**6.3 ProfileScreen** (`tests/components/ProfileScreen.test.tsx`)

Test cases:
- ✅ Renders user preferences
- ✅ Opens settings sheet
- ✅ Opens sign-out dialog
- ✅ Displays offline banner when offline

**Deliverables**:
- ✅ Component tests (≥70% coverage)
- ✅ User interactions tested
- ✅ State management verified

---

### Step 7: Implement Middleware Tests (Week 3, Days 16-17)

**Priority**: Medium (middleware is critical for auth)

**7.1 Authentication Middleware** (`tests/integration/middleware/auth.test.ts`)

Test cases:
- ✅ Extracts user from valid JWT
- ✅ Returns 401 for missing JWT
- ✅ Returns 401 for expired JWT
- ✅ Refreshes session on expiry
- ✅ Attaches Supabase client to locals

**Deliverables**:
- ✅ Middleware tests (≥60% coverage)
- ✅ Auth flow tested end-to-end

---

### Step 8: Integration Testing (Week 3-4, Days 18-20)

**Priority**: High (integration tests catch real-world issues)

**8.1 Database Integration Tests**

Set up:
- Configure test Supabase instance or local Supabase
- Create test database schema
- Implement cleanup between tests

Test cases:
- ✅ RLS policies enforced
- ✅ Unique constraints work
- ✅ Soft delete cascades
- ✅ Indexes improve query performance

**8.2 End-to-End User Flows** (`tests/integration/flows/userPreferences.test.ts`)

Test cases:
- ✅ Complete flow: Sign in → Create preferences → Update preferences
- ✅ Error flow: Invalid data rejected at each step
- ✅ Auth flow: Unauthenticated requests blocked

**Deliverables**:
- ✅ Database integration tests passing
- ✅ User flows tested end-to-end
- ✅ Integration with real Supabase verified

---

### Step 9: CI/CD Integration (Week 4, Days 21-22)

**Priority**: High (CI ensures tests run on every commit)

**9.1 GitHub Actions Setup**

Create `.github/workflows/ci.yml`:
- Run linter
- Run type check
- Run tests with coverage
- Upload coverage to Codecov
- Comment PR with coverage report

**9.2 Pre-commit Hooks**

Create `.husky/pre-commit`:
- Run linter
- Run type check
- Run fast unit tests

Create `.husky/pre-push`:
- Run full test suite
- Verify coverage thresholds

**9.3 Coverage Reporting**

Configure Codecov:
- Set up Codecov account
- Add `codecov.yml` configuration
- Configure coverage badges

**Deliverables**:
- ✅ CI pipeline running on every push
- ✅ Pre-commit hooks preventing bad commits
- ✅ Coverage reports in PRs
- ✅ Coverage badges in README

---

### Step 10: Documentation and Handoff (Week 4, Days 23-24)

**Priority**: Medium (documentation ensures maintainability)

**10.1 Testing Guidelines**

Update `.ai/testing-guidelines.md`:
- How to write tests
- Testing patterns and best practices
- How to run tests
- How to debug failing tests

**10.2 Test README**

Create `tests/README.md`:
- Directory structure explanation
- How to run specific test suites
- How to add new tests
- Fixture usage guide

**10.3 Code Comments**

Add JSDoc comments to:
- Complex test scenarios
- Test utilities and helpers
- Mock factories

**10.4 Team Training**

Conduct training session:
- Overview of testing strategy
- Demo of writing tests
- Q&A session

**Deliverables**:
- ✅ Testing guidelines documented
- ✅ Test README created
- ✅ Team trained on testing approach
- ✅ Testing plan complete

---

## 16. Success Metrics

### Coverage Metrics

**Target Coverage**:
- Overall: ≥70%
- Services: ≥80%
- Validators: ≥80%
- API endpoints: ≥60%
- Components: ≥70%

**Tracking**:
- Coverage reports generated on every CI run
- Coverage trends tracked over time
- Coverage badges in README

### Test Quality Metrics

**Flakiness Rate**:
- Target: <1% of test runs have flaky failures
- Tracking: Monitor CI logs for intermittent failures
- Action: Fix flaky tests within 24 hours

**Test Execution Time**:
- Target: <30 seconds for full suite locally
- Target: <2 minutes for full suite in CI
- Tracking: Vitest reports execution time
- Action: Optimize slow tests

**Test Failure Rate**:
- Target: <1% of commits cause test failures
- Tracking: GitHub Actions success rate
- Action: Address failures within 24 hours

### Business Impact Metrics

**Bug Detection**:
- Track: Number of bugs caught by tests before production
- Target: ≥80% of bugs caught by tests
- Tracking: Tag bugs in issue tracker

**Regression Prevention**:
- Track: Number of regressions prevented by tests
- Target: 0 regressions reach production
- Tracking: Monitor production incidents

**Development Velocity**:
- Track: Time to implement new features
- Target: No slowdown due to testing overhead
- Tracking: Sprint velocity

---

## 17. Risks and Mitigations

### Risk 1: Test Suite Too Slow

**Impact**: Developers skip running tests locally

**Mitigation**:
- Keep unit tests fast (<10s)
- Run only unit tests in pre-commit hook
- Use test sharding in CI
- Optimize slow tests

### Risk 2: Flaky Tests

**Impact**: Loss of confidence in test suite

**Mitigation**:
- Mock non-deterministic behavior (time, random)
- Ensure test independence
- Use `waitFor` for async operations
- Fix flaky tests immediately

### Risk 3: Low Test Coverage

**Impact**: Bugs reach production

**Mitigation**:
- Enforce coverage thresholds in CI
- Review coverage reports in PRs
- Prioritize testing critical paths
- Allocate time for test debt

### Risk 4: Outdated Tests

**Impact**: Tests don't reflect current requirements

**Mitigation**:
- Update tests when requirements change
- Review tests during code review
- Refactor tests alongside production code
- Document test maintenance strategy

### Risk 5: Mocking Complexity

**Impact**: Tests don't catch integration issues

**Mitigation**:
- Balance unit and integration tests
- Use real database for integration tests
- Validate mocks match real behavior
- Periodically test against real services

---

## 18. Appendix

### A. Test File Naming Conventions

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- Component tests: `*.test.tsx`
- E2E tests: `*.e2e.test.ts` (future)

### B. Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── userPreferencesService.test.ts
│   │   └── openRouterService.test.ts
│   ├── validators/
│   │   └── userPreferences.test.ts
│   └── lib/
│       ├── http.test.ts
│       └── logger.test.ts
├── integration/
│   ├── api/
│   │   ├── user/
│   │   │   └── preferences.test.ts
│   │   └── auth/
│   │       └── signout.test.ts
│   ├── database/
│   │   └── rls.test.ts
│   └── flows/
│       └── userPreferences.test.ts
├── components/
│   ├── SaveButton.test.tsx
│   ├── PreferencesForm.test.tsx
│   └── ProfileScreen.test.tsx
├── fixtures/
│   ├── users.ts
│   ├── preferences.ts
│   ├── notes.ts
│   └── itineraries.ts
├── utils/
│   ├── mockSupabase.ts
│   ├── mockOpenRouter.ts
│   └── testHelpers.ts
├── setup.ts
└── README.md
```

### C. Common Vitest Matchers

```typescript
// Equality
expect(value).toBe(expected)           // Strict equality (===)
expect(value).toEqual(expected)        // Deep equality
expect(value).toStrictEqual(expected)  // Strict deep equality

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

// Numbers
expect(number).toBeGreaterThan(3)
expect(number).toBeGreaterThanOrEqual(3)
expect(number).toBeLessThan(5)
expect(number).toBeCloseTo(0.3)  // Floating point

// Strings
expect(string).toMatch(/regex/)
expect(string).toContain('substring')

// Arrays/Objects
expect(array).toContain(item)
expect(array).toHaveLength(3)
expect(object).toHaveProperty('key')

// Exceptions
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('Error message')

// Async
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow()

// Mocks
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenLastCalledWith('arg')
```

### D. Testing Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Effective Testing Strategies](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Test Doubles (Mocks, Stubs, Fakes)](https://martinfowler.com/bliki/TestDouble.html)

### E. Glossary

- **Unit Test**: Tests a single function or class in isolation
- **Integration Test**: Tests interaction between multiple components
- **E2E Test**: Tests complete user journey through the application
- **Mock**: Replaces a dependency with a test double
- **Stub**: Provides canned responses to calls
- **Spy**: Records information about function calls
- **Fixture**: Reusable test data
- **Flaky Test**: Test that sometimes passes and sometimes fails
- **Coverage**: Percentage of code executed by tests
- **TDD**: Test-Driven Development (write tests first)
- **BDD**: Behavior-Driven Development (tests describe behavior)

---

**End of Testing Plan**

