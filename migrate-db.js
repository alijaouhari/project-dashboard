const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔧 Running database migration...\n');

db.serialize(() => {
  // Add archived column if it doesn't exist
  db.run('ALTER TABLE projects ADD COLUMN archived BOOLEAN DEFAULT 0', (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('❌ Error adding archived column:', err.message);
    } else {
      console.log('✅ Added archived column to projects table');
    }
    
    db.close(() => {
      console.log('\n✅ Migration complete!');
    });
  });
});
