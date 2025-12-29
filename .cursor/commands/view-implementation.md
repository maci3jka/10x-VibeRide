# Implement Frontend View

Implement a frontend view based on the provided implementation plan with proper component structure, API integration, state management, and user interaction handling.

## Prerequisites
- Implementation plan document: `{{view_name}}-implementation-plan.md`
- Types definition: `@types.ts`
- Implementation rules: `@shared.mdc`, `@frontend.mdc`, `@astro.mdc`, `@react.mdc`, `@ui-shadcn-helper.mdc`

## Implementation Approach
Work incrementally: implement maximum 3 steps from the plan, summarize progress, describe next 3 actions, then stop for feedback.

## Steps

### 1. Analyze Implementation Plan
- Review complete implementation plan document
- Identify all components and their hierarchy
- List all API endpoints to integrate
- Map out user interactions and event handlers
- Understand state management requirements
- Note styling and layout specifications
- Identify error handling and edge cases

### 2. Component Structure
- Create component hierarchy based on plan
- Define component responsibilities clearly
- Establish parent-child relationships
- Determine which components are Astro (static) vs React (dynamic)
- Plan component file organization in `src/components/`
- Identify reusable UI components from `src/components/ui/`

### 3. API Integration
- Identify all API endpoints from plan
- Create or use existing service functions in `src/lib/services/`
- Implement API call logic with proper error handling
- Handle loading states during API calls
- Process and transform API responses
- Update component state with API data

### 4. User Interactions
- List all user interactions from plan
- Implement event handlers for each interaction
- Connect handlers to appropriate state changes
- Add form validation where applicable
- Implement user feedback (toasts, alerts, etc.)
- Handle edge cases in user input

### 5. State Management
- Identify required state for each component
- Implement local state using React hooks (useState, useReducer)
- Create custom hooks if needed in `src/lib/hooks/`
- Implement shared state if required
- Ensure proper state initialization
- Handle state persistence if needed (localStorage, etc.)
- Optimize re-renders with useMemo/useCallback

### 6. Styling and Layout
- Apply Tailwind CSS classes per plan specifications
- Use Shadcn/ui components where appropriate
- Implement responsive design (mobile-first approach)
- Ensure consistent spacing and typography
- Add loading skeletons or spinners
- Implement animations/transitions if specified

### 7. Error Handling and Edge Cases
- Implement try-catch blocks for API calls
- Display user-friendly error messages
- Handle network failures gracefully
- Implement fallback UI for error states
- Handle empty states (no data scenarios)
- Validate user input before submission
- Handle authentication/authorization errors

### 8. Performance Optimization
- Minimize unnecessary re-renders
- Use React.memo for expensive components
- Implement code splitting if needed
- Optimize images and assets
- Lazy load components where appropriate
- Debounce/throttle expensive operations

### 9. Testing
- Write unit tests for components (if specified)
- Test all user interactions manually
- Test API integration scenarios
- Test error handling paths
- Test responsive behavior
- Test accessibility (keyboard navigation, screen readers)

### 10. Finalization
- Verify all imports are correct
- Remove unused code and imports
- Add JSDoc comments for complex logic
- Ensure TypeScript types are properly defined
- Run linter and fix any issues
- Test the complete user flow end-to-end
- Create implementation summary: `.ai/ui/{{view_name}}-implementation-summary.md`

## Guidelines

### Component Best Practices
- Keep components focused on single responsibility
- Extract reusable logic into custom hooks
- Use composition over inheritance
- Prefer functional components with hooks
- Keep component files under 300 lines

### State Management
- Lift state only when necessary
- Keep state as local as possible
- Use custom hooks for complex state logic
- Avoid prop drilling (use context if needed)

### Code Quality
- Follow TypeScript best practices
- Use early returns for error conditions
- Handle errors at the beginning of functions
- Place happy path last for readability
- Avoid unnecessary else statements
- Use guard clauses for preconditions
- Keep functions small and focused

### Styling
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing (use Tailwind spacing scale)
- Use Shadcn/ui components for common patterns
- Ensure accessibility (ARIA labels, semantic HTML)

### API Integration
- Always handle loading and error states
- Show user feedback for async operations
- Implement proper error messages
- Use TypeScript types from `src/types.ts`
- Centralize API calls in service functions

## Common Patterns

### API Call Pattern
```typescript
const [data, setData] = useState<DataType | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const result = await apiService.getData();
    setData(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setLoading(false);
  }
};
```

### Form Handling Pattern
```typescript
const [formData, setFormData] = useState<FormType>(initialState);
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const validationErrors = validateForm(formData);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  try {
    await apiService.submit(formData);
    toast.success('Success!');
  } catch (err) {
    toast.error('Failed to submit');
  }
};
```

### Custom Hook Pattern
```typescript
export function useCustomHook() {
  const [state, setState] = useState(initialState);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  const actions = {
    action1: () => { /* ... */ },
    action2: () => { /* ... */ },
  };
  
  return { state, ...actions };
}
```

## Progress Tracking
After each increment:
1. Summarize what was completed
2. Describe next 3 planned actions
3. Wait for feedback before continuing

Present any assumptions or questions about the implementation plan before writing code.


