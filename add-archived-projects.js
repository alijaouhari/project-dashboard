const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Add oracle-automation project (archived)
const project = {
  name: 'Oracle Automation',
  description: 'N8N workflow automation for Oracle Cloud infrastructure management and monitoring',
  status: 'archived',
  priority: 0,
  archived: 1,
  project_type: 'api',
  project_url: null
};

const tasks = [
  { title: 'Set up N8N instance', description: 'Install and configure N8N on Oracle server', status: 'done' },
  { title: 'Create Gemini project analyzer workflow', description: 'Build workflow to analyze projects using Gemini AI', status: 'done' },
  { title: 'Implement server monitoring', description: 'Monitor Oracle server health and resources', status: 'done' },
  { title: 'Set up automated backups', description: 'Configure automatic database backups', status: 'done' },
  { title: 'Create deployment automation', description: 'Automate deployment processes', status: 'done' },
  { title: 'Document workflows', description: 'Create documentation for all N8N workflows', status: 'pending' },
  { title: 'Set up alerting system', description: 'Configure alerts for critical events', status: 'pending' }
];

db.serialize(() => {
  db.run(
    'INSERT INTO projects (name, description, status, priority, archived, project_type, project_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [project.name, project.description, project.status, project.priority, project.archived, project.project_type, project.project_url],
    function(err) {
      if (err) {
        console.error('Error creating project:', err);
        return;
      }

      const projectId = this.lastID;
      console.log(`✅ Created project: ${project.name} (ID: ${projectId})`);

      // Add tasks
      const stmt = db.prepare('INSERT INTO tasks (project_id, title, description, status, completed_at) VALUES (?, ?, ?, ?, ?)');
      
      tasks.forEach((task, index) => {
        const completed_at = task.status === 'done' ? new Date().toISOString() : null;
        stmt.run(projectId, task.title, task.description, task.status, completed_at, (err) => {
          if (err) {
            console.error(`Error adding task: ${task.title}`, err);
          } else {
            console.log(`  ✓ Added task: ${task.title} [${task.status}]`);
          }
        });
      });

      stmt.finalize(() => {
        console.log('\n✅ Oracle Automation project added to archives!');
        db.close();
      });
    }
  );
});
