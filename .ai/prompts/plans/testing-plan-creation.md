# Testing Plan Implementation Prompt

You are an experienced QA engineer and test architect whose task is to create a comprehensive testing plan for a software feature or component. Your plan should be detailed and actionable enough for QA engineers and developers to implement a complete testing strategy that ensures quality, reliability, and maintainability.

## Input Sources

First, review the following information:

<feature_specification>
{{feature-spec}} <- replace with reference to @feature-spec.md or paste the feature requirements, user stories, or PRD that describes what needs to be tested
</feature_specification>

<tech_stack>
{{tech-stack}} <- replace with reference to @tech-stack.md or paste information about the technology stack (frameworks, languages, testing tools already in use)
</tech_stack>

<implementation_details>
{{implementation}} <- replace with reference to @implementation-plan.md or paste details about the implementation (API endpoints, components, services, database schema, etc.)
</implementation_details>

<existing_test_patterns>
{{test-patterns}} <- (OPTIONAL) replace with reference to existing test files or paste examples of current testing patterns and conventions used in the project
</existing_test_patterns>

## Analysis Phase

Before creating the final testing plan, conduct a thorough analysis inside `<testing_analysis>` tags in your thinking block. Execute the following steps:

1. **Feature Understanding**: Summarize the key functionality being tested, including user flows, business logic, and expected outcomes
2. **Component Identification**: List all components, services, APIs, and integrations that need testing coverage
3. **Tech Stack Analysis**: Analyze the technology stack and identify appropriate testing tools, frameworks, and approaches for each layer
4. **Risk Assessment**: Identify high-risk areas, edge cases, and potential failure points that require special attention
5. **Test Layer Strategy**: Determine the appropriate balance between unit tests, integration tests, E2E tests, and other test types
6. **Data Requirements**: Identify test data needs, fixtures, mocks, and database seeding requirements
7. **Dependency Mapping**: Map external dependencies, third-party services, and integration points that need mocking or stubbing
8. **Performance Considerations**: Identify any performance, load, or stress testing requirements
9. **Security Testing Needs**: Determine security testing requirements (authentication, authorization, input validation, etc.)
10. **Existing Patterns Review**: If existing test patterns are provided, analyze them for consistency and reusability

This section may be quite long, as it's important to be thorough in understanding all testing requirements.

## Output Structure

After conducting the analysis, create a comprehensive testing plan in markdown format with the following sections:

### Core Sections

1. **Testing Overview**: Brief summary of what's being tested, testing objectives, and success criteria
2. **Test Scope**: Clear definition of what is in scope and out of scope for this testing plan
3. **Testing Strategy**: Overall approach to testing, including test pyramid distribution and rationale
4. **Test Types and Coverage**:
   - Unit Tests: What to test, coverage targets, tools
   - Integration Tests: Integration points, scenarios, tools
   - End-to-End Tests: User flows, critical paths, tools
   - Other test types as needed (performance, security, accessibility, etc.)
5. **Test Scenarios and Cases**: Detailed test scenarios organized by component/feature with:
   - Test case descriptions
   - Preconditions
   - Test steps
   - Expected results
   - Priority (P0/P1/P2)
6. **Test Data Strategy**: Approach for test data management, fixtures, mocks, and database seeding
7. **Test Environment Setup**: Configuration requirements, environment variables, dependencies, and setup instructions
8. **Testing Tools and Frameworks**: Specific tools to use for each test type with justification
9. **Mocking and Stubbing Strategy**: What to mock, when to mock, and how to handle external dependencies
10. **Implementation Steps**: Step-by-step guide for implementing the test suite, numbered for clarity

### Cross-Cutting Concerns

Ensure your plan addresses:

- **Error and Edge Cases**: Comprehensive coverage of error scenarios, boundary conditions, and edge cases
- **Performance Testing**: Load testing, stress testing, and performance benchmarks if applicable
- **Security Testing**: Authentication, authorization, input validation, and security vulnerabilities
- **Accessibility Testing**: WCAG compliance and accessibility requirements if applicable for UI components
- **Test Maintenance**: Strategy for keeping tests maintainable, avoiding flakiness, and handling test debt
- **CI/CD Integration**: How tests will be integrated into the continuous integration pipeline

## Output Format and File Naming

The final output should be in English and saved in a file named `.ai/{feature-name}-testing-plan.md`.

Use the naming pattern: `.ai/{feature-name}-testing-plan.md`
- `{feature-name}`: Specific feature or component name (e.g., `user-authentication`, `trip-planning`, `gpx-export`)

Examples:
- `.ai/user-authentication-testing-plan.md`
- `.ai/trip-planning-testing-plan.md`
- `.ai/payment-processing-testing-plan.md`

## Example Output Structure

Here's an example of what the output file should look like (content is to be replaced):

