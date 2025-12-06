# Implementation Plan: Comprehensive Testing Strategy

## 1. Overview

### Brief Description
Implementation of a comprehensive testing strategy for VibeRide, covering unit, integration, and end-to-end testing across the full application stack including authentication, user preferences, notes management, AI itinerary generation, and GPX export functionality.

### Purpose and Business Value
- Ensure reliability and correctness of core user workflows
- Reduce production bugs and improve user experience
- Enable confident refactoring and feature additions
- Establish quality gates for CI/CD pipeline
- Document expected behavior through tests

### Scope and Boundaries

**In Scope:**
- Unit tests for services, validators, and utilities
- Integration tests for API endpoints
- Component tests for React UI components
- Database integration tests
- OpenRouter AI service tests
- Authentication flow tests
- GPX generation tests
- Error handling and edge cases

**Out of Scope:**
- Browser-based E2E tests (deferred to post-MVP)
- Performance/load testing
- Security penetration testing
- Accessibility automated testing
- Visual regression testing
- Mobile device testing

### Success Criteria
- ≥80% code coverage for business logic (services, validators)
- ≥60% code coverage for API endpoints
- ≥70% code coverage for React components
- All critical user flows covered by integration tests
- Zero failing tests in main branch
- All tests run in <30 seconds locally
- Tests integrated into CI pipeline

## 2. Technical Approach

### High-Level Architecture
The testing strategy follows a pyramid approach:
- **Base Layer (Unit Tests)**: Services, validators, utilities, pure functions
- **Middle Layer (Integration Tests)**: API endpoints, database operations, external services
- **Top Layer (Component Tests)**: React components with user interactions

### Key Technologies and Tools
- **Test Runner**: Vitest (already configured)
- **Mocking**: Vitest mocking capabilities + vi.mock
- **Assertions**: Expect API (Vitest)
- **React Testing**: @testing-library/react
- **API Testing**: Supertest or direct Astro endpoint testing
- **Database Testing**: Supabase test instance or mocked client
- **Coverage**: Vitest coverage (c8/istanbul)

### Integration Points with Existing Systems
- Vitest configuration in `package.json`
- ESLint integration for test files
- GitHub Actions for CI test execution
- Supabase test database instance
- OpenRouter mock/sandbox for AI testing

### Design Decisions and Rationale

**Decision 1: Use Vitest over Jest**
- *Rationale*: Already configured, better ESM support, faster, Vite-native

**Decision 2: Mock external services (OpenRouter, Supabase) for unit tests**
- *Rationale*: Faster tests, no API costs, deterministic behavior

**Decision 3: Use real database for integration tests**
- *Rationale*: Catch schema/query issues, validate RLS policies

**Decision 4: Component tests without full E2E browser**
- *Rationale*: Faster feedback, sufficient for MVP, E2E deferred post-MVP

## 3. Component Breakdown

### 3.1. Service Layer Tests

#### OpenRouterService (Already Implemented)
- **Purpose**: Test AI chat completion and streaming
- **Key Interfaces**: `chat()`, `chatStream()`, `validateJson()`
- **Dependencies**: HttpClient, Logger
- **Status**: ✅ Comprehensive tests exist

#### UserPreferencesService
- **Purpose**: Test CRUD operations for user preferences
- **Key Interfaces**: `getUserPreferences()`, `upsertUserPreferences()`
- **Dependencies**: Supabase client
- **Test Coverage Needed**:
  - Get preferences for existing user
  - Get preferences for non-existent user
  - Create new preferences (insert)
  - Update existing preferences (update)
  - Validation error handling
  - Database error handling

### 3.2. Validator Tests

#### UserPreferences Validator
- **Purpose**: Validate Zod schema for user preferences
- **Key Validations**:
  - Terrain enum validation
  - Road type enum validation
  - Duration range (positive numbers)
  - Distance range (positive numbers)
  - Required field enforcement

