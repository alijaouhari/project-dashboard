const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.get('SELECT id FROM projects WHERE name = ?', ['Project Dashboard'], (err, project) => {
    if (err || !project) {
      console.error('Project Dashboard not found');
      db.close();
      return;
    }

    console.log('Pending tasks for Project Dashboard:');
    console.log('=====================================\n');

    db.all(
      'SELECT id, title, status FROM tasks WHERE project_id = ? AND status = ?',
      [project.id, 'pending'],
      (err, tasks) => {
        if (err) {
          console.error('Error:', err);
        } else if (tasks.length === 0) {
          console.log('✅ No pending tasks! Project is 100% complete!');
        } else {
          tasks.forEach((task, i) => {
            console.log(`${i + 1}. ${task.title} (ID: ${task.id})`);
          });
          console.log(`\nTotal pending: ${tasks.length}`);
        }
        db.close();
      }
    );
  });
});