```markdown
# Testing Plan: [Feature Name]

## 1. Testing Overview
Brief summary of the feature being tested, testing objectives, and what constitutes successful testing coverage.

## 2. Test Scope
### In Scope
- [Component/feature 1]
- [Component/feature 2]
- [Integration point 1]

### Out of Scope
- [What's not being tested and why]

## 3. Testing Strategy
Overall approach to testing this feature, including:
- Test pyramid distribution (70% unit, 20% integration, 10% E2E)
- Rationale for the chosen strategy
- Key testing principles to follow

## 4. Test Types and Coverage

### 4.1 Unit Tests
**Coverage Target**: X%
**Tools**: [Testing framework]
**Focus Areas**:
- [Component/function 1]: [What to test]
- [Component/function 2]: [What to test]

### 4.2 Integration Tests
**Tools**: [Testing framework]
**Integration Points**:
- [Integration 1]: [What to test]
- [Integration 2]: [What to test]

### 4.3 End-to-End Tests
**Tools**: [E2E framework]
**Critical User Flows**:
- [Flow 1]: [Description]
- [Flow 2]: [Description]

### 4.4 [Other Test Types]
[Performance/Security/Accessibility tests as needed]

## 5. Test Scenarios and Cases

### 5.1 [Component/Feature Name]

#### Test Case 1: [Test Case Name]
- **Priority**: P0/P1/P2
- **Type**: Unit/Integration/E2E
- **Description**: [What this test verifies]
- **Preconditions**: [Setup requirements]
- **Test Steps**:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Expected Result**: [What should happen]
- **Edge Cases**: [Boundary conditions to test]

[Repeat for each test case]

## 6. Test Data Strategy
- **Fixtures**: [Approach for test fixtures]
- **Mocks**: [What to mock and how]
- **Database Seeding**: [Strategy for test database]
- **Test Data Cleanup**: [How to maintain test data hygiene]

## 7. Test Environment Setup
### Prerequisites
- [Required software/tools]
- [Environment variables]
- [Configuration files]

### Setup Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## 8. Testing Tools and Frameworks
| Test Type | Tool/Framework | Justification |
|-----------|---------------|---------------|
| Unit | [Tool] | [Why this tool] |
| Integration | [Tool] | [Why this tool] |
| E2E | [Tool] | [Why this tool] |

## 9. Mocking and Stubbing Strategy
### External Dependencies
- **[Dependency 1]**: [Mock/Stub strategy]
- **[Dependency 2]**: [Mock/Stub strategy]

### API Mocking
- [Approach for mocking APIs]

### Database Mocking
- [Approach for database in tests]

## 10. Error and Edge Cases
### Error Scenarios
- [Error scenario 1]: [How to test]
- [Error scenario 2]: [How to test]

### Edge Cases
- [Edge case 1]: [How to test]
- [Edge case 2]: [How to test]

## 11. Performance Testing
[If applicable]
- **Load Testing**: [Scenarios and tools]
- **Stress Testing**: [Scenarios and tools]
- **Performance Benchmarks**: [Expected metrics]

## 12. Security Testing
- **Authentication Tests**: [What to verify]
- **Authorization Tests**: [What to verify]
- **Input Validation**: [What to verify]
- **Security Vulnerabilities**: [What to check]

## 13. Test Maintenance Strategy
- **Avoiding Flakiness**: [Best practices]
- **Test Refactoring**: [When and how]
- **Test Documentation**: [Standards]
- **Test Debt Management**: [Approach]

## 14. CI/CD Integration
- **Test Execution**: [When tests run in pipeline]
- **Test Reporting**: [How results are reported]
- **Failure Handling**: [What happens on test failure]
- **Coverage Requirements**: [Minimum coverage gates]

## 15. Implementation Steps
1. **Setup Testing Infrastructure**
   - Install testing frameworks and dependencies
   - Configure test environment
   - Set up test database/fixtures

2. **Implement Unit Tests**
   - [Specific components to test first]
   - [Order of implementation]

3. **Implement Integration Tests**
   - [Integration points to test first]
   - [Order of implementation]

4. **Implement E2E Tests**
   - [Critical flows to test first]
   - [Order of implementation]

5. **Configure CI/CD Integration**
   - Add test scripts to pipeline
   - Configure coverage reporting
   - Set up test result notifications

6. **Documentation and Handoff**
   - Document test patterns
   - Create test execution guide
   - Train team on testing approach
```

## Important Reminders

1. Analytical work should be done in the thinking block using the `<testing_analysis>` tags.
2. The final output should consist solely of the testing plan in markdown format.
3. Do not duplicate or repeat any work done in the analysis section in the final output.
4. Ensure the plan is comprehensive, well-structured, and addresses all aspects of the input materials.
5. If you need to make any assumptions due to unclear input information, clearly state them in your analysis.
6. Use appropriate markdown formatting for better readability (tables, lists, code blocks).
7. Ensure consistency with the provided tech stack and existing test patterns.
8. Prioritize test cases by risk and business impact (P0 for critical, P1 for important, P2 for nice-to-have).
9. Be specific about tools, frameworks, and approaches rather than generic recommendations.
10. Include concrete examples of test case structures that match the project's testing conventions.
11. Consider the test pyramid principle: more unit tests, fewer integration tests, even fewer E2E tests.
12. Address test maintainability and CI/CD integration from the start, not as an afterthought.

