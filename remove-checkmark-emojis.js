const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Remove ✅ and ✓ emojis from task titles
db.serialize(() => {
  db.all('SELECT id, title FROM tasks', (err, tasks) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log('Cleaning up task titles...\n');
    
    let cleaned = 0;
    const stmt = db.prepare('UPDATE tasks SET title = ? WHERE id = ?');
    
    tasks.forEach(task => {
      // Remove various checkmark symbols
      const cleanTitle = task.title
        .replace(/✅/g, '')
        .replace(/✓/g, '')
        .replace(/☑/g, '')
        .replace(/✔/g, '')
        .trim();
      
      if (cleanTitle !== task.title) {
        stmt.run(cleanTitle, task.id, (err) => {
          if (err) {
            console.error(`Error updating task ${task.id}:`, err);
          } else {
            console.log(`✓ Cleaned: "${task.title}" → "${cleanTitle}"`);
            cleaned++;
          }
        });
      }
    });

    stmt.finalize(() => {
      console.log(`\n✓ Cleaned ${cleaned} task titles`);
      db.close();
    });
  });
});
