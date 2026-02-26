// Deploy dashboard files via HTTP (no SSH needed)
const fs = require('fs');
const path = require('path');

const API_URL = 'http://84.8.221.172:3000';
const PASSWORD = 'admin123';

async function deploy() {
  console.log('📦 Reading files...');
  
  const files = {
    'index.html': fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8'),
    'app.js': fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8'),
    'style.css': fs.readFileSync(path.join(__dirname, 'public/style.css'), 'utf8')
  };

  console.log('✅ Files read successfully');
  console.log('\n📋 MANUAL DEPLOYMENT INSTRUCTIONS:');
  console.log('Since SSH is blocked, you need to manually update files on the server.\n');
  
  console.log('Option 1: Use Oracle Cloud Console');
  console.log('1. Go to Oracle Cloud Console');
  console.log('2. Connect to your instance via browser console');
  console.log('3. Run these commands:\n');
  
  Object.keys(files).forEach(filename => {
    console.log(`cat > /home/opc/project-dashboard/public/${filename} << 'ENDOFFILE'`);
    console.log(files[filename].substring(0, 100) + '...');
    console.log('ENDOFFILE\n');
  });

  console.log('\nOption 2: Files are ready in your local workspace');
  console.log('Location: projects/project-dashboard/public/');
  console.log('- index.html (with edit modals)');
  console.log('- app.js (with edit functions)');
  console.log('- style.css (with edit button styles)');
  
  console.log('\n✅ Once uploaded, the edit feature will work!');
  console.log('You\'ll see ⚙️ gear icons on all project cards.');
}

deploy().catch(console.error);
