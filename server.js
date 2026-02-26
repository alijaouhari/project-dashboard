const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'change-this-in-production-' + Math.random();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT 0,
    project_url TEXT,
    project_type TEXT DEFAULT 'webapp'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    completed_at DATETIME,
    created_by TEXT DEFAULT 'user',
    order_index INTEGER DEFAULT 0,
    estimated_minutes INTEGER DEFAULT 0,
    actual_minutes INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    task_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    actor TEXT DEFAULT 'user',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    password_hash TEXT NOT NULL
  )`);

  // Set default password: "admin123"
  db.get('SELECT COUNT(*) as count FROM auth', (err, row) => {
    if (row.count === 0) {
      bcrypt.hash('admin123', 10, (err, hash) => {
        db.run('INSERT INTO auth (password_hash) VALUES (?)', [hash]);
      });
    }
  });
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
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  db.get('SELECT password_hash FROM auth LIMIT 1', (err, row) => {
    if (err || !row) return res.status(500).json({ error: 'Server error' });
    
    bcrypt.compare(password, row.password_hash, (err, match) => {
      if (match) {
        const token = jwt.sign({ auth: true }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    });
  });
});

app.get('/api/projects', authenticate, (req, res) => {
  const { archived } = req.query;
  const archivedFilter = archived === 'true' ? 1 : 0;
  
  db.all(`
    SELECT p.*, 
      COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
      COUNT(t.id) as total_tasks
    FROM projects p
    LEFT JOIN tasks t ON p.id = t.project_id
    WHERE p.archived = ?
    GROUP BY p.id
    ORDER BY p.priority DESC, p.created_at DESC
  `, [archivedFilter], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/projects/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM projects WHERE id = ?', [id], (err, project) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index, id', [id], (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...project, tasks });
    });
  });
});

app.post('/api/projects', authenticate, (req, res) => {
  const { name, description, priority, project_url, project_type } = req.body;
  
  db.run(
    'INSERT INTO projects (name, description, priority, project_url, project_type) VALUES (?, ?, ?, ?, ?)',
    [name, description, priority || 0, project_url, project_type || 'webapp'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.run(
        'INSERT INTO activity_log (project_id, action, details) VALUES (?, ?, ?)',
        [this.lastID, 'project_created', name]
      );
      
      res.json({ id: this.lastID, name, description, priority, project_url, project_type });
    }
  );
});

app.patch('/api/projects/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { name, description, status, priority, archived, project_url, project_type } = req.body;
  
  db.run(
    'UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), status = COALESCE(?, status), priority = COALESCE(?, priority), archived = COALESCE(?, archived), project_url = COALESCE(?, project_url), project_type = COALESCE(?, project_type), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, status, priority, archived, project_url, project_type, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/tasks', authenticate, (req, res) => {
  const { project_id, title, description, estimated_minutes } = req.body;
  
  db.run(
    'INSERT INTO tasks (project_id, title, description, estimated_minutes) VALUES (?, ?, ?, ?)',
    [project_id, title, description, estimated_minutes || 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.run(
        'INSERT INTO activity_log (project_id, task_id, action, details) VALUES (?, ?, ?, ?)',
        [project_id, this.lastID, 'task_created', title]
      );
      
      res.json({ id: this.lastID, project_id, title, description, status: 'pending' });
    }
  );
});

app.patch('/api/tasks/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { status, title, description } = req.body;
  
  const completed_at = status === 'done' ? new Date().toISOString() : null;
  
  db.run(
    'UPDATE tasks SET status = COALESCE(?, status), title = COALESCE(?, title), description = COALESCE(?, description), completed_at = ? WHERE id = ?',
    [status, title, description, completed_at, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (status) {
        db.get('SELECT project_id, title FROM tasks WHERE id = ?', [id], (err, task) => {
          if (task) {
            db.run(
              'INSERT INTO activity_log (project_id, task_id, action, details) VALUES (?, ?, ?, ?)',
              [task.project_id, id, status === 'done' ? 'task_completed' : 'task_updated', task.title]
            );
          }
        });
      }
      
      res.json({ success: true });
    }
  );
});

app.delete('/api/projects/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  // Delete all tasks first (cascade)
  db.run('DELETE FROM tasks WHERE project_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Delete project
    db.run('DELETE FROM projects WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/activity', authenticate, (req, res) => {
  const { limit = 50 } = req.query;
  
  db.all(`
    SELECT a.*, p.name as project_name
    FROM activity_log a
    LEFT JOIN projects p ON a.project_id = p.id
    ORDER BY a.timestamp DESC
    LIMIT ?
  `, [parseInt(limit)], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/search', authenticate, (req, res) => {
  const { q } = req.query;
  
  if (!q) return res.json({ projects: [], tasks: [] });
  
  const searchTerm = `%${q}%`;
  
  db.all(`
    SELECT id, name, description, 'project' as type
    FROM projects
    WHERE name LIKE ? OR description LIKE ?
    LIMIT 10
  `, [searchTerm, searchTerm], (err, projects) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all(`
      SELECT t.id, t.title, t.description, t.project_id, p.name as project_name, 'task' as type
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.title LIKE ? OR t.description LIKE ?
      LIMIT 20
    `, [searchTerm, searchTerm], (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ projects, tasks });
    });
  });
});

app.get('/api/export', authenticate, (req, res) => {
  const { format = 'json' } = req.query;
  
  db.all(`
    SELECT p.*, 
      COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
      COUNT(t.id) as total_tasks
    FROM projects p
    LEFT JOIN tasks t ON p.id = t.project_id
    GROUP BY p.id
  `, (err, projects) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all('SELECT * FROM tasks ORDER BY project_id, order_index', (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const data = { projects, tasks, exported_at: new Date().toISOString() };
      
      if (format === 'csv') {
        // Simple CSV export
        let csv = 'Project,Description,Status,Completed Tasks,Total Tasks\n';
        projects.forEach(p => {
          csv += `"${p.name}","${p.description || ''}","${p.status}",${p.completed_tasks},${p.total_tasks}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=projects.csv');
        res.send(csv);
      } else {
        res.json(data);
      }
    });
  });
});

app.post('/api/backup', authenticate, (req, res) => {
  const fs = require('fs');
  const backupPath = `./backups/backup-${Date.now()}.db`;
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync('./backups')) {
    fs.mkdirSync('./backups');
  }
  
  // Copy database file
  fs.copyFile('./database.db', backupPath, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, backup: backupPath });
  });
});

app.post('/api/sync/kiro', authenticate, (req, res) => {
  const { project_id, task_id, action, details } = req.body;
  
  db.run(
    'INSERT INTO activity_log (project_id, task_id, action, details, actor) VALUES (?, ?, ?, ?, ?)',
    [project_id, task_id, action, details, 'kiro'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// GitHub Webhook
app.post('/webhook/github', express.raw({ type: 'application/json' }), (req, res) => {
  const { handleGitHubWebhook } = require('./automation/github-webhook');
  handleGitHubWebhook(req, res, db);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Project Dashboard running on http://0.0.0.0:${PORT}`);
});
