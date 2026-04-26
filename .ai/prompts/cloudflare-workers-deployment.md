# Cloudflare Workers Deployment Plan Prompt

## IMPROVED PROMPT

**Role:** You are a senior DevOps engineer and Cloudflare Workers expert with deep experience in migrating SSR (Server-Side Rendered) applications from Node.js adapters to edge computing platforms. You specialize in Astro framework deployments, Supabase integrations, and Cloudflare Workers architecture.

**Context:**
- **Application:** VibeRide - a motorcycle trip planning web application
- **Current Stack:**
  - Astro 5.13.7 with SSR mode (`output: "server"`)
  - Node.js adapter (`@astrojs/node` v9.4.3 in standalone mode)
  - React 19.1.1 for interactive components
  - TypeScript 5
  - Tailwind CSS 4
  - Supabase for database and authentication (using `@supabase/ssr` v0.8.0)
  - OpenAI API via Openrouter for AI features
- **Current Deployment:** None (local development only, Node.js 22.14.0)
- **Build Output:** Standard Astro SSR build generating `dist/` directory
- **Critical Dependencies:**
  - Supabase SSR with cookie-based session management
  - Google OAuth authentication flow
  - Environment variables: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY`, `OPENAI_MONTHLY_SPEND_CAP`, `DEVENV`
  - Custom Astro middleware for authentication (`src/middleware/index.ts`)
  - Feature flags via environment variables

**Goal:**
Create a comprehensive, step-by-step deployment plan for migrating VibeRide from the current Node.js adapter to Cloudflare Workers. The plan must ensure zero data loss, maintain all existing functionality, and optimize for Cloudflare's edge computing model.

**Required Output Format:**

Provide your response in the following structured format with exact section headers:

### 1. Compatibility Analysis
- List specific incompatibilities between current stack and Cloudflare Workers runtime
- Identify Node.js APIs that need replacement
- Assess Supabase SSR compatibility with Workers
- Evaluate React 19 SSR compatibility with Workers

### 2. Adapter Migration Plan
- Specify exact Astro adapter to use (package name and version)
- Detail configuration changes needed in `astro.config.mjs`
- List all `package.json` dependency changes (additions, removals, version updates)
- Provide complete configuration file examples

### 3. Environment Variables & Secrets
- Map current environment variables to Cloudflare Workers secrets
- Specify exact `wrangler` commands for secret management
- Address feature flag implementation in Workers environment
- Include `.dev.vars` file structure for local development

### 4. Supabase Integration Adjustments
- Detail required changes to `src/db/supabase.client.ts`
- Address cookie handling differences in Workers runtime
- Verify OAuth callback flow compatibility
- List any required changes to middleware (`src/middleware/index.ts`)

### 5. Build & Deployment Configuration
- Provide complete `wrangler.toml` configuration file
- Specify build commands and output directory settings
- Configure compatibility dates and flags
- Set up environment-specific deployments (preview, production)

### 6. CI/CD Pipeline Updates
- Modify existing `.github/workflows/ci.yml` for Cloudflare deployment
- Add Cloudflare Workers deployment workflow
- Include required GitHub secrets
- Specify deployment triggers (branch-based, PR previews)

### 7. Testing Strategy
- Local development testing approach with Wrangler
- Preview deployment testing checklist
- Production deployment validation steps
- Rollback procedure

### 8. Migration Execution Steps
Provide a numbered, sequential list of exact commands and actions to execute the migration, including:
- Pre-migration checklist
- Dependency installation
- Configuration file creation
- Local testing verification
- First deployment to preview environment
- Production deployment

**Constraints:**
1. **DO NOT** suggest solutions that require rewriting existing application code beyond configuration changes
2. **MUST** maintain compatibility with Astro 5.13.7 - do not suggest downgrading
3. **MUST** preserve all existing authentication flows (Google OAuth via Supabase)
4. **MUST** support the existing middleware pattern
5. **DO NOT** recommend containerization (Docker) - Workers-native deployment only
6. **MUST** specify exact package versions to avoid "framework X version" hallucinations
7. **MUST** keep response under 3000 words
8. **DO NOT** include marketing language or vague statements like "Cloudflare Workers is fast"
9. **MUST** cite official documentation URLs for any Cloudflare or Astro features mentioned
10. **MUST** address potential issues with `@astrojs/node` removal and its impact on existing code

**Specific Technical Concerns to Address:**
1. How does Cloudflare Workers handle Astro's middleware system?
2. Are there limitations with Supabase SSR cookie management in Workers?
3. What happens to `process.env` access in middleware (currently used for `DEVENV`)?
4. How to handle the transition from standalone Node.js server to Workers runtime?
5. What are the cold start implications for React SSR components?

---

## Explanation of Changes

**1. Role Assignment:**
- Added specific expertise areas: "SSR applications," "Astro framework," "Supabase integrations," and "Cloudflare Workers architecture"
- This prevents generic DevOps responses and focuses on the exact technologies involved

**2. Context Enrichment:**
- Included exact package versions (Astro 5.13.7, React 19.1.1, Node.js 22.14.0) to prevent version hallucinations
- Listed all critical dependencies with version numbers
- Specified current adapter configuration (`standalone` mode)
- Included environment variable names and authentication flow details
- Added current deployment status (none) to clarify starting point

**3. Goal Specification:**
- Changed vague "create plan" to "Create a comprehensive, step-by-step deployment plan"
- Added explicit requirements: "zero data loss," "maintain all existing functionality," "optimize for edge computing"
- Specified the exact migration path (Node.js adapter → Cloudflare Workers)

**4. Format Definition:**
- Provided 8 mandatory section headers with exact naming
- Specified required subsections within each section
- Demanded "exact commands," "complete configuration files," and "numbered sequential lists"
- This eliminates vague responses and ensures actionable output

**5. Constraints Added:**
- **Constraint #6** directly addresses version hallucination: "MUST specify exact package versions"
- **Constraint #7** addresses response length: "MUST keep response under 3000 words"
- **Constraint #8** eliminates marketing fluff
- **Constraint #9** requires documentation citations for verifiability
- Other constraints prevent scope creep (no code rewrites, no Docker, maintain Astro 5.13.7)

**6. Technical Concerns Section:**
- Added 5 specific technical questions that must be answered
- These force the model to address edge cases and potential blockers
- Prevents surface-level responses that ignore compatibility issues

**Impact on Response Quality:**
- **Prevents hallucinations:** Exact versions specified, documentation citations required
- **Ensures completeness:** 8 mandatory sections with detailed subsections
- **Maintains focus:** Constraints prevent tangential solutions (Docker, code rewrites)
- **Actionable output:** Demands exact commands, file contents, and sequential steps
- **Addresses edge cases:** Specific technical concerns section forces deep analysis
- **Verifiable:** Documentation URLs allow fact-checking
