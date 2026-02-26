const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'projects.db');
const db = new sqlite3.Database(dbPath);

console.log('📦 Adding HammamPOS Web App to Archives...\n');

// First, check if HammamPOS exists
db.get('SELECT * FROM projects WHERE name = ?', ['HammamPOS'], (err, project) => {
  if (err) {
    console.error('❌ Error checking project:', err);
    db.close();
    return;
  }
  
  if (project) {
    // Update existing project to archived
    db.run(`
      UPDATE projects 
      SET status = 'archived',
          notes = 'Desktop application completed with Electron. Web version archived - desktop is primary deployment. Features: POS system, inventory management, reporting, receipt printing, Windows installer.'
      WHERE name = 'HammamPOS'
    `, (err) => {
      if (err) {
        console.error('❌ Error archiving HammamPOS:', err);
      } else {
        console.log('✅ HammamPOS moved to archives');
        console.log('📊 Status: archived');
        console.log('📝 Note: Desktop app is primary deployment\n');
      }
      db.close();
    });
  } else {
    // Create new archived project entry
    db.run(`
      INSERT INTO projects (name, description, url, type, status, priority, progress, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'HammamPOS Web App',
      'Web-based Point of Sale system for Hammam businesses (Archived)',
      '',
      'webapp',
      'archived',
      0,
      100,
      'Web version archived. Desktop Electron application is the primary deployment. Desktop features: Full POS system, inventory management, sales reporting, receipt printing, Windows installer.'
    ], (err) => {
      if (err) {
        console.error('❌ Error creating archived project:', err);
      } else {
        console.log('✅ HammamPOS Web App added to archives');
        console.log('📊 Status: archived');
        console.log('📝 Note: Replaced by desktop application\n');
      }
      db.close();
    });
  }
});
