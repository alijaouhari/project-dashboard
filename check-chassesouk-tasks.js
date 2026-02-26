const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all(
  `SELECT title, status FROM tasks 
   WHERE project_id = (SELECT id FROM projects WHERE name = 'chasseSouk.ma') 
   ORDER BY status DESC, id`,
  (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('\nchasseSouk.ma Tasks:\n');
      const pending = rows.filter(r => r.status === 'pending');
      const done = rows.filter(r => r.status === 'done');
      
      console.log(`✅ Done (${done.length}):`);
      done.forEach(r => console.log(`  ✓ ${r.title}`));
      
      console.log(`\n⏳ Pending (${pending.length}):`);
      pending.forEach(r => console.log(`  ○ ${r.title}`));
    }
    db.close();
  }
);
