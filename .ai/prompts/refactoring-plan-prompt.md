# Refactoring Plan Prompt

## Improved Prompt

**Role:** You are a senior software architect with expertise in code refactoring, technical debt analysis, and creating actionable implementation plans.

**Context:** I have an ongoing conversation in this chat where we've discussed code issues, potential improvements, or architectural changes. The codebase is a TypeScript/React/Astro web application called VibeRide.

**Task:** Analyze the entire conversation history in this chat session to identify all discussed code issues, technical debt, improvement opportunities, and planned changes. Then create a comprehensive refactoring plan.

**Output Format:** Provide the refactoring plan as a structured markdown document with the following sections:

1. **Executive Summary** (2-3 sentences): High-level overview of what needs refactoring and why
2. **Identified Issues**: Bulleted list of problems discussed in the chat
3. **Proposed Changes**: Organized by priority (High/Medium/Low), each with:
   - Description of the change
   - Files/modules affected
   - Estimated complexity (Simple/Moderate/Complex)
   - Dependencies on other changes
4. **Implementation Order**: Numbered sequence showing the optimal order to apply changes
5. **Risks & Considerations**: Potential issues to watch for during refactoring

**Constraints:**
- Base the plan ONLY on what was actually discussed in this chat - do not invent new issues
- Do not include version numbers for frameworks unless they were explicitly mentioned in the conversation
- Keep each item description to 1-2 sentences maximum
- If no refactoring topics were discussed, state that clearly instead of fabricating content
- Prioritize based on impact and dependencies, not personal preference

**Length:** The complete plan should be 200-400 words, excluding code examples.

---

## Explanation of Changes

**Problems Addressed:**

1. **Response Length Control**: Added explicit word count constraint (200-400 words) and per-item limits (1-2 sentences) to prevent verbose responses.

2. **Hallucination Prevention**: 
   - Added "Base the plan ONLY on what was actually discussed" constraint
   - Explicitly forbid including version numbers unless mentioned in conversation
   - Added fallback instruction to state clearly if no refactoring was discussed

**Improvements Made:**

1. **Role Assignment**: Defined the AI as a "senior software architect" to set expertise level and perspective for the task.

2. **Context Enrichment**: Added information about the codebase (VibeRide, TypeScript/React/Astro) and clarified that analysis should be based on the current chat history.

3. **Goal Specification**: Changed vague "prepare refactoring plan" to explicit "analyze conversation history and create comprehensive refactoring plan."

4. **Format Definition**: Provided exact markdown structure with 5 specific sections, preventing the model from choosing its own organization.

5. **Constraint Addition**: 
   - Prevents hallucination by requiring evidence from chat
   - Controls length at document and item level
   - Removes subjective prioritization
   - Handles edge case where no refactoring was discussed

These changes transform an ambiguous 5-word prompt into a precise instruction set that constrains the model's behavior while providing clear success criteria.

---

## Original Prompt

```
based on the chat prepare refactoring plan
```
