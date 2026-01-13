# VibeRide Unit Tests

This directory contains unit tests for the VibeRide application using Vitest and React Testing Library.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI mode for visual debugging
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Current Test Coverage

- **`useProfileState.test.ts`** - Comprehensive tests for the profile state management hook
  - Initialization and data loading
  - Form field updates
  - Validation logic (required fields, numeric bounds, enum values)
  - Dirty state detection
  - Save operations and error handling
  - Reset functionality
  - Edge cases and boundary values

## Testing Guidelines

### Vitest Best Practices

1. **Use `vi` object for mocks** - Leverage `vi.fn()`, `vi.spyOn()`, and `vi.mock()` for test doubles
2. **Follow AAA pattern** - Arrange, Act, Assert for clear test structure
3. **Mock external dependencies** - Mock API calls, hooks, and external services
4. **Use descriptive test names** - Tests should read like specifications
5. **Test behavior, not implementation** - Focus on what the code does, not how it does it

### React Testing Library Principles

1. **Query by accessibility** - Use `getByRole`, `getByLabelText` over `getByTestId`
2. **User-centric tests** - Test how users interact with components
3. **Avoid implementation details** - Don't test internal state directly
4. **Wait for async updates** - Use `waitFor` for async state changes

## Test Setup

### Configuration Files

- **`vitest.config.ts`** - Vitest configuration with jsdom environment
- **`tests/setup.ts`** - Global test setup (matchers, cleanup, mocks)

### Global Mocks

The following are mocked globally in `tests/setup.ts`:

- `window.fetch` - Mocked for API calls
- `navigator.onLine` - Mocked for offline detection

## Writing New Tests

### Hook Testing Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useYourHook } from "./useYourHook";

vi.mock("./dependencies");

describe("useYourHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something", () => {
    const { result } = renderHook(() => useYourHook());
    
    act(() => {
      // Trigger state changes
    });
    
    expect(result.current.value).toBe(expected);
  });
});
```

### Component Testing Template

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YourComponent } from "./YourComponent";

describe("YourComponent", () => {
  it("should render correctly", () => {
    render(<YourComponent />);
    
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should handle user interaction", async () => {
    const onClickMock = vi.fn();
    render(<YourComponent onClick={onClickMock} />);
    
    fireEvent.click(screen.getByRole("button"));
    
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
```

## Coverage Goals

Target coverage thresholds:

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

Focus on testing:
1. Business logic (hooks, services, utilities)
2. Complex components with state management
3. Validation and error handling
4. Edge cases and boundary conditions

Skip testing:
- Pure presentational components
- Third-party library wrappers
- Type definitions
- Configuration files

## Debugging Tests

### Common Issues

1. **Async state updates not reflected**
   - Solution: Use `waitFor` or `act` to wrap async operations

2. **Mock not working**
   - Solution: Ensure `vi.mock()` is at the top level, before imports

3. **Test isolation issues**
   - Solution: Use `beforeEach` with `vi.clearAllMocks()` and cleanup

### Debug Tips

```typescript
// Log current state during test
console.log(result.current);

// Use screen.debug() to see rendered output
screen.debug();

// Run single test file
npm test -- useProfileState.test.ts

// Run single test by name
npm test -- -t "should validate terrain enum values"
```

## CI/CD Integration

Tests run automatically in CI/CD pipeline:

```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
