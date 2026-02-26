// Add .MA Registrar Platform project
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

async function updateProject(token, projectId, data) {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
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
  
  console.log('📋 Finding .MA Registrar Platform project...');
  const projects = await getProjects(token);
  const maRegistrar = projects.find(p => p.name.includes('MA Registrar'));
  
  if (!maRegistrar) {
    console.error('❌ Project not found!');
    return;
  }
  
  console.log(`✅ Found: ${maRegistrar.name} (ID: ${maRegistrar.id})\n`);
  
  // Update project description and priority
  console.log('📝 Updating project details...');
  await updateProject(token, maRegistrar.id, {
    description: 'Morocco domain registrar & hosting platform - Complete planning, needs funding & ANRT partnership',
    priority: 1
  });
  console.log('✅ Updated\n');
  
  console.log('📝 Adding additional tasks...\n');
  
  const newTasks = [
    // Business Development
    { title: 'Market Research', description: 'Analyze Morocco domain market, competitors, pricing', status: 'pending' },
    { title: 'Business Plan', description: 'Create detailed business plan with revenue projections', status: 'pending' },
    { title: 'Investor Pitch Deck', description: 'Design pitch deck for funding rounds', status: 'pending' },
    
    // Technical Planning (already done, but adding more detail)
    { title: 'Security Architecture', description: 'Design security layers, DDoS protection, SSL management', status: 'pending' },
    { title: 'Billing System Design', description: 'Design automated billing, invoicing, payment processing', status: 'pending' },
    { title: 'Customer Portal Design', description: 'Design unified dashboard for domains, hosting, billing', status: 'pending' },
    
    // Operations
    { title: 'Support System Setup', description: 'Ticketing system, knowledge base, live chat', status: 'pending' },
    { title: 'Monitoring & Alerting', description: 'Set up uptime monitoring, performance alerts', status: 'pending' },
    { title: 'Backup Strategy', description: 'Design automated backup and disaster recovery', status: 'pending' },
    
    // Marketing & Launch
    { title: 'Brand Identity', description: 'Logo, website design, marketing materials', status: 'pending' },
    { title: 'Marketing Website', description: 'Build marketing site with pricing, features, docs', status: 'pending' },
    { title: 'Launch Campaign', description: 'Plan launch strategy, PR, social media', status: 'pending' }
  ];
  
  for (const task of newTasks) {
    await addTask(token, maRegistrar.id, task.title, task.description, task.status);
    console.log(`   ⏳ ${task.title}`);
  }
  
  console.log(`\n🎉 Added ${newTasks.length} new tasks!`);
  console.log('📊 Total tasks now: ' + (5 + newTasks.length));
}

main().catch(console.error);
