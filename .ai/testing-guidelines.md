# VibeRide Testing Guidelines

## Table of Contents
1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Testing Patterns](#testing-patterns)
5. [Best Practices](#best-practices)
6. [Common Issues](#common-issues)

## Overview

VibeRide uses Vitest as the primary testing framework. Our testing strategy follows a pyramid approach prioritizing unit tests, with integration tests for critical paths, and component tests for user interactions.

### Coverage Targets
- **Services/Validators**: ≥80%
- **API Endpoints**: ≥60%
- **React Components**: ≥70%
- **Overall**: ≥70%

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm run test

# Watch mode (recommended during development)
npm run test:watch

# Run specific test file
npm run test src/lib/services/userPreferencesService.test.ts

# Run tests matching pattern
npm run test preferences

# Generate coverage report
npm run test:coverage

# Open Vitest UI (interactive)
npm run test:ui
```

### CI Commands

```bash
# Run with coverage (used in CI)
npm run test:coverage

# Run in CI mode (no watch, fail on error)
npm run test:ci
```

## Writing Tests

### Test File Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ComponentName or ServiceName', () => {
  // Setup
  beforeEach(() => {
    // Runs before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Runs after each test
    vi.restoreAllMocks();
  });

  describe('methodName or feature', () => {
    it('should do something specific', () => {
      // Arrange: Set up test data
      const input = 'test';
      
      // Act: Execute the code under test
      const result = someFunction(input);
      
      // Assert: Verify the result
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      expect(() => someFunction(null)).toThrow('Error message');
    });
  });
});
```

### Naming Conventions

**Test Files**: `*.test.ts` or `*.test.tsx`
- Place next to source file: `userService.ts` → `userService.test.ts`
- Or in `tests/` directory mirroring src structure

**Test Descriptions**:
- `describe()`: Component/service/function name
- `it()`: Start with "should" + specific behavior
- Be descriptive but concise

✅ Good:
```typescript
describe('UserPreferencesService', () => {
  describe('getUserPreferences', () => {
    it('should return preferences for existing user')
    it('should return null when user not found')
    it('should throw error on database failure')
  })
})
```

❌ Bad:
```typescript
describe('Service', () => {
  it('works')
  it('test 2')
})
```

## Testing Patterns

### Unit Testing Services

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyService } from './myService';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('MyService', () => {
  let mockSupabase: Partial<SupabaseClient>;
  
  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    };
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: '1', name: 'Test' };
    
    // Mock the chain
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      })
    });

    const result = await MyService.getData(mockSupabase, '1');
    
    expect(result).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith('table_name');
  });
});
```

### Testing API Endpoints

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GET } from './endpoint';

describe('GET /api/user/preferences', () => {
  it('should return preferences when authenticated', async () => {
    const mockLocals = {
      user: { id: 'user-123' },
      supabase: mockSupabaseClient
    };

    const response = await GET({ locals: mockLocals });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('terrain');
  });

  it('should return 401 when not authenticated', async () => {
    const mockLocals = {
      user: null,
      supabase: mockSupabaseClient
    };

    const response = await GET({ locals: mockLocals });

    expect(response.status).toBe(401);
  });
});
```

### Testing React Components

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveButton } from './SaveButton';

