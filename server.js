const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production-' + Math.random();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup - detect mode
const DB_MODE = process.env.DATABASE_URL ? 'postgresql' : 'sqlite';
console.log('DB MODE:', DB_MODE);

const { URL } = require('url');
const dbUrl = new URL(process.env.DATABASE_URL);

const pool = new Pool({
  host: dbUrl.hostname,
  port: dbUrl.port,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: {
    rejectUnauthorized: false
  }
});

// API Compatibility Layer: repo_url <-> project_url normalization
// Input: Accept both repo_url and project_url, prefer repo_url
function normalizeProjectInput(body) {
  const normalized = { ...body };
  
  // If repo_url provided, use it as project_url (DB column name)
  if (normalized.repo_url) {
    normalized.project_url = normalized.repo_url;
    delete normalized.repo_url;
  }
  
  return normalized;
}

// Output: Add repo_url alias to project objects
function normalizeProjectOutput(project) {
  if (!project) return project;
  
  // Add repo_url as alias for project_url
  if (project.project_url) {
    project.repo_url = project.project_url;
  }
  
  return project;
}

// Normalize array of projects
function normalizeProjectsOutput(projects) {
  if (!Array.isArray(projects)) return projects;
  return projects.map(normalizeProjectOutput);
}

// Initialize database
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        estimated_hours INTEGER DEFAULT 0,
        actual_hours INTEGER DEFAULT 0,
        archived BOOLEAN DEFAULT false,
        project_url TEXT,
        project_type TEXT DEFAULT 'webapp'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        completed_at TIMESTAMPTZ,
        created_by TEXT DEFAULT 'user',
        order_index INTEGER DEFAULT 0,
        estimated_minutes INTEGER DEFAULT 0,
        actual_minutes INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Safe migrations: Add new columns for AI Dev Team System
    if (DB_MODE === 'postgresql') {
      // PostgreSQL supports ADD COLUMN IF NOT EXISTS
      try {
        await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS execution_prompt TEXT`);
        console.log('DB MIGRATION: tasks.execution_prompt ensured');
      } catch (err) {
        console.log('DB MIGRATION: tasks.execution_prompt already exists');
      }
      
      try {
        await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_agent TEXT`);
        console.log('DB MIGRATION: tasks.assigned_agent ensured');
      } catch (err) {
        console.log('DB MIGRATION: tasks.assigned_agent already exists');
      }
      
      try {
        await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT`);
        console.log('DB MIGRATION: tasks.priority ensured');
      } catch (err) {
        console.log('DB MIGRATION: tasks.priority already exists');
      }
    } else {
      // SQLite: Check each column individually using PRAGMA table_info
      try {
        const tableInfo = await client.query(`PRAGMA table_info(tasks)`);
        const existingColumns = tableInfo.rows.map(row => row.name);
        
        if (!existingColumns.includes('execution_prompt')) {
          await client.query(`ALTER TABLE tasks ADD COLUMN execution_prompt TEXT`);
          console.log('DB MIGRATION: tasks.execution_prompt ensured');
        } else {
          console.log('DB MIGRATION: tasks.execution_prompt already exists');
        }
        
        if (!existingColumns.includes('assigned_agent')) {
          await client.query(`ALTER TABLE tasks ADD COLUMN assigned_agent TEXT`);
          console.log('DB MIGRATION: tasks.assigned_agent ensured');
        } else {
          console.log('DB MIGRATION: tasks.assigned_agent already exists');
        }
        
        if (!existingColumns.includes('priority')) {
          await client.query(`ALTER TABLE tasks ADD COLUMN priority TEXT`);
          console.log('DB MIGRATION: tasks.priority ensured');
        } else {
          console.log('DB MIGRATION: tasks.priority already exists');
        }
      } catch (err) {
        console.error('DB MIGRATION ERROR (SQLite):', err.message);
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        task_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        actor TEXT DEFAULT 'user',
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS auth (
        id SERIAL PRIMARY KEY,
        password_hash TEXT NOT NULL
      )
    `);

    // AI Dev Team System tables
    if (DB_MODE === 'sqlite') {
      // SQLite-compatible syntax
      await client.query(`
        CREATE TABLE IF NOT EXISTS execution_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER,
          agent TEXT,
          result TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_execution_logs_task_id ON execution_logs(task_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS architecture (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER UNIQUE,
          stack TEXT,
          folder_structure TEXT,
          database_schema TEXT,
          deployment TEXT
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_architecture_project_id ON architecture(project_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ideas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          description TEXT,
          project_candidate INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      // PostgreSQL-compatible syntax
      await client.query(`
        CREATE TABLE IF NOT EXISTS execution_logs (
          id SERIAL PRIMARY KEY,
          task_id INTEGER,
          agent TEXT,
          result TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_execution_logs_task_id ON execution_logs(task_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS architecture (
          id SERIAL PRIMARY KEY,
          project_id INTEGER UNIQUE,
          stack TEXT,
          folder_structure TEXT,
          database_schema TEXT,
          deployment TEXT
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_architecture_project_id ON architecture(project_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ideas (
          id SERIAL PRIMARY KEY,
          title TEXT,
          description TEXT,
          project_candidate BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    }

    console.log('DB READY: execution_logs table ensured');
    console.log('DB READY: architecture table ensured');
    console.log('DB READY: ideas table ensured');

    // System Progress table
    if (DB_MODE === 'sqlite') {
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'done',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_progress (
          id SERIAL PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'done',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    }

    console.log('DB READY: system_progress table ensured');

    // Project Workflows table
    if (DB_MODE === 'sqlite') {
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_workflows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER UNIQUE NOT NULL,
          goals TEXT,
          workflow TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_workflows (
          id SERIAL PRIMARY KEY,
          project_id INTEGER UNIQUE NOT NULL,
          goals TEXT,
          workflow TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    }

    console.log('DB READY: project_workflows table ensured');

    // Safe migrations: Add archived and key columns to tasks
    if (DB_MODE === 'postgresql') {
      try {
        await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived INTEGER DEFAULT 0`);
        console.log('DB MIGRATION: tasks.archived ensured');
      } catch (err) {
        console.log('DB MIGRATION: tasks.archived already exists');
      }
      
      try {
        await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS key TEXT`);
        console.log('DB MIGRATION: tasks.key ensured');
      } catch (err) {
        console.log('DB MIGRATION: tasks.key already exists');
      }
    } else {
      try {
        const tableInfo = await client.query(`PRAGMA table_info(tasks)`);
        const existingColumns = tableInfo.rows.map(row => row.name);
        
        if (!existingColumns.includes('archived')) {
          await client.query(`ALTER TABLE tasks ADD COLUMN archived INTEGER DEFAULT 0`);
          console.log('DB MIGRATION: tasks.archived ensured');
        } else {
          console.log('DB MIGRATION: tasks.archived already exists');
        }
        
        if (!existingColumns.includes('key')) {
          await client.query(`ALTER TABLE tasks ADD COLUMN key TEXT`);
          console.log('DB MIGRATION: tasks.key ensured');
        } else {
          console.log('DB MIGRATION: tasks.key already exists');
        }
      } catch (err) {
        console.error('DB MIGRATION ERROR (SQLite):', err.message);
      }
    }

    // Set default password: "admin123"
    const authCheck = await client.query('SELECT COUNT(*) as count FROM auth');
    if (authCheck.rows[0].count === '0') {
      const hash = await bcrypt.hash('admin123', 10);
      await client.query('INSERT INTO auth (password_hash) VALUES ($1)', [hash]);
    }

    console.log('Database initialized successfully');
    
    // Reconcile system progress items
    await reconcileSystemProgress();
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    client.release();
  }
}

// Reconcile System Progress (automatic on startup)
async function reconcileSystemProgress() {
  const items = [
    {
      key: 'DB_TABLES_ADDED',
      title: 'DB tables added for automation',
      description: 'Added execution_logs, architecture, ideas tables with SQLite+Postgres compatibility.'
    },
    {
      key: 'EXECUTION_LOGS_API',
      title: 'Execution logs API implemented',
      description: 'POST /api/execution-logs implemented with JWT auth + validation.'
    },
    {
      key: 'TASK_DONE_GATE',
      title: 'Task completion gated by logs',
      description: 'PATCH task done/failed blocked unless at least one execution log exists.'
    },
    {
      key: 'AUTO_TASK_PACK',
      title: 'Auto task pack generation',
      description: 'On project creation/intake, system creates standardization + launch task pack.'
    },
    {
      key: 'REPO_URL_NORMALIZED',
      title: 'repo_url normalization layer',
      description: 'API accepts repo_url and project_url and returns both (compatibility layer).'
    },
    {
      key: 'ARCHITECTURE_API',
      title: 'Architecture API implemented',
      description: 'GET/PUT /api/projects/:id/architecture implemented with upsert.'
    },
    {
      key: 'LAUNCH_READY_API',
      title: 'Launch readiness evaluation implemented',
      description: 'GET /api/projects/:id/launch-ready plus batch GET /api/launch-ready implemented.'
    },
    {
      key: 'DASHBOARD_AUTO_MONITOR',
      title: 'Dashboard auto-monitoring implemented',
      description: 'UI auto-refreshes readiness every 30s and shows READY/BLOCKED/IN PROGRESS.'
    },
    {
      key: 'CI_ADDED',
      title: 'CI pipeline added',
      description: 'GitHub Actions CI workflow added with smoke test.'
    }
  ];

  try {
    for (const item of items) {
      if (DB_MODE === 'postgresql') {
        // PostgreSQL: INSERT ... ON CONFLICT DO NOTHING
        await pool.query(`
          INSERT INTO system_progress (key, title, description, status)
          VALUES ($1, $2, $3, 'done')
          ON CONFLICT (key) DO NOTHING
        `, [item.key, item.title, item.description]);
      } else {
        // SQLite: INSERT OR IGNORE
        await pool.query(`
          INSERT OR IGNORE INTO system_progress (key, title, description, status)
          VALUES (?, ?, ?, 'done')
        `, [item.key, item.title, item.description]);
      }
    }
    console.log('✅ System progress reconciled: 9 items ensured');
  } catch (err) {
    console.error('System progress reconciliation error:', err);
  }
}

initDatabase();

// Automatic Workflow Generation
async function generateWorkflow(projectId) {
  try {
    console.log(`🔄 Generating workflow for project ${projectId}`);
    
    // Fetch project data
    const projectQuery = DB_MODE === 'postgresql'
      ? 'SELECT * FROM projects WHERE id = $1'
      : 'SELECT * FROM projects WHERE id = ?';
    const projectResult = await pool.query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      console.error(`Project ${projectId} not found`);
      return;
    }
    
    const project = projectResult.rows[0];
    
    // Fetch architecture if exists
    const archQuery = DB_MODE === 'postgresql'
      ? 'SELECT * FROM architecture WHERE project_id = $1'
      : 'SELECT * FROM architecture WHERE project_id = ?';
    const archResult = await pool.query(archQuery, [projectId]);
    const architecture = archResult.rows.length > 0 ? archResult.rows[0] : null;
    
    // Detect project type and stack
    const projectType = project.project_type || 'webapp';
    const stack = architecture?.stack || '';
    const projectName = project.name || '';
    const projectUrl = project.project_url || '';
    
    // Determine workflow template based on project characteristics
    let workflowTemplate = null;
    
    // Next.js + Supabase detection
    if (stack.toLowerCase().includes('next') && stack.toLowerCase().includes('supabase')) {
      workflowTemplate = 'nextjs-supabase';
    }
    // Electron detection
    else if (projectType === 'desktop' || stack.toLowerCase().includes('electron') || projectName.toLowerCase().includes('desktop')) {
      workflowTemplate = 'electron';
    }
    // React/Vite SPA detection
    else if (stack.toLowerCase().includes('react') || stack.toLowerCase().includes('vite') || projectType === 'webapp') {
      workflowTemplate = 'react-spa';
    }
    // Default to generic webapp
    else {
      workflowTemplate = 'generic-webapp';
    }
    
    console.log(`📋 Using workflow template: ${workflowTemplate} for project ${projectId}`);
    
    // Generate workflow based on template
    const workflow = generateWorkflowFromTemplate(workflowTemplate, project, architecture);
    
    // Save workflow to database
    const goalsStr = JSON.stringify(workflow.goals);
    const workflowStr = JSON.stringify(workflow.workflow);
    
    if (DB_MODE === 'postgresql') {
      await pool.query(`
        INSERT INTO project_workflows (project_id, goals, workflow, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (project_id) 
        DO UPDATE SET goals = $2, workflow = $3, updated_at = NOW()
      `, [projectId, goalsStr, workflowStr]);
    } else {
      const checkQuery = 'SELECT id FROM project_workflows WHERE project_id = ?';
      const existing = await pool.query(checkQuery, [projectId]);
      
      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE project_workflows 
          SET goals = ?, workflow = ?, updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ?
        `, [goalsStr, workflowStr, projectId]);
      } else {
        await pool.query(`
          INSERT INTO project_workflows (project_id, goals, workflow)
          VALUES (?, ?, ?)
        `, [projectId, goalsStr, workflowStr]);
      }
    }
    
    // Regenerate tasks from workflow
    await regenerateTasksFromWorkflow(projectId, workflow.workflow);
    
    console.log(`✅ Workflow generated and tasks regenerated for project ${projectId}`);
    
  } catch (err) {
    console.error(`Failed to generate workflow for project ${projectId}:`, err);
  }
}

// Generate workflow from template
function generateWorkflowFromTemplate(template, project, architecture) {
  const projectName = project.name || 'Project';
  
  const workflows = {
    'nextjs-supabase': {
      goals: {
        primary: `Build production-ready Next.js + Supabase application: ${projectName}`,
        secondary: ['Ensure database integrity', 'Validate authentication', 'Deploy to production']
      },
      workflow: {
        tasks: [
          {
            key: 'ARCH_SPEC',
            title: 'Architecture Specification',
            description: 'Define and document Next.js + Supabase architecture',
            execution_prompt: 'Document the architecture: Next.js app structure, Supabase configuration, API routes, database schema, and deployment strategy.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'planning'
          },
          {
            key: 'DB_VERIFY',
            title: 'Database Verification',
            description: 'Verify Supabase database schema and migrations',
            execution_prompt: 'Check Supabase database: verify tables, RLS policies, migrations are applied, and schema matches documentation.',
            assigned_agent: 'developer',
            priority: 'high',
            phase: 'development'
          },
          {
            key: 'AUTH_SMOKE',
            title: 'Auth Smoke Test',
            description: 'Test Supabase authentication flow',
            execution_prompt: 'Test authentication: sign up, sign in, sign out, password reset, and session management work correctly.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'testing'
          },
          {
            key: 'CRITICAL_E2E',
            title: 'Critical Flow E2E',
            description: 'End-to-end test of critical user flows',
            execution_prompt: 'Run E2E tests for critical flows: user registration, main feature usage, data persistence, and error handling.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'testing'
          },
          {
            key: 'BUILD_SMOKE',
            title: 'Production Build Smoke',
            description: 'Verify production build works',
            execution_prompt: 'Build for production and run smoke tests: check build output, verify no errors, test in production mode.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'deployment'
          },
          {
            key: 'CI_VERIFY',
            title: 'CI Pipeline Verification',
            description: 'Ensure CI/CD pipeline is configured and passing',
            execution_prompt: 'Verify CI pipeline: check GitHub Actions workflow, ensure tests run on push, verify deployment automation.',
            assigned_agent: 'developer',
            priority: 'medium',
            phase: 'deployment'
          },
          {
            key: 'LAUNCH_READY',
            title: 'Launch Readiness Validation',
            description: 'Final validation before production launch',
            execution_prompt: 'Validate launch readiness: all tests passing, documentation complete, monitoring configured, backup strategy in place.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'deployment'
          }
        ]
      }
    },
    'react-spa': {
      goals: {
        primary: `Build production-ready React SPA: ${projectName}`,
        secondary: ['Ensure API integration', 'Validate offline support', 'Deploy to production']
      },
      workflow: {
        tasks: [
          {
            key: 'ARCH_SPEC',
            title: 'Architecture Specification',
            description: 'Define and document React SPA architecture',
            execution_prompt: 'Document the architecture: React component structure, state management, API integration, routing, and deployment strategy.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'planning'
          },
          {
            key: 'API_VERIFY',
            title: 'API Integration Verification',
            description: 'Verify API endpoints and data flow',
            execution_prompt: 'Test API integration: verify all endpoints work, error handling is correct, data transforms properly, and loading states work.',
            assigned_agent: 'developer',
            priority: 'high',
            phase: 'development'
          },
          {
            key: 'OFFLINE_VERIFY',
            title: 'Offline Support Verification',
            description: 'Test offline functionality and service worker',
            execution_prompt: 'Verify offline support: test service worker, check caching strategy, ensure graceful degradation when offline.',
            assigned_agent: 'developer',
            priority: 'medium',
            phase: 'development'
          },
          {
            key: 'UI_E2E',
            title: 'UI Critical Flow E2E',
            description: 'End-to-end test of critical UI flows',
            execution_prompt: 'Run E2E tests for critical UI flows: navigation, form submission, data display, and user interactions.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'testing'
          },
          {
            key: 'BUILD_SMOKE',
            title: 'Production Build Smoke',
            description: 'Verify production build works',
            execution_prompt: 'Build for production and run smoke tests: check bundle size, verify no errors, test in production mode.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'deployment'
          },
          {
            key: 'CI_VERIFY',
            title: 'CI Verification',
            description: 'Ensure CI pipeline is configured and passing',
            execution_prompt: 'Verify CI pipeline: check workflow configuration, ensure tests run automatically, verify build succeeds.',
            assigned_agent: 'developer',
            priority: 'medium',
            phase: 'deployment'
          },
          {
            key: 'LAUNCH_READY',
            title: 'Launch Readiness Validation',
            description: 'Final validation before production launch',
            execution_prompt: 'Validate launch readiness: all tests passing, performance optimized, SEO configured, analytics in place.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'deployment'
          }
        ]
      }
    },
    'electron': {
      goals: {
        primary: `Build production-ready Electron desktop app: ${projectName}`,
        secondary: ['Ensure database integrity', 'Validate device integration', 'Package for distribution']
      },
      workflow: {
        tasks: [
          {
            key: 'ARCH_SPEC',
            title: 'Architecture Specification',
            description: 'Define and document Electron app architecture',
            execution_prompt: 'Document the architecture: Electron main/renderer process structure, IPC communication, database setup, and packaging strategy.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'planning'
          },
          {
            key: 'DB_VALIDATE',
            title: 'Database Validation',
            description: 'Verify local database setup and migrations',
            execution_prompt: 'Validate database: check SQLite setup, verify migrations work, test data persistence, ensure backup/restore works.',
            assigned_agent: 'developer',
            priority: 'high',
            phase: 'development'
          },
          {
            key: 'BUILD_VERIFY',
            title: 'Desktop Build Verification',
            description: 'Verify Electron build process',
            execution_prompt: 'Test build process: verify electron-builder configuration, check build output, test app launches correctly.',
            assigned_agent: 'developer',
            priority: 'high',
            phase: 'development'
          },
          {
            key: 'DEVICE_TEST',
            title: 'Printer/Device Integration Test',
            description: 'Test hardware device integration',
            execution_prompt: 'Test device integration: verify printer communication, test receipt printing, check device error handling.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'testing'
          },
          {
            key: 'PACKAGE_SMOKE',
            title: 'Packaging Smoke Test',
            description: 'Test packaged application',
            execution_prompt: 'Test packaged app: create installer, install on clean system, verify all features work, test auto-update.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'deployment'
          },
          {
            key: 'CI_VERIFY',
            title: 'CI Verification',
            description: 'Ensure CI pipeline builds successfully',
            execution_prompt: 'Verify CI pipeline: check build workflow, ensure packaging works in CI, verify artifacts are created.',
            assigned_agent: 'developer',
            priority: 'medium',
            phase: 'deployment'
          },
          {
            key: 'LAUNCH_READY',
            title: 'Launch Readiness Validation',
            description: 'Final validation before distribution',
            execution_prompt: 'Validate launch readiness: all tests passing, installer tested, documentation complete, update mechanism working.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'deployment'
          }
        ]
      }
    },
    'generic-webapp': {
      goals: {
        primary: `Build production-ready web application: ${projectName}`,
        secondary: ['Ensure code quality', 'Validate functionality', 'Deploy to production']
      },
      workflow: {
        tasks: [
          {
            key: 'ARCH_SPEC',
            title: 'Architecture Specification',
            description: 'Define and document application architecture',
            execution_prompt: 'Document the architecture: tech stack, folder structure, database schema, API design, and deployment strategy.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'planning'
          },
          {
            key: 'CORE_IMPL',
            title: 'Core Implementation',
            description: 'Implement core application features',
            execution_prompt: 'Build core features: implement main functionality, set up database, create API endpoints, build UI components.',
            assigned_agent: 'developer',
            priority: 'high',
            phase: 'development'
          },
          {
            key: 'TESTING',
            title: 'Testing & QA',
            description: 'Write and run comprehensive tests',
            execution_prompt: 'Create tests: unit tests for business logic, integration tests for APIs, E2E tests for critical flows.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'testing'
          },
          {
            key: 'BUILD_SMOKE',
            title: 'Production Build Smoke',
            description: 'Verify production build works',
            execution_prompt: 'Build for production and run smoke tests: check build output, verify no errors, test in production mode.',
            assigned_agent: 'tester',
            priority: 'high',
            phase: 'deployment'
          },
          {
            key: 'CI_VERIFY',
            title: 'CI Verification',
            description: 'Ensure CI pipeline is configured',
            execution_prompt: 'Verify CI pipeline: check workflow configuration, ensure tests run automatically, verify deployment works.',
            assigned_agent: 'developer',
            priority: 'medium',
            phase: 'deployment'
          },
          {
            key: 'LAUNCH_READY',
            title: 'Launch Readiness Validation',
            description: 'Final validation before launch',
            execution_prompt: 'Validate launch readiness: all tests passing, documentation complete, monitoring configured, ready for production.',
            assigned_agent: 'planner',
            priority: 'high',
            phase: 'deployment'
          }
        ]
      }
    }
  };
  
  return workflows[template] || workflows['generic-webapp'];
}

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    const result = await pool.query('SELECT password_hash FROM auth LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (match) {
      const token = jwt.sign({ auth: true }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', authenticate, async (req, res) => {
  try {
    const { archived } = req.query;
    const archivedFilter = archived === 'true';
    
    const result = await pool.query(`
      SELECT p.*, 
        COUNT(CASE WHEN t.status = 'done' THEN 1 END)::int as completed_tasks,
        COUNT(t.id)::int as total_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.archived = $1
      GROUP BY p.id
      ORDER BY p.priority DESC, p.created_at DESC
    `, [archivedFilter]);
    
    res.json(normalizeProjectsOutput(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY order_index, id',
      [id]
    );
    
    const project = normalizeProjectOutput(projectResult.rows[0]);
    res.json({ ...project, tasks: tasksResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', authenticate, async (req, res) => {
  try {
    // Normalize input: accept both repo_url and project_url
    const normalized = normalizeProjectInput(req.body);
    const { name, description, priority, project_url, project_type } = normalized;
    
    const result = await pool.query(
      'INSERT INTO projects (name, description, priority, project_url, project_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, priority || 0, project_url, project_type || 'webapp']
    );
    
    const projectId = result.rows[0].id;
    
    // Check if tasks already exist for this project (avoid duplicates on retry)
    const existingTasksCheck = await pool.query(
      DB_MODE === 'postgresql'
        ? 'SELECT COUNT(*) as count FROM tasks WHERE project_id = $1'
        : 'SELECT COUNT(*) as count FROM tasks WHERE project_id = ?',
      [projectId]
    );
    
    const taskCount = parseInt(existingTasksCheck.rows[0].count);
    
    if (taskCount === 0) {
      // Define default task pack
      const defaultTasks = [
        // Standardization Pack
        {
          title: 'Define Architecture Specification',
          description: 'Create/update the architecture record in dashboard (stack, folder_structure, database_schema, deployment).',
          execution_prompt: 'Planner: analyze repo and fill architecture table for this project. Output stack, folder structure, DB schema summary, deployment.',
          assigned_agent: 'planner',
          status: 'todo',
          priority: 'high',
          order_index: 1
        },
        {
          title: 'Standardize Repo Structure',
          description: 'Refactor repository into the unified structure: /app /api /modules /lib /db /tests (unit/integration/e2e).',
          execution_prompt: 'Developer: restructure repo to match template. Do not change architecture without planner task approval. Add folders if missing; move code safely.',
          assigned_agent: 'developer',
          status: 'todo',
          priority: 'high',
          order_index: 2
        },
        {
          title: 'Register Database Schema',
          description: 'Ensure DB schema/migrations are documented and registered in dashboard architecture.database_schema.',
          execution_prompt: 'Developer: extract current DB schema (tables/relations) and store in architecture.database_schema for this project.',
          assigned_agent: 'developer',
          status: 'todo',
          priority: 'medium',
          order_index: 3
        },
        {
          title: 'Configure Tests + CI',
          description: 'Add/confirm Vitest + Playwright + c8 and GitHub Actions workflow to run them.',
          execution_prompt: 'Tester: implement unit/integration/e2e tests and configure CI. Attach results in execution logs.',
          assigned_agent: 'tester',
          status: 'todo',
          priority: 'high',
          order_index: 4
        },
        // Launch Pack
        {
          title: 'Build & Smoke Test',
          description: 'Ensure build passes and basic smoke test works in production-like mode.',
          execution_prompt: 'Tester: run build, run smoke checks, log results.',
          assigned_agent: 'tester',
          status: 'todo',
          priority: 'high',
          order_index: 5
        },
        {
          title: 'E2E Critical Flow',
          description: 'Create and run Playwright E2E test for the primary user flow blocking launch.',
          execution_prompt: 'Tester: write 1 critical-path E2E test, run it, store screenshots on failure, log results.',
          assigned_agent: 'tester',
          status: 'todo',
          priority: 'high',
          order_index: 6
        }
      ];
      
      // Insert all default tasks
      for (const task of defaultTasks) {
        const insertQuery = DB_MODE === 'postgresql'
          ? 'INSERT INTO tasks (project_id, title, description, execution_prompt, assigned_agent, status, priority, order_index, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
          : 'INSERT INTO tasks (project_id, title, description, execution_prompt, assigned_agent, status, priority, order_index, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        await pool.query(insertQuery, [
          projectId,
          task.title,
          task.description,
          task.execution_prompt,
          task.assigned_agent,
          task.status,
          task.priority,
          task.order_index,
          'system'
        ]);
      }
      
      // Log task generation to activity_log
      await pool.query(
        DB_MODE === 'postgresql'
          ? 'INSERT INTO activity_log (project_id, action, details, actor) VALUES ($1, $2, $3, $4)'
          : 'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
        [projectId, 'project_created_tasks_generated', `Generated ${defaultTasks.length} default tasks for project`, 'system']
      );
    }
    
    await pool.query(
      DB_MODE === 'postgresql'
        ? 'INSERT INTO activity_log (project_id, action, details) VALUES ($1, $2, $3)'
        : 'INSERT INTO activity_log (project_id, action, details) VALUES (?, ?, ?)',
      [projectId, 'project_created', name]
    );
    
    // Automatically generate workflow based on project metadata
    // Run asynchronously to not block response
    setImmediate(() => generateWorkflow(projectId));
    
    res.json(normalizeProjectOutput(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    // Normalize input: accept both repo_url and project_url
    const normalized = normalizeProjectInput(req.body);
    const { name, description, status, priority, archived, project_url, project_type } = normalized;
    
    await pool.query(
      `UPDATE projects SET 
        name = COALESCE($1, name), 
        description = COALESCE($2, description), 
        status = COALESCE($3, status), 
        priority = COALESCE($4, priority), 
        archived = COALESCE($5, archived), 
        project_url = COALESCE($6, project_url), 
        project_type = COALESCE($7, project_type), 
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $8`,
      [name, description, status, priority, archived, project_url, project_type, id]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const { project_id, title, description, estimated_minutes } = req.body;
    
    const result = await pool.query(
      'INSERT INTO tasks (project_id, title, description, estimated_minutes) VALUES ($1, $2, $3, $4) RETURNING *',
      [project_id, title, description, estimated_minutes || 0]
    );
    
    await pool.query(
      'INSERT INTO activity_log (project_id, task_id, action, details) VALUES ($1, $2, $3, $4)',
      [project_id, result.rows[0].id, 'task_created', title]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description } = req.body;
    
    // Enforce execution_logs requirement for done/failed status
    if (status) {
      const normalizedStatus = status.toLowerCase();
      if (normalizedStatus === 'done' || normalizedStatus === 'failed') {
        // Use DB-specific placeholder syntax (PostgreSQL: $1, SQLite: ?)
        const logCheckQuery = DB_MODE === 'postgresql'
          ? 'SELECT 1 FROM execution_logs WHERE task_id = $1 LIMIT 1'
          : 'SELECT 1 FROM execution_logs WHERE task_id = ? LIMIT 1';
        
        const logCheck = await pool.query(logCheckQuery, [id]);
        
        if (logCheck.rows.length === 0) {
          return res.status(409).json({
            error: 'TASK_LOG_REQUIRED',
            message: 'Cannot mark task done/failed without at least one execution log.'
          });
        }
      }
    }
    
    const completed_at = status === 'done' ? new Date().toISOString() : null;
    
    await pool.query(
      'UPDATE tasks SET status = COALESCE($1, status), title = COALESCE($2, title), description = COALESCE($3, description), completed_at = $4 WHERE id = $5',
      [status, title, description, completed_at, id]
    );
    
    if (status) {
      const taskResult = await pool.query('SELECT project_id, title FROM tasks WHERE id = $1', [id]);
      if (taskResult.rows.length > 0) {
        const task = taskResult.rows[0];
        await pool.query(
          'INSERT INTO activity_log (project_id, task_id, action, details) VALUES ($1, $2, $3, $4)',
          [task.project_id, id, status === 'done' ? 'task_completed' : 'task_updated', task.title]
        );
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete all tasks first (cascade should handle this, but being explicit)
    await pool.query('DELETE FROM tasks WHERE project_id = $1', [id]);
    
    // Delete project
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Architecture API endpoints
app.get('/api/projects/:id/architecture', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = DB_MODE === 'postgresql'
      ? 'SELECT * FROM architecture WHERE project_id = $1'
      : 'SELECT * FROM architecture WHERE project_id = ?';
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Architecture not found for this project.'
      });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id/architecture', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { stack, folder_structure, database_schema, deployment } = req.body;
    
    // Validation: at least one field must be present
    if (!stack && !folder_structure && !database_schema && !deployment) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'At least one architecture field is required.'
      });
    }
    
    // Convert objects to JSON strings if needed
    const stackStr = stack ? (typeof stack === 'object' ? JSON.stringify(stack) : stack) : null;
    const folderStr = folder_structure ? (typeof folder_structure === 'object' ? JSON.stringify(folder_structure) : folder_structure) : null;
    const dbSchemaStr = database_schema ? (typeof database_schema === 'object' ? JSON.stringify(database_schema) : database_schema) : null;
    const deploymentStr = deployment ? (typeof deployment === 'object' ? JSON.stringify(deployment) : deployment) : null;
    
    if (DB_MODE === 'postgresql') {
      // PostgreSQL: Use INSERT ... ON CONFLICT ... DO UPDATE (UPSERT)
      const upsertQuery = `
        INSERT INTO architecture (project_id, stack, folder_structure, database_schema, deployment)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (project_id) 
        DO UPDATE SET
          stack = COALESCE($2, architecture.stack),
          folder_structure = COALESCE($3, architecture.folder_structure),
          database_schema = COALESCE($4, architecture.database_schema),
          deployment = COALESCE($5, architecture.deployment)
        RETURNING *
      `;
      
      const result = await pool.query(upsertQuery, [id, stackStr, folderStr, dbSchemaStr, deploymentStr]);
      
      // Log to activity_log
      await pool.query(
        'INSERT INTO activity_log (project_id, action, details, actor) VALUES ($1, $2, $3, $4)',
        [id, 'architecture_upsert', `Architecture updated for project ${id}`, 'system']
      );
      
      // Automatically regenerate workflow based on updated architecture
      setImmediate(() => generateWorkflow(id));
      
      res.status(200).json(result.rows[0]);
    } else {
      // SQLite: Check existence, then INSERT or UPDATE
      const checkQuery = 'SELECT id FROM architecture WHERE project_id = ?';
      const existingResult = await pool.query(checkQuery, [id]);
      
      if (existingResult.rows.length > 0) {
        // UPDATE existing record (only update provided fields)
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (stackStr !== null) {
          updates.push(`stack = ?`);
          values.push(stackStr);
        }
        if (folderStr !== null) {
          updates.push(`folder_structure = ?`);
          values.push(folderStr);
        }
        if (dbSchemaStr !== null) {
          updates.push(`database_schema = ?`);
          values.push(dbSchemaStr);
        }
        if (deploymentStr !== null) {
          updates.push(`deployment = ?`);
          values.push(deploymentStr);
        }
        
        values.push(id); // WHERE project_id = ?
        
        const updateQuery = `UPDATE architecture SET ${updates.join(', ')} WHERE project_id = ?`;
        await pool.query(updateQuery, values);
        
        // Fetch updated record
        const result = await pool.query('SELECT * FROM architecture WHERE project_id = ?', [id]);
        
        // Log to activity_log
        await pool.query(
          'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
          [id, 'architecture_upsert', `Architecture updated for project ${id}`, 'system']
        );
        
        // Automatically regenerate workflow based on updated architecture
        setImmediate(() => generateWorkflow(id));
        
        res.status(200).json(result.rows[0]);
      } else {
        // INSERT new record
        const insertQuery = `
          INSERT INTO architecture (project_id, stack, folder_structure, database_schema, deployment)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        await pool.query(insertQuery, [id, stackStr, folderStr, dbSchemaStr, deploymentStr]);
        
        // Fetch inserted record
        const result = await pool.query('SELECT * FROM architecture WHERE project_id = ?', [id]);
        
        // Log to activity_log
        await pool.query(
          'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
          [id, 'architecture_upsert', `Architecture created for project ${id}`, 'system']
        );
        
        // Automatically regenerate workflow based on new architecture
        setImmediate(() => generateWorkflow(id));
        
        res.status(200).json(result.rows[0]);
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Launch Readiness Evaluation - Shared Helper Function
async function computeProjectReadiness(projectId) {
  const checks = {
    launch_tasks_exist: false,
    launch_tasks_done: false,
    launch_tasks_have_logs: false,
    architecture_exists: false
  };
  
  const missing = [];
  
  // Check A: Both launch-pack tasks exist
  const launchTasksQuery = DB_MODE === 'postgresql'
    ? `SELECT id, status FROM tasks WHERE project_id = $1 AND title IN ($2, $3)`
    : `SELECT id, status FROM tasks WHERE project_id = ? AND title IN (?, ?)`;
  
  const launchTasks = await pool.query(launchTasksQuery, [
    projectId,
    'Build & Smoke Test',
    'E2E Critical Flow'
  ]);
  
  if (launchTasks.rows.length === 2) {
    checks.launch_tasks_exist = true;
    
    // Check B: Both tasks status == "done"
    const allDone = launchTasks.rows.every(task => task.status === 'done');
    if (allDone) {
      checks.launch_tasks_done = true;
      
      // Check C: Each task has at least one execution_logs row
      let allHaveLogs = true;
      for (const task of launchTasks.rows) {
        const logCheckQuery = DB_MODE === 'postgresql'
          ? 'SELECT 1 FROM execution_logs WHERE task_id = $1 LIMIT 1'
          : 'SELECT 1 FROM execution_logs WHERE task_id = ? LIMIT 1';
        
        const logCheck = await pool.query(logCheckQuery, [task.id]);
        if (logCheck.rows.length === 0) {
          allHaveLogs = false;
          break;
        }
      }
      
      if (allHaveLogs) {
        checks.launch_tasks_have_logs = true;
      } else {
        missing.push('MISSING_LAUNCH_TASK_LOGS');
      }
    } else {
      missing.push('LAUNCH_TASKS_NOT_DONE');
    }
  } else {
    missing.push('MISSING_LAUNCH_TASKS');
  }
  
  // Check D: Architecture record exists
  const archQuery = DB_MODE === 'postgresql'
    ? 'SELECT 1 FROM architecture WHERE project_id = $1 LIMIT 1'
    : 'SELECT 1 FROM architecture WHERE project_id = ? LIMIT 1';
  
  const archCheck = await pool.query(archQuery, [projectId]);
  if (archCheck.rows.length > 0) {
    checks.architecture_exists = true;
  } else {
    missing.push('MISSING_ARCHITECTURE');
  }
  
  // Determine overall readiness
  const ready = checks.launch_tasks_exist &&
                checks.launch_tasks_done &&
                checks.launch_tasks_have_logs &&
                checks.architecture_exists;
  
  return {
    project_id: parseInt(projectId),
    ready,
    checks,
    missing
  };
}

// Single Project Launch Readiness
app.get('/api/projects/:id/launch-ready', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const readiness = await computeProjectReadiness(id);
    res.status(200).json(readiness);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch Launch Readiness for All Projects
app.get('/api/launch-ready', authenticate, async (req, res) => {
  try {
    // Get all project IDs
    const projectsQuery = DB_MODE === 'postgresql'
      ? 'SELECT id FROM projects ORDER BY id'
      : 'SELECT id FROM projects ORDER BY id';
    
    const projectsResult = await pool.query(projectsQuery);
    
    // Compute readiness for each project
    const projects = [];
    for (const project of projectsResult.rows) {
      const readiness = await computeProjectReadiness(project.id);
      projects.push(readiness);
    }
    
    res.status(200).json({
      ok: true,
      projects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/system/progress', authenticate, async (req, res) => {
  try {
    const query = 'SELECT * FROM system_progress ORDER BY id ASC';
    const result = await pool.query(query);
    res.status(200).json({ ok: true, items: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Workflow Spec Endpoints

// GET /api/projects/:id/workflow
app.get('/api/projects/:id/workflow', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = DB_MODE === 'postgresql'
      ? 'SELECT * FROM project_workflows WHERE project_id = $1'
      : 'SELECT * FROM project_workflows WHERE project_id = ?';
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Workflow not defined for this project.'
      });
    }
    
    const workflow = result.rows[0];
    
    // Parse JSON strings back to objects
    res.status(200).json({
      id: workflow.id,
      project_id: workflow.project_id,
      goals: workflow.goals ? JSON.parse(workflow.goals) : null,
      workflow: workflow.workflow ? JSON.parse(workflow.workflow) : null,
      updated_at: workflow.updated_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id/workflow (UPSERT + Auto Regenerate)
app.put('/api/projects/:id/workflow', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { goals, workflow } = req.body;
    
    // Validation
    if (!goals || !workflow) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'goals and workflow are required.'
      });
    }
    
    // Stringify objects for storage
    const goalsStr = JSON.stringify(goals);
    const workflowStr = JSON.stringify(workflow);
    
    // UPSERT
    if (DB_MODE === 'postgresql') {
      await pool.query(`
        INSERT INTO project_workflows (project_id, goals, workflow, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (project_id) 
        DO UPDATE SET goals = $2, workflow = $3, updated_at = NOW()
      `, [id, goalsStr, workflowStr]);
    } else {
      // SQLite: Check then INSERT/UPDATE
      const checkQuery = 'SELECT id FROM project_workflows WHERE project_id = ?';
      const existing = await pool.query(checkQuery, [id]);
      
      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE project_workflows 
          SET goals = ?, workflow = ?, updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ?
        `, [goalsStr, workflowStr, id]);
      } else {
        await pool.query(`
          INSERT INTO project_workflows (project_id, goals, workflow)
          VALUES (?, ?, ?)
        `, [id, goalsStr, workflowStr]);
      }
    }
    
    // Log activity
    await pool.query(
      DB_MODE === 'postgresql'
        ? 'INSERT INTO activity_log (project_id, action, details, actor) VALUES ($1, $2, $3, $4)'
        : 'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
      [id, 'workflow_updated', 'Workflow spec updated', 'system']
    );
    
    // Automatically regenerate tasks
    await regenerateTasksFromWorkflow(id, workflow);
    
    res.status(200).json({ 
      ok: true, 
      message: 'Workflow saved and tasks regenerated successfully.' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/regenerate-tasks
app.post('/api/projects/:id/regenerate-tasks', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Read workflow spec
    const workflowQuery = DB_MODE === 'postgresql'
      ? 'SELECT workflow FROM project_workflows WHERE project_id = $1'
      : 'SELECT workflow FROM project_workflows WHERE project_id = ?';
    
    const workflowResult = await pool.query(workflowQuery, [id]);
    
    if (workflowResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Workflow not defined for this project.'
      });
    }
    
    const workflow = JSON.parse(workflowResult.rows[0].workflow);
    
    // Regenerate tasks
    await regenerateTasksFromWorkflow(id, workflow);
    
    res.status(200).json({ 
      ok: true, 
      message: 'Tasks regenerated successfully.' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Regenerate tasks from workflow spec
async function regenerateTasksFromWorkflow(projectId, workflow) {
  // Archive existing system-created tasks
  const archiveQuery = DB_MODE === 'postgresql'
    ? 'UPDATE tasks SET archived = 1 WHERE project_id = $1 AND created_by = $2'
    : 'UPDATE tasks SET archived = 1 WHERE project_id = ? AND created_by = ?';
  
  await pool.query(archiveQuery, [projectId, 'system']);
  
  // Generate new tasks from workflow.tasks
  if (!workflow.tasks || !Array.isArray(workflow.tasks)) {
    console.log('No tasks array in workflow, skipping task generation');
    return;
  }
  
  for (let i = 0; i < workflow.tasks.length; i++) {
    const taskTemplate = workflow.tasks[i];
    
    // Check if task with this key already exists (not archived)
    const checkQuery = DB_MODE === 'postgresql'
      ? 'SELECT id FROM tasks WHERE project_id = $1 AND key = $2 AND archived = 0'
      : 'SELECT id FROM tasks WHERE project_id = ? AND key = ? AND archived = 0';
    
    const existing = await pool.query(checkQuery, [projectId, taskTemplate.key]);
    
    if (existing.rows.length > 0) {
      console.log(`Task with key ${taskTemplate.key} already exists, skipping`);
      continue;
    }
    
    // Map priority string to integer for backward compatibility
    const priorityMap = { low: 0, medium: 1, high: 2 };
    const priorityValue = taskTemplate.priority || 'medium';
    
    // Insert new task
    const insertQuery = DB_MODE === 'postgresql'
      ? `INSERT INTO tasks (
          project_id, title, description, execution_prompt, assigned_agent, 
          priority, status, created_by, order_index, key, archived
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
      : `INSERT INTO tasks (
          project_id, title, description, execution_prompt, assigned_agent, 
          priority, status, created_by, order_index, key, archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await pool.query(insertQuery, [
      projectId,
      taskTemplate.title,
      taskTemplate.description || '',
      taskTemplate.execution_prompt || '',
      taskTemplate.assigned_agent || 'developer',
      priorityValue,
      'todo',
      'system',
      i,
      taskTemplate.key,
      0
    ]);
  }
  
  // Log activity
  await pool.query(
    DB_MODE === 'postgresql'
      ? 'INSERT INTO activity_log (project_id, action, details, actor) VALUES ($1, $2, $3, $4)'
      : 'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
    [projectId, 'tasks_regenerated', `Generated ${workflow.tasks.length} tasks from workflow spec`, 'system']
  );
  
  console.log(`✅ Regenerated ${workflow.tasks.length} tasks for project ${projectId}`);
}

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activity', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const result = await pool.query(`
      SELECT a.*, p.name as project_name
      FROM activity_log a
      LEFT JOIN projects p ON a.project_id = p.id
      ORDER BY a.timestamp DESC
      LIMIT $1
    `, [parseInt(limit)]);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) return res.json({ projects: [], tasks: [] });
    
    const searchTerm = `%${q}%`;
    
    const projectsResult = await pool.query(`
      SELECT id, name, description, 'project' as type
      FROM projects
      WHERE name ILIKE $1 OR description ILIKE $1
      LIMIT 10
    `, [searchTerm]);
    
    const tasksResult = await pool.query(`
      SELECT t.id, t.title, t.description, t.project_id, p.name as project_name, 'task' as type
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.title ILIKE $1 OR t.description ILIKE $1
      LIMIT 20
    `, [searchTerm]);
    
    res.json({ projects: projectsResult.rows, tasks: tasksResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export', authenticate, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const projectsResult = await pool.query(`
      SELECT p.*, 
        COUNT(CASE WHEN t.status = 'done' THEN 1 END)::int as completed_tasks,
        COUNT(t.id)::int as total_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
    `);
    
    const tasksResult = await pool.query('SELECT * FROM tasks ORDER BY project_id, order_index');
    
    const data = { 
      projects: projectsResult.rows, 
      tasks: tasksResult.rows, 
      exported_at: new Date().toISOString() 
    };
    
    if (format === 'csv') {
      let csv = 'Project,Description,Status,Completed Tasks,Total Tasks\n';
      projectsResult.rows.forEach(p => {
        csv += `"${p.name}","${p.description || ''}","${p.status}",${p.completed_tasks},${p.total_tasks}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=projects.csv');
      res.send(csv);
    } else {
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/kiro', authenticate, async (req, res) => {
  try {
    const { project_id, task_id, action, details } = req.body;
    
    await pool.query(
      'INSERT INTO activity_log (project_id, task_id, action, details, actor) VALUES ($1, $2, $3, $4, $5)',
      [project_id, task_id, action, details, 'kiro']
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/execution-logs', authenticate, async (req, res) => {
  try {
    const { task_id, agent, result } = req.body;
    
    // Validation
    if (!task_id || typeof task_id !== 'number') {
      return res.status(400).json({ 
        error: 'INVALID_INPUT', 
        message: 'task_id is required and must be a number' 
      });
    }
    
    if (!agent || typeof agent !== 'string' || agent.trim() === '') {
      return res.status(400).json({ 
        error: 'INVALID_INPUT', 
        message: 'agent is required and must be a non-empty string' 
      });
    }
    
    if (result === undefined || result === null) {
      return res.status(400).json({ 
        error: 'INVALID_INPUT', 
        message: 'result is required' 
      });
    }
    
    // Stringify result if it's an object
    const resultString = typeof result === 'object' ? JSON.stringify(result) : String(result);
    
    // Insert into execution_logs
    const insertResult = await pool.query(
      'INSERT INTO execution_logs (task_id, agent, result) VALUES ($1, $2, $3) RETURNING id',
      [task_id, agent.trim(), resultString]
    );
    
    const log_id = insertResult.rows[0].id;
    
    // Optional: Log to activity_log for audit trail
    await pool.query(
      'INSERT INTO activity_log (task_id, action, details, actor) VALUES ($1, $2, $3, $4)',
      [task_id, 'execution_log_created', `Agent: ${agent}`, 'system']
    );
    
    res.status(201).json({ 
      ok: true, 
      log_id, 
      task_id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/intake', authenticate, async (req, res) => {
  try {
    // Normalize input: accept both repo_url and project_url
    const normalized = normalizeProjectInput(req.body);
    const { name, description } = req.body;
    const repo_url = normalized.project_url; // After normalization, it's in project_url
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'name is required and must be a non-empty string'
      });
    }
    
    if (!repo_url || typeof repo_url !== 'string' || repo_url.trim() === '') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'repo_url is required and must be a non-empty string'
      });
    }
    
    // Check if project already exists by repo_url
    const existingProjectQuery = DB_MODE === 'postgresql'
      ? 'SELECT * FROM projects WHERE project_url = $1 LIMIT 1'
      : 'SELECT * FROM projects WHERE project_url = ? LIMIT 1';
    
    const existingProject = await pool.query(existingProjectQuery, [repo_url]);
    
    let project;
    let projectId;
    let isNewProject = false;
    
    if (existingProject.rows.length > 0) {
      // Project exists, use it
      project = existingProject.rows[0];
      projectId = project.id;
      
      // Log intake for existing project
      await pool.query(
        DB_MODE === 'postgresql'
          ? 'INSERT INTO activity_log (project_id, action, details, actor) VALUES ($1, $2, $3, $4)'
          : 'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
        [projectId, 'project_intake_existing', `Intake called for existing project: ${name}`, 'system']
      );
    } else {
      // Create new project
      isNewProject = true;
      const insertProjectQuery = DB_MODE === 'postgresql'
        ? 'INSERT INTO projects (name, description, project_url, project_type) VALUES ($1, $2, $3, $4) RETURNING *'
        : 'INSERT INTO projects (name, description, project_url, project_type) VALUES (?, ?, ?, ?) RETURNING *';
      
      const newProject = await pool.query(insertProjectQuery, [
        name.trim(),
        description || '',
        repo_url.trim(),
        'webapp'
      ]);
      
      project = newProject.rows[0];
      projectId = project.id;
      
      // Log project creation
      await pool.query(
        DB_MODE === 'postgresql'
          ? 'INSERT INTO activity_log (project_id, action, details, actor) VALUES ($1, $2, $3, $4)'
          : 'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
        [projectId, 'project_intake_created', `Project created via intake: ${name}`, 'system']
      );
    }
    
    // Check if tasks already exist for this project
    const existingTasksQuery = DB_MODE === 'postgresql'
      ? 'SELECT COUNT(*) as count FROM tasks WHERE project_id = $1'
      : 'SELECT COUNT(*) as count FROM tasks WHERE project_id = ?';
    
    const existingTasksCheck = await pool.query(existingTasksQuery, [projectId]);
    const taskCount = parseInt(existingTasksCheck.rows[0].count);
    
    if (taskCount === 0) {
      // Generate default tasks
      const defaultTasks = [
        // Standardization Pack
        {
          title: 'Define Architecture Specification',
          description: 'Create/update the architecture record in dashboard (stack, folder_structure, database_schema, deployment).',
          execution_prompt: 'Planner: analyze repo and fill architecture table for this project. Output stack, folder structure, DB schema summary, deployment.',
          assigned_agent: 'planner',
          status: 'todo',
          priority: 'high',
          order_index: 1
        },
        {
          title: 'Standardize Repo Structure',
          description: 'Refactor repository into the unified structure: /app /api /modules /lib /db /tests (unit/integration/e2e).',
          execution_prompt: 'Developer: restructure repo to match template. Do not change architecture without planner task approval. Add folders if missing; move code safely.',
          assigned_agent: 'developer',
          status: 'todo',
          priority: 'high',
          order_index: 2
        },
        {
          title: 'Register Database Schema',
          description: 'Ensure DB schema/migrations are documented and registered in dashboard architecture.database_schema.',
          execution_prompt: 'Developer: extract current DB schema (tables/relations) and store in architecture.database_schema for this project.',
          assigned_agent: 'developer',
          status: 'todo',
          priority: 'medium',
          order_index: 3
        },
        {
          title: 'Configure Tests + CI',
          description: 'Add/confirm Vitest + Playwright + c8 and GitHub Actions workflow to run them.',
          execution_prompt: 'Tester: implement unit/integration/e2e tests and configure CI. Attach results in execution logs.',
          assigned_agent: 'tester',
          status: 'todo',
          priority: 'high',
          order_index: 4
        },
        // Launch Pack
        {
          title: 'Build & Smoke Test',
          description: 'Ensure build passes and basic smoke test works in production-like mode.',
          execution_prompt: 'Tester: run build, run smoke checks, log results.',
          assigned_agent: 'tester',
          status: 'todo',
          priority: 'high',
          order_index: 5
        },
        {
          title: 'E2E Critical Flow',
          description: 'Create and run Playwright E2E test for the primary user flow blocking launch.',
          execution_prompt: 'Tester: write 1 critical-path E2E test, run it, store screenshots on failure, log results.',
          assigned_agent: 'tester',
          status: 'todo',
          priority: 'high',
          order_index: 6
        }
      ];
      
      // Insert all default tasks
      for (const task of defaultTasks) {
        const insertTaskQuery = DB_MODE === 'postgresql'
          ? 'INSERT INTO tasks (project_id, title, description, execution_prompt, assigned_agent, status, priority, order_index, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
          : 'INSERT INTO tasks (project_id, title, description, execution_prompt, assigned_agent, status, priority, order_index, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        await pool.query(insertTaskQuery, [
          projectId,
          task.title,
          task.description,
          task.execution_prompt,
          task.assigned_agent,
          task.status,
          task.priority,
          task.order_index,
          'system'
        ]);
      }
      
      // Log task generation
      await pool.query(
        DB_MODE === 'postgresql'
          ? 'INSERT INTO activity_log (project_id, action, details, actor) VALUES ($1, $2, $3, $4)'
          : 'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
        [projectId, 'project_intake_tasks_generated', `Generated ${defaultTasks.length} default tasks via intake`, 'system']
      );
    }
    
    // Fetch all tasks for this project
    const tasksQuery = DB_MODE === 'postgresql'
      ? 'SELECT * FROM tasks WHERE project_id = $1 ORDER BY order_index ASC, id ASC'
      : 'SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index ASC, id ASC';
    
    const tasksResult = await pool.query(tasksQuery, [projectId]);
    
    res.status(200).json({
      ok: true,
      project: normalizeProjectOutput(project),
      tasks: tasksResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ChatGPT Bridge API — static API key auth for machine-to-machine
// ============================================================
const BRIDGE_API_KEY = (process.env.BRIDGE_API_KEY || '').trim();

const bridgeAuth = (req, res, next) => {
  const key = (req.headers['x-bridge-key'] || '').trim();
  if (!key || !BRIDGE_API_KEY || key !== BRIDGE_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing X-Bridge-Key' });
  }
  next();
};

// GET /api/bridge/projects — list active projects
app.get('/api/bridge/projects', bridgeAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
        COUNT(CASE WHEN t.status = 'done' THEN 1 END)::int as completed_tasks,
        COUNT(t.id)::int as total_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.archived = false
      GROUP BY p.id
      ORDER BY p.priority DESC, p.created_at DESC
    `);
    res.json({ ok: true, projects: normalizeProjectsOutput(result.rows) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bridge/projects/:id — single project with tasks
app.get('/api/bridge/projects/:id', bridgeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE project_id = $1 AND (archived = 0 OR archived IS NULL) ORDER BY order_index, id',
      [id]
    );
    const project = normalizeProjectOutput(projectResult.rows[0]);
    res.json({ ok: true, project: { ...project, tasks: tasksResult.rows } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bridge/tasks — create a task
app.post('/api/bridge/tasks', bridgeAuth, async (req, res) => {
  try {
    const { project_id, title, description, execution_prompt, assigned_agent, priority } = req.body;
    if (!project_id || !title) {
      return res.status(400).json({ error: 'project_id and title are required' });
    }
    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, execution_prompt, assigned_agent, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'chatgpt') RETURNING *`,
      [project_id, title, description || '', execution_prompt || '', assigned_agent || 'chatgpt', priority || 'medium']
    );
    res.status(201).json({ ok: true, task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bridge/tasks/:id — update a task (status, title, description)
app.patch('/api/bridge/tasks/:id', bridgeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description } = req.body;

    // If marking done/failed, enforce execution log gate
    if (status) {
      const s = status.toLowerCase();
      if (s === 'done' || s === 'failed') {
        const logCheck = await pool.query(
          'SELECT 1 FROM execution_logs WHERE task_id = $1 LIMIT 1', [id]
        );
        if (logCheck.rows.length === 0) {
          return res.status(409).json({
            error: 'TASK_LOG_REQUIRED',
            message: 'Cannot mark task done/failed without at least one execution log.'
          });
        }
      }
    }

    const completed_at = status === 'done' ? new Date().toISOString() : null;
    await pool.query(
      'UPDATE tasks SET status = COALESCE($1, status), title = COALESCE($2, title), description = COALESCE($3, description), completed_at = $4 WHERE id = $5',
      [status, title, description, completed_at, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bridge/execution-logs — log an execution
app.post('/api/bridge/execution-logs', bridgeAuth, async (req, res) => {
  try {
    const { task_id, agent, result } = req.body;
    if (!task_id || !agent || result === undefined) {
      return res.status(400).json({ error: 'task_id, agent, and result are required' });
    }
    const resultString = typeof result === 'object' ? JSON.stringify(result) : String(result);
    const insertResult = await pool.query(
      'INSERT INTO execution_logs (task_id, agent, result) VALUES ($1, $2, $3) RETURNING id',
      [task_id, agent.trim(), resultString]
    );
    res.status(201).json({ ok: true, log_id: insertResult.rows[0].id, task_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Project Dashboard running on http://0.0.0.0:${PORT}`);
});
