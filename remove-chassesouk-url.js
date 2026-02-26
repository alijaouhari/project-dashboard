const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.run('UPDATE projects SET project_url = NULL WHERE name = ?', ['chasseSouk.ma'], (err) => {
  if (err) {
    console.log('❌ Error:', err.message);
  } else {
    console.log('✅ Removed chasseSouk.ma URL');
  }
  db.close();
});
