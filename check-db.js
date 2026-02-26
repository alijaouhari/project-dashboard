const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  console.log('📊 Database Status:\n');
  
  db.get('SELECT COUNT(*) as count FROM projects', (err, row) => {
    if (err) {
      console.log('❌ Error:', err.message);
      return;
    }
    console.log(`Projects: ${row.count}`);
  });
  
  db.get('SELECT COUNT(*) as count FROM tasks', (err, row) => {
    if (err) {
      console.log('❌ Error:', err.message);
      return;
    }
    console.log(`Tasks: ${row.count}`);
  });
  
  db.all('SELECT id, name, status, archived FROM projects', (err, rows) => {
    if (err) {
      console.log('❌ Error:', err.message);
      return;
    }
    console.log('\n📦 Projects:');
    rows.forEach(p => {
      const archived = p.archived ? '📦' : '✅';
      console.log(`  ${archived} ${p.id}. ${p.name} (${p.status})`);
    });
    
    db.close();
  });
});
