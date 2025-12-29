# Implement REST API Endpoint

Implement a REST API endpoint based on the provided implementation plan with proper validation, error handling, and organized code structure.

## Prerequisites
- Implementation plan document: `{{endpoint_name}}-endpoint-implementation-plan.md`
- Types definition: `@types.ts`
- Implementation rules: `@shared.mdc`, `@backend.mdc`, `@astro.mdc`

## Implementation Approach
Work incrementally: implement maximum 3 steps from the plan, summarize progress, describe next 3 actions, then stop for feedback.

## Steps

### 1. Analyze Implementation Plan
- Determine HTTP method (GET, POST, PUT, DELETE, etc.)
- Define endpoint URL structure
- List all expected input parameters
- Understand business logic and data processing stages
- Note validation and error handling requirements

### 2. Begin Implementation
- Define endpoint function with correct HTTP method
- Configure function parameters based on inputs
- Implement input validation for all parameters
- Follow logical steps from implementation plan
- Implement error handling for each stage
- Ensure proper data processing and transformation
- Prepare response data structure

### 3. Validation and Error Handling
- Implement thorough input validation
- Use appropriate HTTP status codes (400 for bad requests, 404 for not found, 500 for server errors)
- Provide clear, informative error messages
- Handle potential exceptions during processing

### 4. Testing Considerations
- Identify edge cases and potential issues
- Ensure coverage of all scenarios from plan
- Consider boundary conditions
- Test error paths

### 5. Documentation
- Add comments for complex logic
- Document main function and helper functions
- Include JSDoc/TSDoc where appropriate
- Ensure code is self-documenting

### 6. Finalization
- Verify all necessary imports are included
- Ensure all helper functions are defined
- Review code for REST API best practices
- Check adherence to style guidelines
- Create implementation summary: `.ai/api/{{endpoint_name}}-endpoint-implementation-summary.md`
- Update `.ai/api-plan.md`:
  - Update implementation status table (change 🔲 to ✅, add date)
  - Update endpoint specification section with complete details
  - Add implementation details (validators, services, routes, tests)
  - Add cross-reference to implementation summary
  - Update implementation summary section if needed

## Guidelines
- Follow REST API design best practices
- Adhere to programming language style guidelines
- Keep code clean, readable, and well-organized
- Handle errors at the beginning of functions (early returns)
- Place happy path last for improved readability
- Avoid unnecessary else statements
- Use guard clauses for preconditions

## Progress Tracking
After each increment:
1. Summarize what was completed
2. Describe next 3 planned actions
3. Wait for feedback before continuing

Present any assumptions or questions about the implementation plan before writing code.