describe('SaveButton', () => {
  it('should render disabled when pristine', () => {
    render(<SaveButton isPristine={true} />);
    
    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeDisabled();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<SaveButton isPristine={false} onClick={handleClick} />);
    
    const button = screen.getByRole('button', { name: /save/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Validators (Zod Schemas)

```typescript
import { describe, it, expect } from 'vitest';
import { updateUserPreferencesSchema } from './userPreferences';

describe('updateUserPreferencesSchema', () => {
  it('should accept valid preferences', () => {
    const valid = {
      terrain: 'paved',
      road_type: 'scenic',
      typical_duration_h: 2.5,
      typical_distance_km: 150.0
    };

    const result = updateUserPreferencesSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid terrain', () => {
    const invalid = {
      terrain: 'invalid',
      road_type: 'scenic',
      typical_duration_h: 2.5,
      typical_distance_km: 150.0
    };

    const result = updateUserPreferencesSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('terrain');
    }
  });
});
```

### Testing with Fixtures

Create reusable test data:

```typescript
// tests/fixtures/users.ts
export const mockUsers = {
  validUser: {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z'
  },
  userWithPreferences: {
    id: 'user-456',
    email: 'rider@example.com',
    created_at: '2024-01-01T00:00:00Z'
  }
};

// tests/fixtures/preferences.ts
export const mockPreferences = {
  default: {
    user_id: 'user-123',
    terrain: 'paved',
    road_type: 'scenic',
    typical_duration_h: 2.5,
    typical_distance_km: 150.0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

// Usage in tests
import { mockUsers, mockPreferences } from '../fixtures';

it('should work with fixtures', () => {
  const user = mockUsers.validUser;
  const prefs = mockPreferences.default;
  // ... test code
});
```

## Best Practices

### 1. Test Behavior, Not Implementation

✅ Good:
```typescript
it('should display error message when submission fails', async () => {
  render(<PreferencesForm />);
  
  // Mock API to fail
  mockApi.updatePreferences.mockRejectedValue(new Error('Failed'));
  
  // Submit form
  fireEvent.click(screen.getByRole('button', { name: /save/i }));
  
  // Verify error shown to user
  expect(await screen.findByText(/failed to save/i)).toBeInTheDocument();
});
```

❌ Bad:
```typescript
it('should set error state to true', () => {
  const component = new PreferencesForm();
  component.handleError();
  expect(component.state.hasError).toBe(true); // Testing internal state
});
```

### 2. Keep Tests Independent

Each test should:
- Set up its own data
- Not depend on other tests
- Clean up after itself

✅ Good:
```typescript
describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test 1', () => {
    const mockData = { /* fresh data */ };
    // ... test
  });

  it('test 2', () => {
    const mockData = { /* fresh data */ };
    // ... test
  });
});
```

### 3. Use Descriptive Assertions

✅ Good:
```typescript
expect(response.status).toBe(400);
expect(error.message).toContain('Invalid terrain');
```

❌ Bad:
```typescript
expect(result).toBeTruthy();
expect(data).not.toBeFalsy();
```

### 4. Test Edge Cases

Always test:
- ✅ Happy path (valid input)
- ✅ Invalid input
- ✅ Null/undefined input
- ✅ Empty strings/arrays
- ✅ Boundary values (min, max)
- ✅ Error conditions

### 5. Mock External Dependencies

Mock:
- ✅ API calls
- ✅ Database operations
- ✅ Third-party services
- ✅ Date/time (for consistency)
- ✅ Random values

Don't mock:
- ❌ Code under test
- ❌ Pure utility functions
- ❌ Simple type transformations

### 6. Use Appropriate Matchers

Vitest provides specific matchers:

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
expect(number).toBeCloseTo(0.3) // Floating point

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
expect(() => fn()).toThrow(ErrorClass)

// Async
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow()
```

## Common Issues

### Issue: Tests Pass Locally but Fail in CI

**Causes**:
- Time zone differences
- Race conditions
- Shared state between tests

**Solutions**:
```typescript
// Use fake timers
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-01'));

// Clean up properly
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### Issue: Slow Tests

**Solutions**:
- Mock heavy operations
- Use fixtures instead of generating data
- Run tests in parallel
- Avoid unnecessary `async/await`

```typescript
// Bad: Creates data for each test
beforeEach(async () => {
  await createTestDatabase();
});

// Good: Use mocked data
beforeEach(() => {
  mockDb.data = { ...fixtures.defaultData };
});
```

### Issue: Flaky Tests

**Causes**:
- Async timing issues
- Shared mutable state
- Non-deterministic code (random, dates)

**Solutions**:
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 3000 });

// Mock Date
vi.setSystemTime(new Date('2024-01-01'));

// Mock Math.random
vi.spyOn(Math, 'random').mockReturnValue(0.5);
```

### Issue: Hard to Mock Supabase

**Solution**: Create a mock factory

```typescript
// tests/utils/mockSupabase.ts
export function createMockSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    }
  } as any;
}

// Usage
const mockSupabase = createMockSupabase();
```

## Quick Reference

### Arrange-Act-Assert Pattern

```typescript
it('should do something', () => {
  // Arrange: Set up test data and mocks
  const input = 'test';
  const mockFn = vi.fn();
  
  // Act: Execute the code under test
  const result = functionUnderTest(input, mockFn);
  
  // Assert: Verify the results
  expect(result).toBe('expected');
  expect(mockFn).toHaveBeenCalledWith('test');
});
```

### Test-Driven Development (TDD)

1. **Red**: Write a failing test
2. **Green**: Write minimum code to pass
3. **Refactor**: Clean up code while keeping tests passing

### Coverage Tips

View detailed coverage:
```bash
npm run test:coverage
open coverage/index.html
```

Ignore non-critical files from coverage:
```typescript
// vitest.config.ts
coverage: {
  exclude: [
    'src/**/*.d.ts',
    'src/types.ts',
    'src/**/*.test.{ts,tsx}'
  ]
}
```

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

