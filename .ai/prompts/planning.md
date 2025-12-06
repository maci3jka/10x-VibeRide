# Implementation Plan Prompt Generator

You are an expert prompt engineer whose task is to create a comprehensive implementation plan prompt for a specific software engineering task. This meta-prompt will guide you through creating a high-quality prompt that another AI can use to generate detailed implementation plans.

## Step 1: Define the Software Engineering Task

First, identify the software engineering task that the implementation plan will focus on. Ask yourself:

<task_definition>
- What is the primary domain? (e.g., REST API endpoint, frontend view, database schema, service layer, testing strategy, CI/CD pipeline, infrastructure setup, authentication system, caching layer, etc.)
- What is the complexity level? (simple, moderate, complex)
- What are the key deliverables? (code, configuration, documentation, etc.)
</task_definition>

Document your answers clearly, as this will determine the structure and depth of the implementation plan prompt.

## Step 2: Identify Required Input Sources

Based on the task definition, determine what input sources are needed to create a complete implementation plan. Common input source types include:

<input_source_types>
1. **Requirements Documents**: PRD, user stories, feature specifications
2. **Technical Specifications**: API specifications, database schemas, architecture documents
3. **Code References**: Existing implementations, type definitions, interfaces
4. **Standards & Guidelines**: Tech stack, coding standards, implementation rules, style guides
5. **Context Documents**: Related features, dependencies, constraints
</input_source_types>

For each required input source:
- Assign a descriptive name (e.g., `prd`, `db-schema`, `tech-stack`, `endpoint-spec`)
- Use the placeholder syntax: `{{input-name}}` with instructions on what to provide
- Specify whether it's required or optional
- Provide clear guidance on what information should be included

Create an input section for each source using this format:

```markdown
<input_name>
{{input-placeholder}} <- replace with reference to @file.md or paste [description of content]
</input_name>
```

**Minimum**: 1 input source
**Maximum**: 5 input sources
**Recommendation**: 2-4 input sources for most tasks

## Step 3: Define the Expert Role

Assign an appropriate expert role based on the software engineering task. The role should:
- Be specific to the domain (e.g., "senior frontend developer", "experienced API architect", "DevOps engineer", "database administrator")
- Establish authority and expertise
- Set the context for decision-making

Example format:
```markdown
You are an [expert role] whose task is to create a detailed implementation plan for [specific task]. Your plan should be comprehensive and clear enough for another [role] to implement [deliverable] correctly and efficiently.
```

## Step 4: Structure the Analysis Phase

Define the analysis work that must be done in the thinking block before creating the final plan. Use `<analysis>` or `<implementation_breakdown>` tags.

Based on task complexity:

**Simple tasks (3-5 analysis steps)**:
- Summarize key requirements
- Identify main components
- List potential challenges
- Consider error scenarios
- Map requirements to implementation

**Moderate tasks (5-10 analysis steps)**:
- All simple task steps, plus:
- Analyze each input source separately
- Define data flow
- Identify types/interfaces needed
- Consider security implications
- Plan validation strategy

**Complex tasks (10-15 analysis steps)**:
- All moderate task steps, plus:
- Create component hierarchy
- Map user stories to implementation
- Design state management
- Plan integration points
- Consider performance implications
- Identify cross-cutting concerns

Format the analysis section with:
- Clear numbered steps
- Specific instructions for each analysis point
- Emphasis on thoroughness
- Reminder that this section can be quite long

Example:
```markdown
Before creating the final implementation plan, conduct analysis inside <analysis> tags in your thinking block. Execute the following steps:

1. [Analysis step 1 - specific instruction]
2. [Analysis step 2 - specific instruction]
...

This section may be quite long, as it's important to be thorough.
```

## Step 5: Define Core Output Sections

Based on the software engineering task, define the core sections that the implementation plan must include. Structure them logically from high-level overview to detailed implementation steps.

**Common core sections across domains**:
1. **Overview/Summary**: Brief description of what's being implemented and why
2. **[Domain-Specific Details]**: Varies by task (e.g., Endpoint Details, Component Structure, Schema Design)
3. **Implementation Steps**: Step-by-step guide numbered for clarity

**Domain-specific core sections**:

*For API/Backend*:
- Request/Response Details
- Data Flow
- Error Handling
- API Integration

*For Frontend/UI*:
- Component Structure
- Component Details
- Types
- State Management
- User Interactions

*For Database*:
- Schema Structure
- Relationships
- Indexes
- Migrations

*For Services*:
- Service Description
- Public/Private Methods
- Dependencies
- Configuration

*For Infrastructure/DevOps*:
- Architecture Overview
- Resource Definitions
- Deployment Steps
- Monitoring

Choose 5-8 core sections appropriate to your task.

## Step 6: Define Optional Cross-Cutting Sections

Include these optional sections based on task requirements. Mark them clearly as important considerations:

<cross_cutting_sections>
1. **Security Considerations**: Authentication, authorization, data validation, input sanitization
2. **Performance Considerations**: Optimization strategies, caching, query optimization, bottlenecks
3. **Testing Strategy**: Unit tests, integration tests, test cases, coverage
4. **Error Handling**: Error scenarios, status codes, error messages, logging
5. **Validation and Business Logic**: Validation rules, business constraints, edge cases
6. **Monitoring and Observability**: Logging, metrics, alerts, debugging
</cross_cutting_sections>

Select 2-4 cross-cutting sections that are most relevant to your task.

## Step 7: Define Output Format and File Naming

Specify the output format and where to save the plan:

