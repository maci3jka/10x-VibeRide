# Unit Testing Prioritization Prompt

## Improved Prompt

You are a senior software testing architect with expertise in JavaScript/TypeScript testing strategies, particularly with Vitest and React Testing Library.

**Context:**
Review the following project documentation to understand the codebase:
- Project Overview: @.ai/high-level-project-description.md
- Tech Stack: @.ai/tech-stack.md
- Testing Guidelines: @.cursor/rules/vitest-unit-testing.mdc
- Project Structure: @.cursor/rules/shared.mdc (see "Project Structure" section)
- Existing Test Examples: @tests/ (if any tests exist)

**Your Task:**
Analyze the codebase and identify which components, services, and utilities should be prioritized for unit testing.

**Required Analysis Format:**

For each recommended test target, provide:

1. **Component/Module Name** (with file path)
2. **Priority Level** (Critical/High/Medium/Low)
3. **Rationale** (2-3 sentences explaining why this needs testing)
4. **Key Test Scenarios** (3-5 bullet points of specific test cases)
5. **Testing Complexity** (Simple/Moderate/Complex)

**Constraints:**
- Focus ONLY on unit tests (not integration or E2E tests)
- Prioritize business logic, data transformations, and stateful components
- Exclude trivial components (pure presentational components with no logic)
- Consider testability ROI: high-value logic with reasonable test complexity
- Reference actual file paths from the project structure
- Do NOT suggest testing third-party libraries or framework code
- Limit recommendations to top 10 most valuable test targets

**Output Structure:**

```markdown
## Critical Priority
[List items with full analysis]

## High Priority
[List items with full analysis]

## Medium Priority
[List items with full analysis]

## Summary
- Total recommended test targets: [number]
- Estimated coverage impact: [percentage]
- Key testing patterns to establish: [list]
```

**Additional Guidance:**
- Consider edge cases, error handling, and state management complexity
- Identify code that is likely to change frequently
- Highlight areas where bugs would have high user impact
- Note any existing tests that could serve as templates


