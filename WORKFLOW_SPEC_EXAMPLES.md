# Workflow Spec System - Examples & Usage

## Example Workflow JSON

This minimal workflow generates 5 tasks for a web application project:

```json
{
  "goals": {
    "primary": "Build a production-ready web application",
    "secondary": ["Ensure code quality", "Deploy to production"]
  },
  "workflow": {
    "tasks": [
      {
        "key": "SETUP_ENV",
        "title": "Environment Setup",
        "description": "Configure development environment and dependencies",
        "execution_prompt": "Set up the project environment: install dependencies, configure .env files, and verify all tools are working.",
        "assigned_agent": "developer",
        "priority": "high",
        "phase": "setup"
      },
      {
        "key": "ARCH_DESIGN",
        "title": "Architecture Design",
        "description": "Design system architecture and data models",
        "execution_prompt": "Create architecture documentation including: tech stack, folder structure, database schema, and deployment strategy.",
        "assigned_agent": "planner",
        "priority": "high",
        "phase": "planning"
      },
      {
        "key": "CORE_FEATURES",
        "title": "Implement Core Features",
        "description": "Build main application features",
        "execution_prompt": "Implement the core features as defined in the architecture. Focus on functionality first, optimization later.",
        "assigned_agent": "developer",
        "priority": "high",
        "phase": "development"
      },
      {
        "key": "TESTING",
        "title": "Testing & QA",
        "description": "Write and run tests for all features",
        "execution_prompt": "Create comprehensive tests: unit tests for business logic, integration tests for APIs, and smoke tests for critical flows.",
        "assigned_agent": "tester",
        "priority": "medium",
        "phase": "testing"
      },
      {
        "key": "DEPLOYMENT",
        "title": "Production Deployment",
        "description": "Deploy application to production",
        "execution_prompt": "Deploy the application to production: configure hosting, set up CI/CD, verify deployment, and monitor for issues.",
        "assigned_agent": "developer",
        "priority": "high",
        "phase": "deployment"
      }
    ]
  }
}
```

## PowerShell Examples

### 1. PUT Workflow (Save and Auto-Regenerate Tasks)

```powershell
$token = "your-jwt-token-here"
$projectId = 1

$body = @{
  goals = @{
    primary = "Build a production-ready web application"
    secondary = @("Ensure code quality", "Deploy to production")
  }
  workflow = @{
    tasks = @(
      @{
        key = "SETUP_ENV"
        title = "Environment Setup"
        description = "Configure development environment and dependencies"
        execution_prompt = "Set up the project environment: install dependencies, configure .env files, and verify all tools are working."
        assigned_agent = "developer"
        priority = "high"
        phase = "setup"
      },
      @{
        key = "ARCH_DESIGN"
        title = "Architecture Design"
        description = "Design system architecture and data models"
        execution_prompt = "Create architecture documentation including: tech stack, folder structure, database schema, and deployment strategy."
        assigned_agent = "planner"
        priority = "high"
        phase = "planning"
      },
      @{
        key = "CORE_FEATURES"
        title = "Implement Core Features"
        description = "Build main application features"
        execution_prompt = "Implement the core features as defined in the architecture. Focus on functionality first, optimization later."
        assigned_agent = "developer"
        priority = "high"
        phase = "development"
      },
      @{
        key = "TESTING"
        title = "Testing & QA"
        description = "Write and run tests for all features"
        execution_prompt = "Create comprehensive tests: unit tests for business logic, integration tests for APIs, and smoke tests for critical flows."
        assigned_agent = "tester"
        priority = "medium"
        phase = "testing"
      },
      @{
        key = "DEPLOYMENT"
        title = "Production Deployment"
        description = "Deploy application to production"
        execution_prompt = "Deploy the application to production: configure hosting, set up CI/CD, verify deployment, and monitor for issues."
        assigned_agent = "developer"
        priority = "high"
        phase = "deployment"
      }
    )
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId/workflow" `
  -Method PUT `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

### 2. GET Workflow

```powershell
$token = "your-jwt-token-here"
$projectId = 1

Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId/workflow" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" }
```

### 3. GET Tasks (Verify Regeneration)

```powershell
$token = "your-jwt-token-here"
$projectId = 1

Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" } | 
  Select-Object -ExpandProperty tasks | 
  Format-Table id, key, title, status, created_by
