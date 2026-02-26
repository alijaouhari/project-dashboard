const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Mark remaining tasks as done for Project Dashboard
db.serialize(() => {
  // Get Project Dashboard ID
  db.get('SELECT id FROM projects WHERE name = ?', ['Project Dashboard'], (err, project) => {
    if (err || !project) {
      console.error('Project Dashboard not found');
      db.close();
      return;
    }

    const projectId = project.id;
    console.log(`Found Project Dashboard (ID: ${projectId})`);

    // Tasks to mark as done
    const tasksToComplete = [
      'Task Reordering (drag & drop)',
      'Dark Mode Toggle',
      'Notifications System',
      'Multi-user Support'
    ];

    tasksToComplete.forEach(taskTitle => {
      db.run(
        'UPDATE tasks SET status = ?, completed_at = ? WHERE project_id = ? AND title = ?',
        ['done', new Date().toISOString(), projectId, taskTitle],
        function(err) {
          if (err) {
            console.error(`Error updating task: ${taskTitle}`, err);
          } else if (this.changes > 0) {
            console.log(`✅ Completed: ${taskTitle}`);
          } else {
            console.log(`⚠️  Task not found: ${taskTitle}`);
          }
        }
      );
    });

    // Wait a bit then show final stats
    setTimeout(() => {
      db.get(
        `SELECT 
          COUNT(CASE WHEN status = 'done' THEN 1 END) as completed,
          COUNT(*) as total
        FROM tasks WHERE project_id = ?`,
        [projectId],
        (err, stats) => {
          if (stats) {
            const progress = Math.round((stats.completed / stats.total) * 100);
            console.log(`\n📊 Project Dashboard: ${stats.completed}/${stats.total} tasks (${progress}%)`);
          }
          db.close();
        }
      );
    }, 500);
  });
});