#### Notes Validators (Future)
- **Purpose**: Validate note creation/update requests
- **Key Validations**:
  - Title length (max 120 chars)
  - Note text length (10-1500 chars)
  - Trip preferences structure
  - Optional field handling

### 3.3. API Endpoint Tests

#### Auth Endpoints
- **File**: `src/pages/api/auth/signout.ts`
- **Tests Needed**:
  - Successful sign out with valid session
  - Sign out without session (401)
  - Cookie clearing verification
  - Supabase error handling

#### User Preferences Endpoints
- **File**: `src/pages/api/user/preferences.ts`
- **Tests for GET**:
  - Get preferences with authentication
  - Get preferences without authentication (401)
  - Preferences not found (404)
  - Database error (500)
- **Tests for PUT**:
  - Create new preferences (201)
  - Update existing preferences (200)
  - Invalid payload (400)
  - Unauthenticated (401)
  - Database error (500)

#### Notes Endpoints (Future)
- **CRUD operations**: Create, Read, Update, Delete
- **Additional operations**: Archive, Unarchive, List with pagination

#### Itineraries Endpoints (Future)
- **Generation**: Initiate, Poll status, Cancel
- **CRUD**: Read, Delete
- **GPX Export**: Download GPX file

### 3.4. React Component Tests

#### ProfileScreen Component
- **Purpose**: Test user profile display and interactions
- **Test Scenarios**:
  - Renders user preferences correctly
  - Opens settings sheet on button click
  - Opens sign-out dialog
  - Displays offline banner when offline

#### PreferencesForm Component
- **Purpose**: Test user preferences form
- **Test Scenarios**:
  - Renders form with initial values
  - Validates form inputs
  - Submits valid data
  - Shows validation errors
  - Handles submission errors

#### SaveButton Component
- **Purpose**: Test save button states
- **Test Scenarios**:
  - Pristine state (disabled)
  - Dirty state (enabled)
  - Loading state (disabled with spinner)
  - Success state (checkmark)
  - Error state (error icon)

### 3.5. Middleware Tests

#### Authentication Middleware
- **File**: `src/middleware/index.ts`
- **Test Scenarios**:
  - Valid JWT token flow
  - Missing token (unauthenticated)
  - Expired token handling
  - Supabase session refresh
  - Cookie management

### 3.6. Utility and Helper Tests

#### HTTP Utilities
- **File**: `src/lib/http.ts`
- **Test Coverage**:
  - `jsonResponse()` formatting
  - `errorResponse()` formatting
  - Status code handling
  - Header management

#### Logger Tests
- **File**: `src/lib/logger.ts`
- **Test Coverage**:
  - Different log levels
  - Structured logging format
  - Context inclusion
  - Error serialization

## 4. Data Model and Types

### Type Validation Tests
- Test all type guards in `src/types.ts`:
  - `isTerrain()`
  - `isRoadType()`
  - `isItineraryStatus()`
  - `isTerminalStatus()`
  - `isCancellable()`

### DTO Transformation Tests
- Validate DTOs match database entities
- Test request/response transformations
- Verify optional field handling
- Test computed field generation

## 5. API Design

### Test Data Fixtures
Create reusable test fixtures for:
- **Users**: Mock user objects with different states
- **Preferences**: Valid/invalid preference combinations
- **Notes**: Various note lengths and content types
- **Itineraries**: Different statuses and versions
- **GPX Data**: Sample GPX metadata structures

### Request/Response Testing
- Validate all request DTOs against schemas
- Verify response structure matches types
- Test error response format consistency
- Validate HTTP status codes

## 6. Business Logic

### Preference Resolution Logic
- Test trip preference override logic
- Validate default fallback behavior
- Test terrain/road type resolution

### Itinerary Version Management
- Test version incrementing
- Validate unique version constraint
- Test concurrent generation prevention

### Soft Delete Logic
- Test deletion timestamp setting
- Verify filtered queries exclude deleted
- Test cascade delete behavior

