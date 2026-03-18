# Automatic Workflow Generation - Example

## Example: soukchasse-ma Project

### Project Metadata
```json
{
  "name": "soukchasse-ma",
  "project_type": "webapp",
  "project_url": "https://soukchasse.ma",
  "architecture": {
    "stack": "Next.js 14, Supabase, TypeScript, Tailwind CSS",
    "database_schema": "PostgreSQL via Supabase",
    "deployment": "Vercel"
  }
}
```

### Detection Logic
- Stack contains "Next" → Next.js detected
- Stack contains "Supabase" → Supabase detected
- **Template Selected**: `nextjs-supabase`

### Generated Workflow

```json
{
  "goals": {
    "primary": "Build production-ready Next.js + Supabase application: soukchasse-ma",
    "secondary": [
      "Ensure database integrity",
      "Validate authentication",
      "Deploy to production"
    ]
  },
  "workflow": {
    "tasks": [
      {
        "key": "ARCH_SPEC",
        "title": "Architecture Specification",
        "description": "Define and document Next.js + Supabase architecture",
        "execution_prompt": "Document the architecture: Next.js app structure, Supabase configuration, API routes, database schema, and deployment strategy.",
        "assigned_agent": "planner",
        "priority": "high",
        "phase": "planning"
      },
      {
        "key": "DB_VERIFY",
        "title": "Database Verification",
        "description": "Verify Supabase database schema and migrations",
        "execution_prompt": "Check Supabase database: verify tables, RLS policies, migrations are applied, and schema matches documentation.",
        "assigned_agent": "developer",
        "priority": "high",
        "phase": "development"
      },
      {
        "key": "AUTH_SMOKE",
        "title": "Auth Smoke Test",
        "description": "Test Supabase authentication flow",
        "execution_prompt": "Test authentication: sign up, sign in, sign out, password reset, and session management work correctly.",
        "assigned_agent": "tester",
        "priority": "high",
        "phase": "testing"
      },
      {
        "key": "CRITICAL_E2E",
        "title": "Critical Flow E2E",
        "description": "End-to-end test of critical user flows",
        "execution_prompt": "Run E2E tests for critical flows: user registration, main feature usage, data persistence, and error handling.",
        "assigned_agent": "tester",
        "priority": "high",
        "phase": "testing"
      },
      {
        "key": "BUILD_SMOKE",
        "title": "Production Build Smoke",
        "description": "Verify production build works",
        "execution_prompt": "Build for production and run smoke tests: check build output, verify no errors, test in production mode.",
        "assigned_agent": "tester",
        "priority": "high",
        "phase": "deployment"
      },
      {
        "key": "CI_VERIFY",
        "title": "CI Pipeline Verification",
        "description": "Ensure CI/CD pipeline is configured and passing",
        "execution_prompt": "Verify CI pipeline: check GitHub Actions workflow, ensure tests run on push, verify deployment automation.",
        "assigned_agent": "developer",
        "priority": "medium",
        "phase": "deployment"
      },
      {
        "key": "LAUNCH_READY",
        "title": "Launch Readiness Validation",
        "description": "Final validation before production launch",
        "execution_prompt": "Validate launch readiness: all tests passing, documentation complete, monitoring configured, backup strategy in place.",
        "assigned_agent": "planner",
        "priority": "high",
        "phase": "deployment"
      }
    ]
  }
}
```

### Generated Tasks in Dashboard

After automatic workflow generation, these 7 tasks appear in the project:

1. **Architecture Specification** (planner, high priority)
2. **Database Verification** (developer, high priority)
3. **Auth Smoke Test** (tester, high priority)
4. **Critical Flow E2E** (tester, high priority)
5. **Production Build Smoke** (tester, high priority)
6. **CI Pipeline Verification** (developer, medium priority)
7. **Launch Readiness Validation** (planner, high priority)

## Other Template Examples

### React SPA (e.g., Vite + React)
- Architecture Specification
- API Integration Verification
- Offline Support Verification
- UI Critical Flow E2E
- Production Build Smoke
- CI Verification
- Launch Readiness Validation

### Electron Desktop App (e.g., HammamPOS Desktop)
- Architecture Specification
- Database Validation
- Desktop Build Verification
- Printer/Device Integration Test
- Packaging Smoke Test
- CI Verification
- Launch Readiness Validation

### Generic Web App (fallback)
- Architecture Specification
- Core Implementation
- Testing & QA
- Production Build Smoke
- CI Verification
- Launch Readiness Validation

## Automatic Triggers

Workflows are automatically generated when:

1. **New Project Created** → `POST /api/projects`
   - Detects project_type and generates initial workflow
   - Tasks created immediately

2. **Architecture Updated** → `PUT /api/projects/:id/architecture`
   - Re-analyzes stack and project characteristics
   - Regenerates workflow with updated context
   - Archives old system tasks, creates new ones

## Zero Manual Workflow

- No JSON editing required
- No manual task creation
- System detects project type automatically
- Workflows adapt to architecture changes
- Tasks stay synchronized with project reality
