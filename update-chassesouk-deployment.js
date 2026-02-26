const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  // Update project URL
  db.run(
    'UPDATE projects SET project_url = ? WHERE name = ?',
    ['https://chassesouk-ma.vercel.app', 'chasseSouk.ma'],
    (err) => {
      if (err) {
        console.error('Error updating project URL:', err);
      } else {
        console.log('✅ Updated project URL');
      }
    }
  );

  // Mark deployment task as done
  db.run(
    `UPDATE tasks SET status = 'done', completed_at = ? 
     WHERE project_id = (SELECT id FROM projects WHERE name = 'chasseSouk.ma') 
     AND title = 'Deploy to Vercel'`,
    [new Date().toISOString()],
    (err) => {
      if (err) {
        console.error('Error updating task:', err);
      } else {
        console.log('✅ Marked "Deploy to Vercel" as done');
      }
    }
  );

  // Get updated stats
  setTimeout(() => {
    db.get(
      `SELECT 
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed,
        COUNT(*) as total
      FROM tasks WHERE project_id = (SELECT id FROM projects WHERE name = 'chasseSouk.ma')`,
      (err, stats) => {
        if (stats) {
          const progress = Math.round((stats.completed / stats.total) * 100);
          console.log(`\n📊 chasseSouk.ma: ${stats.completed}/${stats.total} tasks (${progress}%)`);
          console.log(`\n🚀 Live at: https://chassesouk-ma.vercel.app`);
        }
        db.close();
      }
    );
  }, 500);
});