```markdown
The final output should be in English and saved in a file named `.ai/{topic}-{type}-plan.md`.

Format: Markdown with the following structure:

# [Task Type] Implementation Plan: [Specific Name]

## 1. [Section Name]
[Section content guidelines]

## 2. [Section Name]
[Section content guidelines]

...
```

Use the naming pattern: `.ai/{topic}-{type}-plan.md`
- `{topic}`: Specific feature/component name (e.g., `user-profile`, `authentication`, `payment`)
- `{type}`: Plan type (e.g., `view-implementation`, `api-endpoint`, `service`, `database`)

Examples:
- `.ai/user-profile-view-implementation-plan.md`
- `.ai/payment-api-endpoint-plan.md`
- `.ai/cache-service-implementation-plan.md`

## Step 8: Create Output Example Skeleton

Provide a concrete markdown skeleton showing the expected structure with placeholder content. This helps guide the output format.

Format:
````markdown
Here's an example of what the output file should look like (content is to be replaced):

```markdown
# [Task Type] Implementation Plan: [Name]

## 1. [Section 1 Name]
[Brief description of what goes in this section]

## 2. [Section 2 Name]
- [Key point format]
- [Expected structure]

## 3. [Section 3 Name]
### [Subsection if applicable]
[Content guidelines]

...

## N. Implementation Steps
1. [Step 1]
2. [Step 2]
3. [...]
```
````

## Step 9: Add Important Reminders

Include critical reminders at the end of the prompt:

```markdown
## Important Reminders

1. Analytical work should be done in the thinking block using the specified analysis tags.
2. The final output should consist solely of the implementation plan in markdown format.
3. Do not duplicate or repeat any work done in the analysis section in the final output.
4. Ensure the plan is comprehensive, well-structured, and addresses all aspects of the input materials.
5. If you need to make any assumptions due to unclear input information, clearly state them in your analysis.
6. Use appropriate markdown formatting for better readability.
7. Ensure consistency with all provided input sources (PRD, tech stack, specifications, etc.).
8. Follow the provided implementation rules and guidelines strictly.
```

## Step 10: Validation Checklist

Include a self-validation checklist in your thinking block before finalizing the prompt:

<validation_checklist>
Before finalizing the implementation plan prompt, verify:

1. ✓ Task domain and complexity clearly defined
2. ✓ All necessary input sources identified with clear placeholders using {{syntax}}
3. ✓ Expert role appropriate to the task domain
4. ✓ Analysis phase structured with appropriate depth for complexity level
5. ✓ Core output sections are relevant and comprehensive (5-8 sections)
6. ✓ Cross-cutting concerns included where appropriate (2-4 sections)
7. ✓ Output format clearly specified with markdown structure
8. ✓ File naming pattern follows `.ai/{topic}-{type}-plan.md` convention
9. ✓ Example skeleton provided showing expected structure
10. ✓ Important reminders included about analysis vs. final output
11. ✓ Prompt is self-contained and can be used independently
12. ✓ Instructions are clear, specific, and actionable
</validation_checklist>

## Template Structure for Generated Prompts

Use this structure when creating the final implementation plan prompt:

```markdown
# [Task Type] Implementation Plan Generation

[Opening paragraph establishing the expert role and task]

[Input Sources Section]
First, review the following information:

<input_name_1>
{{placeholder-1}} <- instruction on what to provide
</input_name_1>

<input_name_2>
{{placeholder-2}} <- instruction on what to provide
</input_name_2>

[Analysis Phase Section]
Before creating the final implementation plan, conduct analysis inside <analysis> tags in your thinking block. Execute the following steps:

1. [Analysis step 1]
2. [Analysis step 2]
...

This section may be quite long, as it's important to be thorough.

[Output Structure Section]
After conducting the analysis, create a comprehensive implementation plan in markdown format with the following sections:

1. [Core Section 1]: [Description]
2. [Core Section 2]: [Description]
...
N. Implementation Steps: Step-by-step guide for implementing [deliverable]

[Cross-Cutting Concerns Section]
Ensure your plan addresses:
- [Concern 1]: [Description]
- [Concern 2]: [Description]
...

[Output Format and Naming Section]
The final output should be in English and saved in a file named `.ai/{topic}-{type}-plan.md`.

[Example Skeleton Section]
Here's an example of what the output file should look like (content is to be replaced):

```markdown
[Example structure]
```

[Reminders Section]
The final output should consist solely of the implementation plan in markdown format and should not duplicate or repeat any work done in the analysis section.
```

---

## Usage Instructions

To use this meta-prompt:

1. **Define your task**: Clearly state the software engineering task (e.g., "Create a prompt for implementing a REST API endpoint", "Create a prompt for designing a React component", "Create a prompt for a database migration plan")

2. **Work through steps 1-10**: Answer each section thoughtfully based on your task requirements

3. **Use the template structure**: Organize your prompt using the provided template

4. **Validate**: Check your prompt against the validation checklist

5. **Test**: Ensure the generated prompt can be used independently without additional context

## Examples of Tasks This Meta-Prompt Can Generate Prompts For

- REST API endpoint implementation
- Frontend view/component implementation
- Database schema design
- Service layer implementation
- Authentication/authorization system
- Caching strategy implementation
- Testing strategy and test suite
- CI/CD pipeline setup
- Infrastructure as code
- Data migration plan
- Performance optimization plan
- Security audit and hardening
- API integration
- Refactoring plan
- Documentation generation

---

Remember: The goal is to create a prompt that produces detailed, actionable implementation plans that developers can follow to successfully complete their software engineering tasks.