### AI Summary Generation (Future)
- Test structured summary parsing
- Validate distance/duration extraction
- Test error handling for malformed responses

## 7. User Interface

### Form Validation Testing
- Required field enforcement
- Min/max length validation
- Number range validation
- Enum selection validation
- Real-time validation feedback

### User Interaction Testing
- Button click handlers
- Form submission flows
- Dialog open/close
- Sheet open/close
- Tab navigation
- Offline state detection

### State Management Testing
- Test `useProfileState` hook
- Test `useUserPreferences` hook
- Verify state synchronization
- Test optimistic updates
- Test error state handling

## 8. Security Considerations

### Authentication Testing
- Test unauthorized access blocking
- Verify JWT validation
- Test session expiration handling
- Validate cookie security flags

### Authorization Testing
- Test RLS policy enforcement (where applicable)
- Verify user can only access own data
- Test admin/service role access (if applicable)

### Input Sanitization Testing
- Test XSS prevention in text inputs
- Validate SQL injection prevention
- Test malformed JSON handling
- Verify file upload restrictions (GPX)

## 9. Error Handling

### Error Scenario Coverage
- Network failures
- Database connection errors
- API rate limiting
- Invalid authentication
- Malformed requests
- External service failures (OpenRouter)
- Concurrent operation conflicts

### Error Response Testing
- Consistent error format
- Appropriate status codes
- User-friendly messages
- Technical details in logs only
- Retry-after headers

### Logging Verification
- Errors logged with context
- PII excluded from logs
- Structured log format
- Log levels appropriate
- Stack traces captured

## 10. Performance Optimization

### Performance Testing Scope
- Measure test execution time
- Identify slow tests
- Optimize database queries in tests
- Use mocks to speed up unit tests
- Parallel test execution where possible

### Test Data Management
- Minimal data creation
- Cleanup after tests
- Reuse fixtures where appropriate
- Avoid unnecessary database operations

## 11. Testing Strategy

### Unit Testing Approach
- **Framework**: Vitest
- **Coverage Target**: ≥80% for services and validators
- **Mocking Strategy**: Mock external dependencies (Supabase, OpenRouter)
- **Isolation**: Each test independent, no shared state
- **Speed**: <10 seconds for full unit test suite

### Integration Testing Requirements
- **Framework**: Vitest + Supabase test client
- **Coverage Target**: ≥60% for API endpoints
- **Database**: Use test Supabase project or local instance
- **Cleanup**: Transaction rollback or explicit cleanup
- **Fixtures**: Shared test data generators
- **Speed**: <20 seconds for integration suite

### Component Testing Plan
- **Framework**: Vitest + @testing-library/react
- **Coverage Target**: ≥70% for components
- **Rendering**: Use `render()` from testing-library
- **User Events**: Simulate clicks, inputs, form submissions
- **Assertions**: Verify DOM state, accessibility
- **Speed**: <15 seconds for component suite

### Test Data and Fixtures
Create fixture files:
- `tests/fixtures/users.ts`: Mock user data
- `tests/fixtures/preferences.ts`: Various preference combinations
- `tests/fixtures/notes.ts`: Note samples
- `tests/fixtures/itineraries.ts`: Itinerary samples

### Testing Tools and Frameworks
- **Vitest**: Test runner and assertions
- **@testing-library/react**: Component testing
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Additional matchers
- **msw** (optional): Mock Service Worker for HTTP mocking
- **@vitest/coverage-c8**: Coverage reporting

## 12. Implementation Steps

### 1. Setup and Preparation

#### 1.1. Install Testing Dependencies
```bash
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitest/ui @vitest/coverage-c8
```

#### 1.2. Configure Vitest
Update `vite.config.ts` or create `vitest.config.ts`:
- Set up test environment (jsdom for React components)
- Configure coverage thresholds
- Set up path aliases
- Configure test file patterns

