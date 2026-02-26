// Add Project Dashboard as a project
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

async function createProject(token, name, description, priority, project_url, project_type) {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description, priority, project_url, project_type })
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
  console.log('🔐 Logging in...\n');
  const token = await login();
  
  console.log('📦 Creating Project Dashboard project...');
  const project = await createProject(
    token,
    'Project Dashboard',
    'Internal project management dashboard - Track all projects, tasks, and progress from any device',
    2, // High priority
    'http://84.8.221.172:3000',
    'webapp'
  );
  console.log(`✅ Created (ID: ${project.id})\n`);
  
  console.log('📝 Adding tasks...\n');
  
  const tasks = [
    // DONE
    { title: '✅ Backend API', description: 'Node.js + Express + SQLite with JWT auth', status: 'done' },
    { title: '✅ Database Schema', description: 'Projects, tasks, activity log, auth tables', status: 'done' },
    { title: '✅ Authentication', description: 'Login with password, JWT tokens, localStorage', status: 'done' },
    { title: '✅ Project Management', description: 'Create, view, update projects with priorities', status: 'done' },
    { title: '✅ Task Management', description: 'Add tasks, mark as done, track completion', status: 'done' },
    { title: '✅ Progress Tracking', description: 'Visual progress bars, completion percentages', status: 'done' },
    { title: '✅ Modern UI Design', description: 'Purple gradient theme, glassmorphism, animations', status: 'done' },
    { title: '✅ Mobile Responsive', description: 'Works on phone, tablet, laptop', status: 'done' },
    { title: '✅ Project Types', description: 'Icons for webapp, desktop, mobile, API, docs', status: 'done' },
    { title: '✅ Deployment Status', description: 'Live/Local badges, project URLs with links', status: 'done' },
    { title: '✅ Archives Tab', description: 'Separate active and archived projects', status: 'done' },
    { title: '✅ Oracle Server Deployment', description: 'Running on 84.8.221.172:3000', status: 'done' },
    { title: '✅ Auto-populate Projects', description: 'Scripts to populate HammamPOS, chasseSouk, AgriFlow, MA Registrar', status: 'done' },
    
    // PENDING
    { title: 'Edit Project Details', description: 'Modal to edit name, description, URL, type, priority', status: 'pending' },
    { title: 'Delete Projects', description: 'Delete projects with confirmation', status: 'pending' },
    { title: 'Edit Tasks', description: 'Edit task title and description', status: 'pending' },
    { title: 'Task Reordering', description: 'Drag and drop to reorder tasks', status: 'pending' },
    { title: 'Activity Feed', description: 'Show recent activity across all projects', status: 'pending' },
    { title: 'Search & Filter', description: 'Search projects and tasks, filter by status', status: 'pending' },
    { title: 'Export Data', description: 'Export projects and tasks to CSV/JSON', status: 'pending' },
    { title: 'Dark Mode', description: 'Toggle between light and dark themes', status: 'pending' },
    { title: 'Notifications', description: 'Browser notifications for task updates', status: 'pending' },
    { title: 'Multi-user Support', description: 'Multiple users with different permissions', status: 'pending' },
    { title: 'API Documentation', description: 'Document all API endpoints', status: 'pending' },
    { title: 'Backup System', description: 'Automated database backups', status: 'pending' }
  ];
  
  for (const task of tasks) {
    await addTask(token, project.id, task.title, task.description, task.status);
    const icon = task.status === 'done' ? '✅' : '⏳';
    console.log(`${icon} ${task.title}`);
  }
  
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  console.log(`\n🎉 Added ${tasks.length} tasks!`);
  console.log(`📊 ${doneCount} done, ${pendingCount} pending`);
}

main().catch(console.error);