```

### 4. Manual Task Regeneration (Optional)

```powershell
$token = "your-jwt-token-here"
$projectId = 1

Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId/regenerate-tasks" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token" }
```

## Bash Examples

### 1. PUT Workflow (Save and Auto-Regenerate Tasks)

```bash
TOKEN="your-jwt-token-here"
PROJECT_ID=1

curl -X PUT "http://localhost:3000/api/projects/$PROJECT_ID/workflow" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goals": {
      "primary": "Build a production-ready web application",
      "secondary": ["Ensure code quality", "Deploy to production"]
    },
    "workflow": {
      "tasks": [
        {
          "key": "SETUP_ENV",
          "title": "Environment Setup",
          "description": "Configure development environment and dependencies",
          "execution_prompt": "Set up the project environment: install dependencies, configure .env files, and verify all tools are working.",
          "assigned_agent": "developer",
          "priority": "high",
          "phase": "setup"
        },
        {
          "key": "ARCH_DESIGN",
          "title": "Architecture Design",
          "description": "Design system architecture and data models",
          "execution_prompt": "Create architecture documentation including: tech stack, folder structure, database schema, and deployment strategy.",
          "assigned_agent": "planner",
          "priority": "high",
          "phase": "planning"
        },
        {
          "key": "CORE_FEATURES",
          "title": "Implement Core Features",
          "description": "Build main application features",
          "execution_prompt": "Implement the core features as defined in the architecture. Focus on functionality first, optimization later.",
          "assigned_agent": "developer",
          "priority": "high",
          "phase": "development"
        },
        {
          "key": "TESTING",
          "title": "Testing & QA",
          "description": "Write and run tests for all features",
          "execution_prompt": "Create comprehensive tests: unit tests for business logic, integration tests for APIs, and smoke tests for critical flows.",
          "assigned_agent": "tester",
          "priority": "medium",
          "phase": "testing"
        },
        {
          "key": "DEPLOYMENT",
          "title": "Production Deployment",
          "description": "Deploy application to production",
          "execution_prompt": "Deploy the application to production: configure hosting, set up CI/CD, verify deployment, and monitor for issues.",
          "assigned_agent": "developer",
          "priority": "high",
          "phase": "deployment"
        }
      ]
    }
  }'
```

### 2. GET Workflow

```bash
TOKEN="your-jwt-token-here"
PROJECT_ID=1

curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/workflow" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. GET Tasks (Verify Regeneration)

```bash
TOKEN="your-jwt-token-here"
PROJECT_ID=1

curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.tasks[] | {id, key, title, status, created_by}'
```

### 4. Manual Task Regeneration (Optional)

```bash
TOKEN="your-jwt-token-here"
PROJECT_ID=1

curl -X POST "http://localhost:3000/api/projects/$PROJECT_ID/regenerate-tasks" \
  -H "Authorization: Bearer $TOKEN"
```

## How It Works

1. **Save Workflow**: PUT to `/api/projects/:id/workflow` saves the workflow spec and automatically regenerates tasks
2. **Archive Old Tasks**: System-created tasks are archived (not deleted) to preserve history
3. **Generate New Tasks**: New tasks are created from the workflow.tasks array with stable keys
4. **No Duplicates**: Tasks are unique by (project_id, key) - existing tasks won't be duplicated
5. **User Tasks Preserved**: Only system-created tasks are archived; user-created tasks remain untouched

## Task Template Fields

- `key` (required): Stable identifier (e.g., "SETUP_ENV")
- `title` (required): Task title
- `description` (optional): Task description
- `execution_prompt` (optional): Instructions for AI agent
- `assigned_agent` (optional): "planner", "developer", or "tester"
- `priority` (optional): "low", "medium", or "high"
- `phase` (optional): Custom phase label for organization

## Zero-Manual Workflow

- Saving a workflow automatically regenerates tasks
- No manual "regenerate" button needed (though endpoint exists for admin use)
- Dashboard stays truthful and accurate with workflow spec as single source of truth
