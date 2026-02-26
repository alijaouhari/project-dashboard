#!/usr/bin/env node
/**
 * Kiro Auto-Sync Script
 * Automatically updates dashboard when I complete tasks
 * Usage: node kiro-sync.js <project-name> <task-title> [done|pending]
 */

const API_URL = 'http://84.8.221.172:3000/api';
const PASSWORD = 'admin123';

async function login() {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD })
  });
  return (await response.json()).token;
}

async function getProjects(token) {
  const response = await fetch(`${API_URL}/projects`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

async function getProjectTasks(token, projectId) {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

async function updateTask(token, taskId, status) {
  const response = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });
  return response.json();
}

async function logActivity(token, projectId, taskId, action, details) {
  const response = await fetch(`${API_URL}/sync/kiro`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ project_id: projectId, task_id: taskId, action, details })
  });
  return response.json();
}

async function main() {
  const [projectName, taskTitle, status = 'done'] = process.argv.slice(2);
  
  if (!projectName || !taskTitle) {
    console.log('Usage: node kiro-sync.js <project-name> <task-title> [done|pending]');
    console.log('Example: node kiro-sync.js "Project Dashboard" "Dark Mode" done');
    process.exit(1);
  }
  
  console.log('🤖 Kiro Auto-Sync\n');
  console.log(`📦 Project: ${projectName}`);
  console.log(`📝 Task: ${taskTitle}`);
  console.log(`✅ Status: ${status}\n`);
  
  const token = await login();
  const projects = await getProjects(token);
  
  const project = projects.find(p => 
    p.name.toLowerCase().includes(projectName.toLowerCase())
  );
  
  if (!project) {
    console.log('❌ Project not found!');
    console.log('Available projects:', projects.map(p => p.name).join(', '));
    process.exit(1);
  }
  
  console.log(`✅ Found project: ${project.name} (ID: ${project.id})`);
  
  const projectData = await getProjectTasks(token, project.id);
  const task = projectData.tasks.find(t => 
    t.title.toLowerCase().includes(taskTitle.toLowerCase())
  );
  
  if (!task) {
    console.log('❌ Task not found!');
    console.log('Available tasks:', projectData.tasks.map(t => t.title).join(', '));
    process.exit(1);
  }
  
  console.log(`✅ Found task: ${task.title} (ID: ${task.id})`);
  
  if (task.status === status) {
    console.log(`⚠️  Task already marked as ${status}`);
    process.exit(0);
  }
  
  await updateTask(token, task.id, status);
  console.log(`✅ Updated task status to: ${status}`);
  
  await logActivity(
    token,
    project.id,
    task.id,
    status === 'done' ? 'task_completed' : 'task_updated',
    `Kiro auto-sync: ${task.title}`
  );
  console.log('✅ Logged activity');
  
  console.log('\n🎉 Sync complete!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
