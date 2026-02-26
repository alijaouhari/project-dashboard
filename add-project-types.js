const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔧 Adding project types...\n');

db.serialize(() => {
  // Add project_type column
  db.run('ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT "webapp"', (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('❌ Error:', err.message);
    } else {
      console.log('✅ Added project_type column');
    }
  });
  
  // Update existing projects with types
  const types = {
    'HammamPOS': 'desktop',
    'chasseSouk.ma': 'webapp',
    '.MA Registrar Platform': 'webapp',
    'AgriFlow': 'webapp'
  };
  
  for (const [name, type] of Object.entries(types)) {
    db.run('UPDATE projects SET project_type = ? WHERE name = ?', [type, name], (err) => {
      if (err) {
        console.log(`❌ Error updating ${name}:`, err.message);
      } else {
        console.log(`✅ Updated ${name}: ${type}`);
      }
    });
  }
  
  setTimeout(() => {
    db.close(() => {
      console.log('\n✅ Done!');
    });
  }, 1000);
});
