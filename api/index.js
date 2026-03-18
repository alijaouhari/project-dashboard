/* Copyright (c) 2026 Project-Dashboard. All rights reserved. Proprietary & Confidential. */

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production-' + Math.random();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database setup
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

    // Safe migrations: Add new columns to tasks
    try { await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS execution_prompt TEXT`); } catch (e) {}
    try { await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_agent TEXT`); } catch (e) {}
    try { await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT`); } catch (e) {}
    try { await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived INTEGER DEFAULT 0`); } catch (e) {}
    try { await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS key TEXT`); } catch (e) {}

    await client.query(`
      CREATE TABLE IF NOT EXISTS execution_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER,
        agent TEXT,
        result TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_execution_logs_task_id ON execution_logs(task_id)`);

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_workflows (
        id SERIAL PRIMARY KEY,
        project_id INTEGER UNIQUE NOT NULL,
        goals TEXT,
        workflow TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Set default password: "admin123"
    const authCheck = await client.query('SELECT COUNT(*) as count FROM auth');
    if (authCheck.rows[0].count === '0') {
      const hash = await bcrypt.hash('admin123', 10);
      await client.query('INSERT INTO auth (password_hash) VALUES ($1)', [hash]);
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    client.release();
  }
}

// Initialize on first request
let initialized = false;
app.use(async (req, res, next) => {
  if (!initialized) {
    await initDatabase();
    initialized = true;
  }
  next();
});

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
    
    res.json(result.rows);
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
    
    res.json({ ...projectResult.rows[0], tasks: tasksResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', authenticate, async (req, res) => {
  try {
    const { name, description, priority, project_url, project_type } = req.body;
    
    const result = await pool.query(
      'INSERT INTO projects (name, description, priority, project_url, project_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, priority || 0, project_url, project_type || 'webapp']
    );
    
    await pool.query(
      'INSERT INTO activity_log (project_id, action, details) VALUES ($1, $2, $3)',
      [result.rows[0].id, 'project_created', name]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, priority, archived, project_url, project_type } = req.body;
    
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

app.post('/api/backup', authenticate, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    
    const projectsResult = await pool.query('SELECT * FROM projects');
    const tasksResult = await pool.query('SELECT * FROM tasks');
    const activityResult = await pool.query('SELECT * FROM activity_log');
    
    const backup = {
      timestamp: new Date().toISOString(),
      projects: projectsResult.rows,
      tasks: tasksResult.rows,
      activity: activityResult.rows
    };
    
    res.json({ success: true, backup: filename, data: backup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ChatGPT Bridge API — static API key auth for machine-to-machine
// ============================================================
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || '';

const bridgeAuth = (req, res, next) => {
  const key = req.headers['x-bridge-key'];
  if (!key || !BRIDGE_API_KEY || key !== BRIDGE_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing X-Bridge-Key' });
  }
  next();
};

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
    res.json({ ok: true, projects: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    res.json({ ok: true, project: { ...projectResult.rows[0], tasks: tasksResult.rows } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.patch('/api/bridge/tasks/:id', bridgeAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description } = req.body;
    if (status) {
      const s = status.toLowerCase();
      if (s === 'done' || s === 'failed') {
        const logCheck = await pool.query('SELECT 1 FROM execution_logs WHERE task_id = $1 LIMIT 1', [id]);
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

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