#### 1.3. Create Test Directory Structure
```
tests/
├── unit/
│   ├── services/
│   ├── validators/
│   └── lib/
├── integration/
│   ├── api/
│   └── database/
├── components/
├── fixtures/
│   ├── users.ts
│   ├── preferences.ts
│   ├── notes.ts
│   └── itineraries.ts
└── utils/
    ├── testHelpers.ts
    └── mockSupabase.ts
```

#### 1.4. Create Test Utilities
- Supabase client mock factory
- API request helper
- Component render wrapper with providers
- Fixture data generators

### 2. Core Implementation

#### 2.1. Service Layer Tests (Priority: High)
**Order**: UserPreferencesService → (Future: NotesService, ItinerariesService)

**UserPreferencesService Tests** (`tests/unit/services/userPreferencesService.test.ts`):
```typescript
describe('UserPreferencesService', () => {
  describe('getUserPreferences', () => {
    it('should return preferences for existing user')
    it('should return null for non-existent user')
    it('should throw error on database failure')
  })
  
  describe('upsertUserPreferences', () => {
    it('should create new preferences')
    it('should update existing preferences')
    it('should handle validation errors')
    it('should throw error on database failure')
  })
})
```

#### 2.2. Validator Tests (Priority: High)
**File**: `tests/unit/validators/userPreferences.test.ts`

Test all validation rules:
- Valid data passes
- Invalid terrain rejected
- Invalid road type rejected
- Negative duration rejected
- Negative distance rejected
- Missing required fields rejected

#### 2.3. API Endpoint Tests (Priority: High)
**File**: `tests/integration/api/user/preferences.test.ts`

Test both GET and PUT endpoints with all scenarios listed in §3.3.

**File**: `tests/integration/api/auth/signout.test.ts`

Test sign-out flow and error cases.

#### 2.4. Component Tests (Priority: Medium)
**Order**: SaveButton → PreferencesForm → ProfileScreen → Other components

**SaveButton** (`tests/components/SaveButton.test.tsx`):
```typescript
describe('SaveButton', () => {
  it('should render disabled when pristine')
  it('should render enabled when dirty')
  it('should show loading state')
  it('should show success state')
  it('should show error state')
  it('should call onClick when enabled and clicked')
})
```

#### 2.5. Utility Tests (Priority: Medium)
**Files**:
- `tests/unit/lib/http.test.ts`
- `tests/unit/lib/logger.test.ts`
- `tests/unit/lib/utils.test.ts`

#### 2.6. Type Guard Tests (Priority: Low)
**File**: `tests/unit/types.test.ts`

Test all type guards and helper functions.

#### 2.7. Middleware Tests (Priority: Medium)
**File**: `tests/integration/middleware/auth.test.ts`

Test authentication middleware with various token states.

### 3. Integration

#### 3.1. Database Integration Tests
Set up test Supabase instance or use local Supabase:
- Configure test database connection
- Create migration script for test schema
- Implement cleanup between tests

#### 3.2. External Service Mocks
- Create comprehensive OpenRouter mock
- Mock Supabase Auth responses
- Create test fixtures for API responses

#### 3.3. End-to-End User Flows (Simplified)
**File**: `tests/integration/flows/userPreferences.test.ts`

Test complete flows:
1. Sign in → Create preferences → Update preferences
2. Sign in → Fetch preferences → Display in UI
3. Error handling throughout flow

### 4. Testing

#### 4.1. Run Test Suite
```bash
npm run test              # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
npm run test:ui           # Open Vitest UI
```

#### 4.2. Verify Coverage Thresholds
Configure in `vitest.config.ts`:
```typescript
coverage: {
  provider: 'c8',
  reporter: ['text', 'json', 'html'],
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.d.ts',
    'src/**/*.test.{ts,tsx}',
    'src/types.ts',
    'src/env.d.ts'
  ]
}
```

#### 4.3. Fix Failing Tests
- Review and address all test failures
- Update tests if requirements changed
- Refactor code if tests reveal issues

### 5. Documentation

