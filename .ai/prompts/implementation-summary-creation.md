# Implementation Summary Creation Prompt

You are an AI assistant tasked with creating a comprehensive implementation summary document based on a completed implementation chat session.

## Your Task

Analyze the implementation chat history and create a structured summary document that captures:
1. What was built
2. How it was built
3. Key technical decisions
4. Integration points
5. Testing verification
6. Compliance with requirements

## Document Structure

Use the following structure for the summary:

### 1. Header Section
```markdown
# [Feature Name] Implementation Summary

## Overview
[2-3 sentence description of what was implemented]

**Implementation Date**: [Date]
**Status**: ✅ Complete | ⚠️ Partial | ❌ Incomplete
**Route/Endpoint**: [If applicable]
**Linter Errors**: [Count]
```

### 2. Files Created
List all new files with:
- Full path
- Purpose (1 sentence)
- Key exports/features (bullet points)
- Important implementation details

Group by type:
- Custom Hooks
- React Components
- Astro Pages
- API Endpoints
- Services/Utilities
- Types/Schemas

### 3. Files Modified
List modified files with:
- What changed
- Why it changed
- Impact on other components

### 4. Existing Components Used
List reused components with:
- Status (already implemented)
- Key features utilized
- Integration points

### 5. Dependencies Added
List new dependencies:
- Runtime dependencies
- Dev dependencies
- shadcn/ui components installed

### 6. API Integration
Document API interactions:
- Endpoints called
- Request/response formats
- Error handling
- Status codes handled

### 7. User Interactions
Describe user flows:
- Step-by-step interactions
- Expected behavior
- Edge cases handled

### 8. Validation Rules
Document validation:
- Client-side validation (Zod schemas)
- Server-side validation
- Error messages
- Field constraints

### 9. Error Handling
Document error scenarios:
- Network errors
- Validation errors
- Authentication errors
- Server errors
- Offline handling

### 10. Accessibility Features
List accessibility implementations:
- ARIA attributes used
- Keyboard navigation
- Screen reader support
- Focus management

### 11. Styling and Layout
Document styling decisions:
- Layout structure
- Responsive design approach
- Dark mode support
- Component spacing

### 12. State Flow
Describe state management:
- Initial load flow
- User interaction flows
- Data synchronization
- Error recovery

### 13. Testing Verification
Document testing:
- Manual testing completed (checklist)
- Dev server status
- Console errors checked
- Linter errors resolved

### 14. Performance Considerations
List optimizations:
- Memoization strategies
- Bundle size impact
- Lazy loading
- Re-render optimization

### 15. Future Enhancements
List potential improvements:
- Features not in scope
- Technical debt
- Optimization opportunities

### 16. Dependencies
List all dependencies:
- Runtime dependencies
- Dev dependencies
- Peer dependencies

### 17. Compliance with Requirements
Create a table:
| Requirement | Status | Notes |
|-------------|--------|-------|
| [Requirement] | ✅/⚠️/❌ | [Notes] |

### 18. Known Limitations
List limitations:
- Incomplete features
- Technical constraints
- Workarounds needed

### 19. Conclusion
Summarize:
- Implementation completeness
- Core requirements met (checklist)
- Readiness for next steps

## Writing Guidelines

### Tone and Style
- Be direct and factual
- Use technical terminology appropriately
- Avoid enthusiasm or validation language
- Focus on what was done, not how great it is

### Format
- Use markdown tables for structured data
- Use code blocks for code examples
- Use bullet points for lists
- Use checkmarks (✅/⚠️/❌) for status indicators

### Code Examples
When showing code:
```typescript
// Use proper syntax highlighting
// Include type annotations
// Show complete, working examples
```

### Completeness
- Include all files created or modified
- Document all integration points
- List all error scenarios handled
- Capture all validation rules

### Accuracy
- Verify file paths are correct
- Confirm implementation details
- Check status codes and error handling
- Validate compliance claims

## Information to Extract

From the chat history, extract:

1. **Files**: Every file created or modified with full paths
2. **Components**: All React/Astro components with props and features
3. **Hooks**: Custom hooks with their API and return values
4. **API Calls**: All endpoints with request/response formats
5. **Validation**: All Zod schemas and validation rules
6. **Error Handling**: All error scenarios and how they're handled
7. **State Management**: How state flows through the application
8. **User Flows**: Step-by-step user interactions
9. **Testing**: What was tested and verified
10. **Dependencies**: What was installed or used

## Special Sections

### For API Endpoints
Include:
- HTTP method and route
- Request body schema
- Response formats (success and error)
- Status codes
- Authentication requirements
- Rate limiting

### For React Components
Include:
- Props interface
- State management approach
- Event handlers
- Side effects (useEffect)
- Integration with other components

### For Custom Hooks
Include:
- Parameters
- Return value structure
- Side effects
- Dependencies
- Usage examples

### For Forms
Include:
- All fields with types and constraints
- Validation rules per field
- Error messages
- Submit behavior
- Dirty checking logic

## Output Format

Create a single markdown file named:
`[feature-name]-implementation-summary.md`

Place it in:
`.ai/ui/` for UI implementations
`.ai/api/` for API implementations
`.ai/services/` for service implementations

## Example Usage

Given a chat where:
- User requested "implement the profile view"
- Implementation included forms, hooks, API integration
- Testing was completed
- No linter errors

Output should be a comprehensive summary document following the structure above, capturing every detail of the implementation.

## Quality Checklist

Before finalizing the summary, verify:
- [ ] All files are documented with full paths
- [ ] All components have complete feature lists
- [ ] All API interactions are documented
- [ ] All validation rules are captured
- [ ] All error scenarios are listed
- [ ] Testing verification is included
- [ ] Compliance table is complete
- [ ] Known limitations are honest and clear
- [ ] Conclusion summarizes readiness accurately
- [ ] No placeholder text remains
- [ ] All code examples are valid
- [ ] All links/references are correct

## Notes

- This summary serves as documentation for future reference
- It should be detailed enough for another developer to understand the implementation without reading the chat
- It should capture decisions made and rationale where relevant
- It should be honest about limitations and incomplete features
- It should be structured for easy scanning and reference

