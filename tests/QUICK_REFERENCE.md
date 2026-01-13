# Testing Quick Reference

## Run Tests

```bash
npm test                    # Run all tests once
npm run test:watch          # Watch mode (TDD)
npm run test:ui             # Visual UI
npm run test:coverage       # Coverage report
```

## Run Specific Tests

```bash
npm test -- myfile.test.ts              # Single file
npm test -- -t "test name"              # Single test
npm test -- -t "describe block"         # Test category
```

## Common Imports

```typescript
// Vitest
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// React Testing Library
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";

// User Events (more realistic than fireEvent)
import userEvent from "@testing-library/user-event";
```

## Test Structure (AAA Pattern)

```typescript
describe("Component/Function Name", () => {
  it("should do something specific", () => {
    // Arrange - Set up test data
    const input = "test";
    
    // Act - Execute the code
    const result = myFunction(input);
    
    // Assert - Verify the result
    expect(result).toBe("expected");
  });
});
```

## Testing Hooks

```typescript
import { renderHook, act } from "@testing-library/react";

it("should update state", () => {
  const { result } = renderHook(() => useMyHook());
  
  act(() => {
    result.current.updateValue("new");
  });
  
  expect(result.current.value).toBe("new");
});
```

## Testing Components

```typescript
import { render, screen } from "@testing-library/react";

it("should render button", () => {
  render(<MyComponent />);
  
  expect(screen.getByRole("button")).toBeInTheDocument();
});
```

## User Interactions

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("should handle click", async () => {
  const user = userEvent.setup();
  const onClickMock = vi.fn();
  
  render(<Button onClick={onClickMock} />);
  
  await user.click(screen.getByRole("button"));
  
  expect(onClickMock).toHaveBeenCalledTimes(1);
});
```

## Mocking

### Mock Function
```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue("value");
mockFn.mockResolvedValue("async value");
```

### Mock Module
```typescript
vi.mock("./myModule", () => ({
  myFunction: vi.fn().mockReturnValue("mocked"),
}));
```

### Spy on Function
```typescript
const spy = vi.spyOn(object, "method");
spy.mockImplementation(() => "mocked");
```

### Clear Mocks
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Async Testing

### waitFor
```typescript
await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});
```

### findBy Queries (built-in wait)
```typescript
const element = await screen.findByText("Loaded");
expect(element).toBeInTheDocument();
```

### act (for hooks)
```typescript
await act(async () => {
  await result.current.fetchData();
});
```

## Common Queries

### By Role (Preferred)
```typescript
screen.getByRole("button")
screen.getByRole("textbox", { name: "Email" })
screen.getByRole("heading", { level: 1 })
```

### By Label
```typescript
screen.getByLabelText("Email")
```

### By Text
```typescript
screen.getByText("Submit")
screen.getByText(/submit/i)  // Case insensitive
```

### By Test ID (Last Resort)
```typescript
screen.getByTestId("custom-element")
```

### Query Variants
- `getBy*` - Throws if not found
- `queryBy*` - Returns null if not found
- `findBy*` - Async, waits for element

## Common Matchers

### Basic
```typescript
expect(value).toBe(expected)
expect(value).toEqual(expected)
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
```

### Numbers
```typescript
expect(value).toBeGreaterThan(3)
expect(value).toBeLessThan(10)
expect(value).toBeCloseTo(0.3)
```

### Strings
```typescript
expect(string).toMatch(/pattern/)
expect(string).toContain("substring")
```

### Arrays
```typescript
expect(array).toContain(item)
expect(array).toHaveLength(3)
```

### Objects
```typescript
expect(object).toHaveProperty("key")
expect(object).toMatchObject({ key: "value" })
```

### Functions
```typescript
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledTimes(2)
expect(fn).toHaveBeenCalledWith(arg1, arg2)
```

### DOM (jest-dom)
```typescript
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveValue("text")
expect(element).toHaveAttribute("aria-label", "Close")
```

## Setup & Teardown

```typescript
beforeEach(() => {
  // Runs before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Runs after each test
  cleanup();
});

beforeAll(() => {
  // Runs once before all tests
});

afterAll(() => {
  // Runs once after all tests
});
```

## Debugging

### Log Component Output
```typescript
import { screen } from "@testing-library/react";

screen.debug();  // Logs entire DOM
screen.debug(screen.getByRole("button"));  // Logs specific element
```

### Log Hook State
```typescript
console.log(result.current);
```

### Pause Execution
```typescript
await new Promise(r => setTimeout(r, 1000));
```

## Common Patterns

### Test Loading State
```typescript
it("should show loading", () => {
  render(<Component />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});
```

### Test Error State
```typescript
it("should show error", async () => {
  mockFetch.mockRejectedValue(new Error("Failed"));
  render(<Component />);
  
  expect(await screen.findByText("Error")).toBeInTheDocument();
});
```

### Test Form Submission
```typescript
it("should submit form", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  
  render(<Form onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.click(screen.getByRole("button", { name: "Submit" }));
  
  expect(onSubmit).toHaveBeenCalledWith({ email: "test@example.com" });
});
```

### Test Conditional Rendering
```typescript
it("should show content when loaded", async () => {
  render(<Component />);
  
  expect(screen.queryByText("Content")).not.toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
```

## Tips

1. **Prefer user-centric queries**: Use `getByRole` over `getByTestId`
2. **Wait for async updates**: Use `waitFor` or `findBy*`
3. **Clean up mocks**: Use `beforeEach` with `vi.clearAllMocks()`
4. **Test behavior, not implementation**: Don't test internal state
5. **Use descriptive test names**: Explain what and why
6. **Keep tests isolated**: Each test should be independent
7. **Mock external dependencies**: API calls, timers, etc.
8. **Use `act` for state updates**: Wrap state changes in hooks

## Resources

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