#### 5.1. Testing Guidelines Document
Create `.ai/testing-guidelines.md`:
- How to write tests
- Testing patterns and best practices
- How to run tests
- How to debug failing tests
- Coverage requirements

#### 5.2. Test README
Create `tests/README.md`:
- Directory structure explanation
- How to run specific test suites
- How to add new tests
- Common testing patterns
- Fixture usage guide

#### 5.3. Code Comments
Add JSDoc comments to:
- Complex test scenarios
- Test utilities and helpers
- Mock factories
- Fixture generators

### 6. Deployment

#### 6.1. CI Integration
Update `.github/workflows/ci.yml`:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.14.0'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

#### 6.2. Pre-commit Hooks
Update `.husky/pre-commit`:
```bash
#!/bin/sh
npm run lint
npm run test
```

#### 6.3. Test Environment Setup
Document environment variables needed for tests:
```bash
# .env.test
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-key
OPENROUTER_API_KEY=test-key
```

## 13. Rollout Plan

### Phase 1: Foundation (Week 1)
- ✅ OpenRouterService tests (already complete)
- Install testing dependencies
- Configure Vitest
- Create test directory structure
- Create test utilities and helpers

### Phase 2: Core Services (Week 1-2)
- UserPreferencesService tests
- Validator tests
- Type guard tests
- Utility function tests

### Phase 3: API Layer (Week 2-3)
- Auth endpoint tests
- User preferences endpoint tests
- Middleware tests
- Error handling tests

### Phase 4: Component Layer (Week 3-4)
- SaveButton tests
- PreferencesForm tests
- ProfileScreen tests
- Other component tests

### Phase 5: Integration (Week 4)
- Database integration tests
- Complete user flow tests
- Performance optimization
- Coverage verification

### Phase 6: CI/CD (Week 4)
- GitHub Actions setup
- Pre-commit hooks
- Coverage reporting
- Documentation finalization

### Deployment Strategy
- Merge tests incrementally as they're completed
- Maintain passing test suite on main branch
- Use feature flags for experimental test features
- Monitor test execution time in CI

### Rollback Procedures
- If tests cause CI to fail consistently: disable specific test suites temporarily
- If test infrastructure breaks: revert to previous working configuration
- If coverage drops: investigate and fix before merging new changes

### Monitoring Plan Post-Deployment
- Track test execution time trends
- Monitor flaky test occurrences
- Review coverage reports weekly
- Address test failures within 24 hours

### Success Metrics to Track
- Test coverage percentage (target: 70%+)
- Test suite execution time (target: <30s)
- Test failure rate (target: <1%)
- Mean time to fix failing tests (target: <24h)
- Number of production bugs caught by tests

## 14. Future Considerations

### Potential Enhancements
1. **E2E Testing with Playwright**
   - Browser-based testing post-MVP
   - Critical user journey automation
   - Cross-browser compatibility testing

2. **Visual Regression Testing**
   - Snapshot testing for UI components
   - Automated visual diff detection
   - Integration with CI pipeline

3. **Performance Testing**
   - Load testing with k6 or Artillery
   - Database query performance benchmarks
   - API endpoint response time monitoring

4. **Mutation Testing**
   - Use Stryker to validate test quality
   - Identify weak test coverage
   - Improve assertion effectiveness

5. **Contract Testing**
   - Pact for API contract validation
   - Consumer-driven contract tests
   - Better integration confidence

### Technical Debt to Address Later
- Implement test database seeding scripts
- Create automated test data generation
- Set up test environment isolation
- Implement parallel test execution optimization

### Scalability Considerations
- Test suite should remain under 2 minutes as codebase grows
- Consider test sharding for large test suites
- Implement test categorization (smoke, regression, full)
- Use test result caching to speed up CI

### Maintenance Requirements
- Review and update tests when requirements change
- Refactor tests alongside production code
- Remove obsolete tests promptly
- Keep test dependencies up to date
- Regular review of flaky tests

