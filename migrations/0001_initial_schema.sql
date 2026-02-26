-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
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
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
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
);

-- Create activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  task_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  actor TEXT DEFAULT 'user',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
