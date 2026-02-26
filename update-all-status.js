const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'projects.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Updating All Project Statuses...\n');

const updates = [
  {
    name: 'chasseSouk.ma',
    status: 'active',
    progress: 45,
    notes: 'MVP deployed to Vercel (https://chassesouk-ma.vercel.app). Features: User auth with email verification, multi-step listing wizard, phone validation (06 XX XX XX XX), firearm/airgun waiver, category-specific forms. Next: Complete listing display grid and search functionality.'
  },
  {
    name: 'Project Dashboard',
    status: 'completed',
    progress: 100,
    notes: 'Fully functional project management dashboard deployed to Oracle server (http://84.8.221.172:3000). Features: JWT auth (password: admin123), task tracking, progress monitoring, search, export, automated backups. All 5 projects populated with tasks.'
  },
  {
    name: 'HammamPOS',
    status: 'completed',
    progress: 100,
    notes: 'Desktop application completed with Electron. Features: Full POS system, inventory management, reporting, receipt printing. Windows installer created. Web version archived - desktop is primary deployment.'
  },
  {
    name: '.MA Registrar Platform',
    status: 'planning',
    progress: 15,
    notes: 'Requirements and system architecture fully documented. Database schema designed. API specifications defined. Awaiting development start. Hosting planned on Oracle server.'
  },
  {
    name: 'AgriFlow',
    status: 'active',
    progress: 35,
    notes: 'Agricultural management platform. Frontend (React) and backend (Node.js/Express) structure in place. Supabase auth system implemented. Database schema defined. Needs completion of core farm management features.'
  }
];

let completed = 0;

updates.forEach((update, index) => {
  db.run(`
    UPDATE projects 
    SET status = ?,
        progress = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE name = ?
  `, [update.status, update.progress, update.notes, update.name], (err) => {
    if (err) {
      console.error(`❌ Error updating ${update.name}:`, err.message);
    } else {
      console.log(`✅ ${update.name} - ${update.status} (${update.progress}%)`);
    }
    
    completed++;
    if (completed === updates.length) {
      console.log('\n📊 All project statuses updated successfully!');
      console.log('\n🌐 Dashboard: http://84.8.221.172:3000');
      console.log('🔐 Password: admin123\n');
      db.close();
    }
  });
});
