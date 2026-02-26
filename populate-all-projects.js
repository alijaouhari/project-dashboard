// Script to populate all projects in dashboard
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

async function createProject(token, name, description, priority = 1) {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description, priority })
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

const PROJECTS = {
  chassesouk: {
    name: 'chasseSouk.ma',
    description: 'Morocco hunting classifieds marketplace - MVP 95% complete, in testing phase',
    priority: 2,
    tasks: [
      // DONE
      { title: '✅ Requirements & Planning', description: 'Complete documentation, architecture, database schema', status: 'done' },
      { title: '✅ Supabase Setup', description: 'Database with 13 tables, RLS policies, seed data', status: 'done' },
      { title: '✅ Authentication System', description: 'Register, login, profile with phone/city/language', status: 'done' },
      { title: '✅ Listing Management', description: 'Create listings with images, categories, prices, firearm agreement', status: 'done' },
      { title: '✅ Browse & Search', description: 'Filter by category/city, search, listing details, image gallery', status: 'done' },
      { title: '✅ Favorites System', description: 'Add/remove favorites, count tracking, heart icon', status: 'done' },
      { title: '✅ Armurerie Directory', description: 'Licensed gun shops with contact info, filter by city', status: 'done' },
      { title: '✅ Bilingual Support', description: 'Arabic (RTL) + French (LTR) with complete translations', status: 'done' },
      { title: '✅ Legal Compliance', description: 'Firearm agreement, ammunition prohibition, liability disclaimers', status: 'done' },
      { title: '✅ UI/UX', description: 'Responsive design, Tailwind CSS, loading states, error handling', status: 'done' },
      
      // PENDING
      { title: 'Deploy to Vercel', description: 'Connect GitHub, configure env vars, deploy production', status: 'pending' },
      { title: 'Custom Domain Setup', description: 'Configure chassesouk.ma DNS, SSL certificate', status: 'pending' },
      { title: 'Test All Features', description: 'End-to-end testing, fix bugs, verify mobile responsiveness', status: 'pending' },
      { title: 'Add Sample Listings', description: 'Create 20-30 sample listings for demo', status: 'pending' },
      { title: 'Auction System', description: 'Implement polling-based auctions, bid tracking', status: 'pending' },
      { title: 'Notifications', description: 'Email/SMS notifications for bids, messages, favorites', status: 'pending' },
      { title: 'Admin Moderation Panel', description: 'Review listings, approve/reject, ban users', status: 'pending' },
      { title: 'Premium Subscriptions', description: 'Payment integration (CMI), subscription management', status: 'pending' },
      { title: 'User Profile Pages', description: 'Public profiles, seller ratings, listing history', status: 'pending' },
      { title: 'My Listings Management', description: 'Edit/delete own listings, view stats', status: 'pending' }
    ]
  },
  
  maRegistrar: {
    name: '.MA Registrar Platform',
    description: 'Morocco domain registrar & hosting platform - Planning complete, on hold',
    priority: 0,
    tasks: [
      // DONE
      { title: '✅ Requirements Document', description: 'Complete feature specifications, 50+ pages', status: 'done' },
      { title: '✅ System Architecture', description: 'Microservices design, tech stack, infrastructure', status: 'done' },
      { title: '✅ Database Schema', description: 'PostgreSQL schema for domains, hosting, billing', status: 'done' },
      { title: '✅ API Specification', description: 'REST API design, endpoints, authentication', status: 'done' },
      { title: '✅ Action Plan', description: '18-24 week timeline, budget €223k-289k', status: 'done' },
      
      // PENDING
      { title: 'ANRT Partnership', description: 'Negotiate .ma registry access, compliance requirements', status: 'pending' },
      { title: 'Legal Entity Setup', description: 'Register company, get business licenses', status: 'pending' },
      { title: 'Funding/Investment', description: 'Secure €250k+ funding for development', status: 'pending' },
      { title: 'Team Hiring', description: 'Hire 5-8 developers, DevOps, support staff', status: 'pending' },
      { title: 'Infrastructure Setup', description: 'Hetzner/OVH servers, DNS infrastructure', status: 'pending' }
    ]
  },
  
  agriflow: {
    name: 'AgriFlow',
    description: 'Smart farm management system - Tier 1 complete, deployed to production',
    priority: 1,
    tasks: [
      // DONE
      { title: '✅ Task Management', description: 'Create, assign, track tasks with photo proof', status: 'done' },
      { title: '✅ Worker Dashboard', description: 'Mobile-optimized tablet interface', status: 'done' },
      { title: '✅ Manager Dashboard', description: 'Multi-farm management, analytics, user management', status: 'done' },
      { title: '✅ Expense Tracking', description: 'Categorized expenses, multi-currency (MAD/EUR/USD)', status: 'done' },
      { title: '✅ Harvest Tracking', description: 'Record harvests with quality grading, revenue calculation', status: 'done' },
      { title: '✅ Photo Documentation', description: 'Image compression, cloud storage, galleries', status: 'done' },
      { title: '✅ Weather Integration', description: 'Real-time weather, 3-day forecasts per farm', status: 'done' },
      { title: '✅ Multi-Language', description: 'English, French, Arabic with RTL support', status: 'done' },
      { title: '✅ Supabase Backend', description: 'PostgreSQL database, storage, auth, RLS', status: 'done' },
      { title: '✅ Vercel Deployment', description: 'Production at agriflow-eta.vercel.app', status: 'done' },
      
      // PENDING (Tier 2)
      { title: 'Offline Mode', description: 'Work without internet, sync when online', status: 'pending' },
      { title: 'Satellite Imagery', description: 'NDVI analysis, crop health monitoring', status: 'pending' },
      { title: 'Advanced Weather', description: 'Extended forecasts, alerts, recommendations', status: 'pending' },
      { title: 'Reports', description: 'Weekly/monthly PDF reports, email delivery', status: 'pending' },
      { title: 'Irrigation Management', description: 'Schedule irrigation, track water usage', status: 'pending' },
      { title: 'Task Templates', description: 'Reusable task templates, recurring tasks', status: 'pending' },
      { title: 'Equipment Tracking', description: 'Maintenance schedules, fuel tracking', status: 'pending' },
      { title: 'Profitability Dashboard', description: 'Revenue vs expenses, ROI analysis', status: 'pending' },
      { title: 'Inventory Management', description: 'Seeds, fertilizers, tools inventory', status: 'pending' },
      { title: 'Pest & Disease Tracking', description: 'Log issues, treatment history', status: 'pending' }
    ]
  }
};

async function main() {
  console.log('🔐 Logging in...\n');
  const token = await login();
  
  for (const [key, project] of Object.entries(PROJECTS)) {
    console.log(`📦 Creating project: ${project.name}`);
    const created = await createProject(token, project.name, project.description, project.priority);
    console.log(`   ✅ Created (ID: ${created.id})\n`);
    
    console.log(`   📝 Adding ${project.tasks.length} tasks...`);
    for (const task of project.tasks) {
      await addTask(token, created.id, task.title, task.description, task.status);
      const icon = task.status === 'done' ? '✅' : '⏳';
      console.log(`   ${icon} ${task.title}`);
    }
    
    const doneCount = project.tasks.filter(t => t.status === 'done').length;
    const pendingCount = project.tasks.filter(t => t.status === 'pending').length;
    console.log(`   📊 ${doneCount} done, ${pendingCount} pending\n`);
  }
  
  console.log('🎉 All projects populated!');
}

main().catch(console.error);
