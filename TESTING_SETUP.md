# Testing Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required testing dependencies:
- `vitest` - Fast unit test framework
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom matchers for DOM assertions
- `@vitejs/plugin-react` - React support for Vitest
- `jsdom` - DOM implementation for Node.js
- `@vitest/coverage-v8` - Coverage reporting

### 2. Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### 3. Verify Setup

Run the existing test suite:

```bash
npm test
```

You should see output like:

```
✓ src/lib/hooks/useProfileState.test.ts (47 tests)
  ✓ Initialization (3)
  ✓ Data Loading (3)
  ✓ Form Field Updates (3)
  ✓ Validation (9)
  ✓ Dirty State Detection (4)
  ✓ Save Operation (6)
  ✓ Reset Operation (4)
  ✓ Edge Cases (8)

Test Files  1 passed (1)
     Tests  47 passed (47)
```

## Project Structure

```
10x-VibeRide/
├── src/
│   └── lib/
│       └── hooks/
│           ├── useProfileState.ts
│           └── useProfileState.test.ts    ← Unit tests
├── tests/
│   ├── setup.ts                           ← Global test setup
│   ├── README.md                          ← Testing documentation
│   └── useProfileState.test.md           ← Test documentation
├── vitest.config.ts                       ← Vitest configuration
└── package.json                           ← Test scripts
```

## Configuration Files

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

**Key Settings**:
- `globals: true` - No need to import `describe`, `it`, `expect`
- `environment: "jsdom"` - DOM environment for React components
- `setupFiles` - Global test setup and mocks
- Path alias `@` - Matches project's TypeScript paths

### tests/setup.ts

```typescript
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.fetch globally
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});
```

**What It Does**:
- Adds jest-dom matchers (`.toBeInTheDocument()`, etc.)
- Cleans up React components after each test
- Mocks global browser APIs

## Test Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm test` | `vitest run` | Run all tests once (CI mode) |
| `npm run test:watch` | `vitest --watch` | Run tests in watch mode |
| `npm run test:ui` | `vitest --ui` | Open visual test UI |
| `npm run test:coverage` | `vitest run --coverage` | Generate coverage report |

## Writing Your First Test

### 1. Create Test File

Create a file next to your source file with `.test.ts` or `.test.tsx` extension:

```
src/lib/utils.ts
src/lib/utils.test.ts  ← Test file
```

### 2. Write Test

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./utils";

describe("myFunction", () => {
  it("should do something", () => {
    // Arrange
    const input = "test";
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe("expected");
  });
});
```

### 3. Run Test

```bash
npm test -- utils.test.ts
```

## Common Testing Patterns

### Testing React Hooks

```typescript
import { renderHook, act } from "@testing-library/react";
import { useMyHook } from "./useMyHook";

it("should update state", () => {
  const { result } = renderHook(() => useMyHook());
  
  act(() => {
    result.current.updateValue("new value");
  });
  
  expect(result.current.value).toBe("new value");
});
```

### Testing React Components

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { MyComponent } from "./MyComponent";

it("should handle click", () => {
  const onClickMock = vi.fn();
  render(<MyComponent onClick={onClickMock} />);
  
  fireEvent.click(screen.getByRole("button"));
  
  expect(onClickMock).toHaveBeenCalledTimes(1);
});
```

### Mocking Modules

```typescript
import { vi } from "vitest";
import { myFunction } from "./myModule";

// Mock entire module
vi.mock("./myModule", () => ({
  myFunction: vi.fn().mockReturnValue("mocked"),
}));

// Use in test
it("should use mock", () => {
  expect(myFunction()).toBe("mocked");
});
```

## Troubleshooting

### Issue: "Cannot find module '@/...'"

**Solution**: Ensure `vitest.config.ts` has the path alias configured:

```typescript
resolve: {
  alias: {
    "@": resolve(__dirname, "./src"),
  },
}
```

### Issue: "ReferenceError: document is not defined"

**Solution**: Ensure `environment: "jsdom"` is set in `vitest.config.ts`.

### Issue: Tests pass locally but fail in CI

**Solution**: 
1. Check Node.js version matches CI
2. Run `npm ci` instead of `npm install`
3. Ensure all mocks are properly cleaned up

### Issue: Mock not working

**Solution**:
1. Place `vi.mock()` at the top level (before imports)
2. Use `vi.clearAllMocks()` in `beforeEach`
3. Check mock implementation is correct

## Best Practices

1. **Test Behavior, Not Implementation**
   - ✅ Test what the user sees/experiences
   - ❌ Don't test internal state or private methods

2. **Use Descriptive Test Names**
   - ✅ `"should show error when duration exceeds 999.9"`
   - ❌ `"test validation"`

3. **Follow AAA Pattern**
   - Arrange: Set up test data
   - Act: Execute the code
   - Assert: Verify the result

4. **Keep Tests Independent**
   - Each test should run in isolation
   - Use `beforeEach` for setup
   - Clean up after each test

5. **Mock External Dependencies**
   - Mock API calls
   - Mock browser APIs
   - Mock third-party libraries

## Next Steps

1. **Run existing tests**: `npm test`
2. **Explore test UI**: `npm run test:ui`
3. **Read test documentation**: `tests/README.md`
4. **Study example tests**: `src/lib/hooks/useProfileState.test.ts`
5. **Write your first test**: Follow patterns from existing tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Project Testing Guidelines](.cursor/rules/vitest-unit-testing.mdc)

## Support

For questions or issues:
1. Check `tests/README.md` for detailed documentation
2. Review existing test files for examples
3. Consult Vitest documentation for API reference






