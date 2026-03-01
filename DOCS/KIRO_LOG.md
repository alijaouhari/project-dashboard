# Project-Dashboard - Kiro Development Log

## Project Overview
Project Dashboard is a task and project management system with JWT authentication, real-time activity tracking, and GitHub webhook integration.

## API Documentation

Base URL: `http://84.8.221.172:3000/api`

### Authentication
All endpoints (except `/login`) require JWT authentication via `Authorization: Bearer <token>` header.

### Key Endpoints
- **POST `/login`** - Authenticate and get JWT token (password: admin123)
- **GET `/projects`** - List all projects (query: `?archived=true` for archived)
- **GET `/projects/:id`** - Get project details with tasks
- **POST `/projects`** - Create new project
- **PATCH `/projects/:id`** - Update project
- **DELETE `/projects/:id`** - Delete project and tasks
- **POST `/tasks`** - Create task
- **PATCH `/tasks/:id`** - Update task status/details
- **DELETE `/tasks/:id`** - Delete task
- **GET `/activity`** - Recent activity log (query: `?limit=50`)
- **GET `/search`** - Search projects and tasks (query: `?q=term`)
- **GET `/export`** - Export data (query: `?format=json|csv`)
- **POST `/backup`** - Create database backup
- **POST `/sync/kiro`** - Log Kiro automation activity
- **POST `/webhook/github`** - GitHub webhook endpoint

### Error Responses
- `200` - Success
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error

## Database
- **projects.db** (SQLite) - Main database with projects, tasks, and activity tables

## Server Stack
- **server.js** - Node.js Express server
- **api/index.js** - Vercel serverless API handler

## Deployment
- **Production**: https://project-dashboard-aj.vercel.app
- **Platform**: Vercel
- **Login**: admin123

## Project Vault
Sensitive information and credentials stored separately (not in version control).

---
*Documentation consolidated - February 2026*
