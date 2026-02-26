# Project Dashboard API Documentation

Base URL: `http://84.8.221.172:3000/api`

## Authentication

All endpoints (except `/login`) require JWT authentication.

**Header:**
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST `/login`
Login and get JWT token.

**Request:**
```json
{
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Projects

#### GET `/projects`
Get all projects (active or archived).

**Query Parameters:**
- `archived` (optional): `true` for archived projects, default `false`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Project Name",
    "description": "Description",
    "status": "active",
    "priority": 1,
    "project_url": "https://example.com",
    "project_type": "webapp",
    "archived": 0,
    "completed_tasks": 5,
    "total_tasks": 10,
    "created_at": "2026-02-25T10:00:00.000Z",
    "updated_at": "2026-02-25T12:00:00.000Z"
  }
]
```

#### GET `/projects/:id`
Get project details with all tasks.

**Response:**
```json
{
  "id": 1,
  "name": "Project Name",
  "description": "Description",
  "tasks": [
    {
      "id": 1,
      "title": "Task Title",
      "description": "Task description",
      "status": "done",
      "completed_at": "2026-02-25T12:00:00.000Z"
    }
  ]
}
```

#### POST `/projects`
Create a new project.

**Request:**
```json
{
  "name": "Project Name",
  "description": "Description",
  "priority": 1,
  "project_url": "https://example.com",
  "project_type": "webapp"
}
```

#### PATCH `/projects/:id`
Update project details.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "active",
  "priority": 2,
  "archived": 0,
  "project_url": "https://example.com",
  "project_type": "webapp"
}
```

#### DELETE `/projects/:id`
Delete a project and all its tasks.

**Response:**
```json
{
  "success": true
}
```

---

### Tasks

#### POST `/tasks`
Create a new task.

**Request:**
```json
{
  "project_id": 1,
  "title": "Task Title",
  "description": "Task description",
  "estimated_minutes": 60
}
```

#### PATCH `/tasks/:id`
Update task details or status.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "done"
}
```

#### DELETE `/tasks/:id`
Delete a task.

**Response:**
```json
{
  "success": true
}
```

---

### Activity & Analytics

#### GET `/activity`
Get recent activity log.

**Query Parameters:**
- `limit` (optional): Number of records, default 50

**Response:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "task_id": 5,
    "action": "task_completed",
    "details": "Completed Dark Mode",
    "actor": "kiro",
    "timestamp": "2026-02-25T12:00:00.000Z",
    "project_name": "Project Dashboard"
  }
]
```

#### GET `/search`
Search projects and tasks.

**Query Parameters:**
- `q` (required): Search query

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Project Name",
      "description": "Description",
      "type": "project"
    }
  ],
  "tasks": [
    {
      "id": 1,
      "title": "Task Title",
      "description": "Description",
      "project_id": 1,
      "project_name": "Project Name",
      "type": "task"
    }
  ]
}
```

---

### Data Management

#### GET `/export`
Export all data.

**Query Parameters:**
- `format` (optional): `json` or `csv`, default `json`

**Response (JSON):**
```json
{
  "projects": [...],
  "tasks": [...],
  "exported_at": "2026-02-25T12:00:00.000Z"
}
```

**Response (CSV):**
```
Project,Description,Status,Completed Tasks,Total Tasks
Project Name,Description,active,5,10
```

#### POST `/backup`
Create database backup.

**Response:**
```json
{
  "success": true,
  "backup": "./backups/backup-1708862400000.db"
}
```

---

### Automation

#### POST `/sync/kiro`
Log activity from Kiro automation.

**Request:**
```json
{
  "project_id": 1,
  "task_id": 5,
  "action": "task_completed",
  "details": "Completed Dark Mode feature"
}
```

#### POST `/webhook/github`
GitHub webhook endpoint (requires signature verification).

**Headers:**
- `X-Hub-Signature-256`: GitHub signature
- `X-GitHub-Event`: Event type (push, deployment_status)

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message"
}
```

**Common Status Codes:**
- `200` - Success
- `401` - Unauthorized (invalid/missing token)
- `404` - Not found
- `500` - Server error

---

## Rate Limiting

No rate limiting currently implemented.

## CORS

CORS is enabled for all origins.

---

**Last Updated:** February 25, 2026
