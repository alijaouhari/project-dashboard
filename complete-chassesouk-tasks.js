const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Tasks to complete
const tasksToComplete = [
  'User Profile Pages',
  'My Listings Management'
];

db.serialize(() => {
  db.get('SELECT id FROM projects WHERE name = ?', ['chasseSouk.ma'], (err, project) => {
    if (err || !project) {
      console.error('chasseSouk.ma project not found');
      db.close();
      return;
    }

    const projectId = project.id;
    console.log(`Completing tasks for chasseSouk.ma (ID: ${projectId})\n`);

    const stmt = db.prepare(
      'UPDATE tasks SET status = ?, completed_at = ? WHERE project_id = ? AND title = ?'
    );

    tasksToComplete.forEach(taskTitle => {
      stmt.run('done', new Date().toISOString(), projectId, taskTitle, function(err) {
        if (err) {
          console.error(`Error updating task: ${taskTitle}`, err);
        } else if (this.changes > 0) {
          console.log(`✅ Completed: ${taskTitle}`);
        } else {
          console.log(`⚠️  Task not found: ${taskTitle}`);
        }
      });
    });

    stmt.finalize(() => {
      // Get updated stats
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
              console.log(`\n📊 chasseSouk.ma: ${stats.completed}/${stats.total} tasks (${progress}%)`);
            }
            db.close();
          }
        );
      }, 500);
    });
  });
});
