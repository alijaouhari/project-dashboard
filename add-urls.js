const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔧 Adding project URLs...\n');

db.serialize(() => {
  // Add project_url column
  db.run('ALTER TABLE projects ADD COLUMN project_url TEXT', (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('❌ Error:', err.message);
    } else {
      console.log('✅ Added project_url column');
    }
  });
  
  // Update existing projects with URLs
  const urls = {
    'HammamPOS': null, // Desktop app, no URL
    'chasseSouk.ma': 'https://chassesouk.ma',
    '.MA Registrar Platform': null, // Not deployed yet
    'AgriFlow': 'https://agriflow-eta.vercel.app'
  };
  
  for (const [name, url] of Object.entries(urls)) {
    if (url) {
      db.run('UPDATE projects SET project_url = ? WHERE name = ?', [url, name], (err) => {
        if (err) {
          console.log(`❌ Error updating ${name}:`, err.message);
        } else {
          console.log(`✅ Updated ${name}: ${url}`);
        }
      });
    }
  }
  
  setTimeout(() => {
    db.close(() => {
      console.log('\n✅ Done!');
    });
  }, 1000);
});
