const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Complete the remaining tasks by ID
const taskIds = [103, 108]; // Task Reordering and Notifications

db.serialize(() => {
  const stmt = db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?');
  
  taskIds.forEach(id => {
    stmt.run('done', new Date().toISOString(), id, function(err) {
      if (err) {
        console.error(`Error updating task ${id}:`, err);
      } else {
        console.log(`✅ Completed task ID: ${id}`);
      }
    });
  });

  stmt.finalize(() => {
    // Get final stats
    db.get('SELECT id FROM projects WHERE name = ?', ['Project Dashboard'], (err, project) => {
      if (project) {
        db.get(
          `SELECT 
            COUNT(CASE WHEN status = 'done' THEN 1 END) as completed,
            COUNT(*) as total
          FROM tasks WHERE project_id = ?`,
          [project.id],
          (err, stats) => {
            if (stats) {
              const progress = Math.round((stats.completed / stats.total) * 100);
              console.log(`\n🎉 Project Dashboard: ${stats.completed}/${stats.total} tasks (${progress}%)`);
              
              if (progress === 100) {
                console.log('✨ PROJECT COMPLETE! ✨');
              }
            }
            db.close();
          }
        );
      } else {
        db.close();
      }
    });
  });
});
