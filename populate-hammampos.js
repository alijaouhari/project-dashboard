// Script to populate HammamPOS project in dashboard
const API_URL = 'http://84.8.221.172:3000/api';

async function login() {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin123' })
  });
  const data = await response.json();
  return data.token;
}

async function getProjects(token) {
  const response = await fetch(`${API_URL}/projects`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

async function addTask(token, projectId, title, description = '', status = 'pending') {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ project_id: projectId, title, description })
  });
  const task = await response.json();
  
  // Mark as done if needed
  if (status === 'done') {
    await fetch(`${API_URL}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'done' })
    });
  }
  
  return task;
}

async function main() {
  console.log('🔐 Logging in...');
  const token = await login();
  
  console.log('📋 Getting projects...');
  const projects = await getProjects(token);
  const hammampos = projects.find(p => p.name.toLowerCase().includes('hammampos'));
  
  if (!hammampos) {
    console.error('❌ HammamPOS project not found!');
    return;
  }
  
  console.log(`✅ Found project: ${hammampos.name} (ID: ${hammampos.id})`);
  console.log('📝 Adding tasks...\n');
  
  const tasks = [
    // DONE TASKS
    { title: '✅ Core POS System', description: 'Point of sale with Arabic interface, ticket sales, cash management', status: 'done' },
    { title: '✅ SQLite Database', description: 'Local database with tickets, expenses, collections, daily summaries', status: 'done' },
    { title: '✅ Excel Integration', description: 'Auto-generate Excel file with 10 worksheets, real-time updates', status: 'done' },
    { title: '✅ Thermal Printer Support', description: '58mm receipt printer integration', status: 'done' },
    { title: '✅ Admin Dashboard', description: 'Business metrics, reports, settings management', status: 'done' },
    { title: '✅ Web Dashboard', description: 'Remote access via localhost:3000 with JWT auth', status: 'done' },
    { title: '✅ Plugin System', description: 'Extensible architecture with hot reloading', status: 'done' },
    { title: '✅ Hardware Licensing', description: 'Machine ID based license activation for premium features', status: 'done' },
    { title: '✅ Professional Installer', description: 'Inno Setup installer with wizard, desktop shortcut', status: 'done' },
    { title: '✅ Delete Database Feature', description: 'Admin can clear all data with triple confirmation', status: 'done' },
    { title: '✅ Windows Compatibility', description: 'Tested on Windows 7/8/10/11, compatibility guide created', status: 'done' },
    { title: '✅ Documentation', description: 'README, Quick Start, Deployment Guide, Windows Compatibility docs', status: 'done' },
    
    // PENDING TASKS
    { title: 'Test on VirtualBox VM', description: 'Create Windows 10 VM, test full installation and features', status: 'pending' },
    { title: 'Build Production Installer', description: 'Run BUILD_FOR_DEPLOYMENT.bat, verify output', status: 'pending' },
    { title: 'Test Installation Process', description: 'Install on clean Windows, verify all files created correctly', status: 'pending' },
    { title: 'Test Premium License Activation', description: 'Generate license key, activate on test machine', status: 'pending' },
    { title: 'Performance Testing', description: 'Test with 1000+ tickets, check speed and stability', status: 'pending' },
    { title: 'Printer Testing', description: 'Test with actual thermal printer, verify receipt format', status: 'pending' },
    { title: 'Cloud Sync Setup', description: 'Configure Google Drive integration, test backup/restore', status: 'pending' },
    { title: 'Multi-user Testing', description: 'Test concurrent access, data integrity', status: 'pending' },
    { title: 'Security Audit', description: 'Review authentication, data encryption, license security', status: 'pending' },
    { title: 'Customer Demo Preparation', description: 'Prepare demo data, sales pitch, pricing structure', status: 'pending' },
    { title: 'First Customer Deployment', description: 'Install at real hammam, train staff, collect feedback', status: 'pending' },
    { title: 'Post-deployment Support', description: 'Monitor first week, fix issues, document common problems', status: 'pending' }
  ];
  
  for (const task of tasks) {
    const created = await addTask(token, hammampos.id, task.title, task.description, task.status);
    const icon = task.status === 'done' ? '✅' : '⏳';
    console.log(`${icon} ${task.title}`);
  }
  
  console.log(`\n🎉 Added ${tasks.length} tasks to HammamPOS project!`);
  console.log(`📊 Status: ${tasks.filter(t => t.status === 'done').length} done, ${tasks.filter(t => t.status === 'pending').length} pending`);
}

main().catch(console.error);
