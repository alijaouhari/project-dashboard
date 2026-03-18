/* Copyright (c) 2026 Project-Dashboard. All rights reserved. Proprietary & Confidential. */

const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');
let currentProjectId = null;
let showArchived = false;

// Screen management
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

// Close modal - MUST be in global scope for inline onclick
window.closeModal = function() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// API calls
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    token = null;
    showScreen('login-screen');
    return null;
  }

  return response.json();
}

// Toggle password visibility
document.getElementById('toggle-password').addEventListener('click', () => {
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleBtn.textContent = '🙈';
  } else {
    passwordInput.type = 'password';
    toggleBtn.textContent = '👁️';
  }
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;

  const data = await apiCall('/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });

  if (data && data.token) {
    token = data.token;
    localStorage.setItem('token', token);
    loadDashboard();
  } else {
    alert('Invalid password');
  }
});

// Load dashboard
async function loadDashboard() {
  showScreen('dashboard-screen');
  const projects = await apiCall(`/projects?archived=${showArchived}`);
  
  if (!projects) return;

  const container = document.getElementById('projects-list');
  container.innerHTML = '';

  if (projects.length === 0) {
    const message = showArchived ? 'No archived projects.' : 'No projects yet. Create your first one!';
    container.innerHTML = `<p class="empty-state">${message}</p>`;
    return;
  }

  projects.forEach(project => {
    const progress = project.total_tasks > 0 
      ? Math.round((project.completed_tasks / project.total_tasks) * 100) 
      : 0;

    const typeIcons = {
      'webapp': '🌐',
      'website': '🌍',
      'desktop': '💻',
      'mobile': '📱',
      'api': '⚡',
      'docs': '📚'
    };
    const typeIcon = typeIcons[project.project_type] || '📦';

    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-project-id', project.id);
    
    // Deployment status badge
    const deploymentBadge = project.project_url 
      ? '<span class="deployment-badge deployed">🟢 Live</span>'
      : '<span class="deployment-badge not-deployed">⚪ Local</span>';
    
    card.innerHTML = `
      <div class="project-header">
        <h3><span class="project-type-icon">${typeIcon}</span> ${project.name}</h3>
        <div class="project-header-icons">
          ${project.project_url ? `<a href="${project.project_url}" target="_blank" class="project-link" onclick="event.stopPropagation()">🔗</a>` : ''}
          <button class="card-edit-btn" onclick="event.stopPropagation(); editProject(${project.id})">⚙️</button>
        </div>
      </div>
      <div class="project-meta">
        ${deploymentBadge}
        <span class="launch-status" data-project-id="${project.id}">⏳ Checking...</span>
      </div>
      <p>${project.description || 'No description'}</p>
      <div class="project-stats">
        <span>${project.completed_tasks}/${project.total_tasks} tasks</span>
        <span class="priority priority-${project.priority}">${['Low', 'Normal', 'High'][project.priority]}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
    `;
    card.onclick = () => loadProject(project.id);
    container.appendChild(card);
  });
}

// Load project detail
async function loadProject(projectId) {
  currentProjectId = projectId;
  const project = await apiCall(`/projects/${projectId}`);
  
  if (!project) return;

  showScreen('project-detail-screen');
  document.getElementById('project-title').textContent = project.name;
  document.getElementById('project-description').textContent = project.description || 'No description';

  // Add edit button to title
  const titleEl = document.getElementById('project-title');
  titleEl.innerHTML = `${project.name} `;
  const editBtn = document.createElement('button');
  editBtn.className = 'title-edit-btn';
  editBtn.textContent = 'Edit Project';
  editBtn.onclick = () => editProject(projectId);
  titleEl.appendChild(editBtn);

  const completedTasks = project.tasks.filter(t => t.status === 'done').length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  document.getElementById('progress-fill').style.width = `${progress}%`;
  document.getElementById('progress-text').textContent = `${completedTasks}/${totalTasks} tasks completed (${progress}%)`;

  const tasksList = document.getElementById('tasks-list');
  tasksList.innerHTML = '';

  if (project.tasks.length === 0) {
    tasksList.innerHTML = '<p class="empty-state">No tasks yet. Add your first task!</p>';
    return;
  }

  project.tasks.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = `task-item ${task.status === 'done' ? 'completed' : ''}`;
    taskEl.setAttribute('data-task-id', task.id);
    taskEl.innerHTML = `
      <input type="checkbox" ${task.status === 'done' ? 'checked' : ''} 
        onchange="toggleTask(${task.id}, this.checked)">
      <div class="task-content">
        <div>
          <div class="task-title">${task.title}</div>
          ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
          ${task.completed_at ? `<div class="task-meta">Completed: ${new Date(task.completed_at).toLocaleString()}</div>` : ''}
        </div>
        <button class="task-edit-btn" onclick="event.stopPropagation(); editTask(${task.id})">Edit</button>
      </div>
    `;
    tasksList.appendChild(taskEl);
  });
}

// Toggle task - MUST be in global scope for inline onclick
window.toggleTask = async function(taskId, checked) {
  await apiCall(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: checked ? 'done' : 'pending' })
  });
  loadProject(currentProjectId);
}

// Add project
document.getElementById('add-project-btn').addEventListener('click', () => {
  document.getElementById('add-project-modal').classList.remove('hidden');
});

document.getElementById('add-project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('project-name').value;
  const description = document.getElementById('project-description').value;
  const priority = parseInt(document.getElementById('project-priority').value);
  const project_url = document.getElementById('project-url').value;
  const project_type = document.getElementById('project-type').value;

  await apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description, priority, project_url, project_type })
  });

  closeModal();
  document.getElementById('add-project-form').reset();
  loadDashboard();
});

// Add task
document.getElementById('add-task-btn').addEventListener('click', () => {
  document.getElementById('add-task-modal').classList.remove('hidden');
});

document.getElementById('add-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-description').value;
  const estimated_minutes = parseInt(document.getElementById('task-estimate').value) || 0;

  await apiCall('/tasks', {
    method: 'POST',
    body: JSON.stringify({ 
      project_id: currentProjectId, 
      title, 
      description, 
      estimated_minutes 
    })
  });

  closeModal();
  document.getElementById('add-task-form').reset();
  loadProject(currentProjectId);
});

// Back button
document.getElementById('back-btn').addEventListener('click', loadDashboard);

// Tab switching
document.getElementById('active-tab').addEventListener('click', () => {
  showArchived = false;
  document.getElementById('active-tab').classList.add('active');
  document.getElementById('archived-tab').classList.remove('active');
  loadDashboard();
});

document.getElementById('archived-tab').addEventListener('click', () => {
  showArchived = true;
  document.getElementById('archived-tab').classList.add('active');
  document.getElementById('active-tab').classList.remove('active');
  loadDashboard();
});

// Logout buttons (multiple on different screens)
document.querySelectorAll('.btn-logout').forEach(btn => {
  btn.addEventListener('click', () => {
    localStorage.removeItem('token');
    token = null;
    showScreen('login-screen');
  });
});

// Initialize
if (token) {
  loadDashboard();
} else {
  showScreen('login-screen');
}

// Activity Feed button
const activityBtn = document.getElementById('activity-btn');
if (activityBtn) {
  activityBtn.addEventListener('click', async () => {
    const activities = await apiCall('/activity?limit=50');
    const container = document.getElementById('activity-feed');
    
    if (activities.length === 0) {
      container.innerHTML = '<p class="empty-state">No activity yet</p>';
    } else {
      let html = '<div class="activity-list">';
      activities.forEach(a => {
        const time = new Date(a.timestamp).toLocaleString();
        const icon = a.actor === 'kiro' ? '🤖' : a.actor === 'github' ? '🐙' : '👤';
        html += `<div class="activity-item">
          <span class="activity-icon">${icon}</span>
          <div class="activity-content">
            <strong>${a.project_name || 'Unknown'}</strong>
            <p>${a.details}</p>
            <span class="activity-time">${time}</span>
          </div>
        </div>`;
      });
      html += '</div>';
      container.innerHTML = html;
    }
    
    document.getElementById('activity-modal').classList.remove('hidden');
  });
}

// Export button
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    const format = confirm('Export as CSV? (Cancel for JSON)') ? 'csv' : 'json';
    const response = await fetch(`${API_URL}/export?format=${format}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (format === 'csv') {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${Date.now()}.csv`;
      a.click();
    } else {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${Date.now()}.json`;
      a.click();
    }
    
    alert('Export complete!');
  });
}

// Backup button
const backupBtn = document.getElementById('backup-btn');
if (backupBtn) {
  backupBtn.addEventListener('click', async () => {
    const result = await apiCall('/backup', { method: 'POST' });
    if (result.success) {
      alert(`Backup created: ${result.backup}`);
    }
  });
}


// Edit Project - MUST be in global scope for inline onclick
window.editProject = function(projectId) {
  apiCall(`/projects/${projectId}`).then(project => {
    if (project) {
      document.getElementById('edit-project-id').value = project.id;
      document.getElementById('edit-project-name').value = project.name;
      document.getElementById('edit-project-description').value = project.description || '';
      document.getElementById('edit-project-url').value = project.project_url || '';
      document.getElementById('edit-project-type').value = project.project_type || 'webapp';
      document.getElementById('edit-project-priority').value = project.priority;
      document.getElementById('edit-project-modal').classList.remove('hidden');
    }
  });
}

document.getElementById('edit-project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('edit-project-id').value;
  const name = document.getElementById('edit-project-name').value;
  const description = document.getElementById('edit-project-description').value;
  const project_url = document.getElementById('edit-project-url').value;
  const project_type = document.getElementById('edit-project-type').value;
  const priority = parseInt(document.getElementById('edit-project-priority').value);

  await apiCall(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, description, project_url, project_type, priority })
  });

  closeModal();
  if (currentProjectId) {
    loadProject(currentProjectId);
  } else {
    loadDashboard();
  }
});

// Archive/Unarchive Project - MUST be in global scope for inline onclick
window.archiveProject = async function() {
  const id = document.getElementById('edit-project-id').value;
  const isArchived = showArchived ? 0 : 1;
  const action = isArchived ? 'archive' : 'unarchive';
  
  if (!confirm(`Are you sure you want to ${action} this project?`)) {
    return;
  }
  
  await apiCall(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: isArchived })
  });

  closeModal();
  loadDashboard();
}

// Delete Project - MUST be in global scope for inline onclick
window.deleteProject = async function() {
  const id = document.getElementById('edit-project-id').value;
  
  if (!confirm('Are you sure you want to delete this project? All tasks will be deleted too.')) {
    return;
  }
  
  await apiCall(`/projects/${id}`, { method: 'DELETE' });
  closeModal();
  loadDashboard();
}

// Edit Task - MUST be in global scope for inline onclick
window.editTask = function(taskId) {
  apiCall(`/projects/${currentProjectId}`).then(project => {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      document.getElementById('edit-task-id').value = task.id;
      document.getElementById('edit-task-title').value = task.title;
      document.getElementById('edit-task-description').value = task.description || '';
      document.getElementById('edit-task-modal').classList.remove('hidden');
    }
  });
}

document.getElementById('edit-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('edit-task-id').value;
  const title = document.getElementById('edit-task-title').value;
  const description = document.getElementById('edit-task-description').value;

  await apiCall(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, description })
  });

  closeModal();
  loadProject(currentProjectId);
});

// Delete Task - MUST be in global scope for inline onclick
window.deleteTask = async function() {
  const id = document.getElementById('edit-task-id').value;
  
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }
  
  await apiCall(`/tasks/${id}`, { method: 'DELETE' });
  closeModal();
  loadProject(currentProjectId);
}

// Search
let searchTimeout;
document.getElementById('search-input').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  
  if (query.length < 2) return;
  
  searchTimeout = setTimeout(async () => {
    const results = await apiCall(`/search?q=${encodeURIComponent(query)}`);
    showSearchResults(results);
  }, 300);
});

function showSearchResults(results) {
  const modal = document.getElementById('search-modal');
  const container = document.getElementById('search-results');
  
  if (results.projects.length === 0 && results.tasks.length === 0) {
    container.innerHTML = '<p class="empty-state">No results found</p>';
  } else {
    let html = '';
    
    if (results.projects.length > 0) {
      html += '<h3>Projects</h3><div class="search-list">';
      results.projects.forEach(p => {
        html += `<div class="search-item" onclick="closeModal(); loadProject(${p.id})">
          <strong>${p.name}</strong>
          <p>${p.description || 'No description'}</p>
        </div>`;
      });
      html += '</div>';
    }
    
    if (results.tasks.length > 0) {
      html += '<h3>Tasks</h3><div class="search-list">';
      results.tasks.forEach(t => {
        html += `<div class="search-item" onclick="closeModal(); loadProject(${t.project_id})">
          <strong>${t.title}</strong>
          <p>${t.project_name} - ${t.description || 'No description'}</p>
        </div>`;
      });
      html += '</div>';
    }
    
    container.innerHTML = html;
  }
  
  modal.classList.remove('hidden');
}

// Automatic Launch Readiness Monitor - Batch Version
async function updateProjectStatuses() {
  const statusInfoEl = document.getElementById('statusRefreshInfo');
  
  // Set refreshing status immediately
  if (statusInfoEl) {
    statusInfoEl.textContent = 'Status: refreshing...';
    statusInfoEl.className = 'status-refresh-info';
  }
  
  try {
    // Create abort controller for 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Single batch API call for all projects with timeout
    let batchResponse;
    try {
      const response = await fetch(`${API_URL}/launch-ready`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        token = null;
        showScreen('login-screen');
        if (statusInfoEl) {
          statusInfoEl.textContent = 'Status: logged out';
          statusInfoEl.className = 'status-refresh-info error';
        }
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      batchResponse = await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Handle timeout or network errors
      const errorMsg = err.name === 'AbortError' 
        ? 'launch-ready request timeout' 
        : err.message;
      
      // Set all badges to ERROR
      const projectCards = document.querySelectorAll('.project-card');
      for (const card of projectCards) {
        const statusEl = card.querySelector('.launch-status');
        if (statusEl) {
          statusEl.innerHTML = '⚠️ ERROR';
          statusEl.className = 'launch-status status-error';
          statusEl.title = errorMsg;
        }
      }
      
      // Update status info
      if (statusInfoEl) {
        statusInfoEl.textContent = `Status: ERROR - ${errorMsg}`;
        statusInfoEl.className = 'status-refresh-info error';
      }
      
      console.error('Failed to fetch batch readiness:', err);
      return;
    }
    
    // Validate response structure
    if (!batchResponse || !batchResponse.ok || !Array.isArray(batchResponse.projects)) {
      const errorMsg = 'Invalid response from launch-ready API';
      
      const projectCards = document.querySelectorAll('.project-card');
      for (const card of projectCards) {
        const statusEl = card.querySelector('.launch-status');
        if (statusEl) {
          statusEl.innerHTML = '⚠️ ERROR';
          statusEl.className = 'launch-status status-error';
          statusEl.title = errorMsg;
        }
      }
      
      if (statusInfoEl) {
        statusInfoEl.textContent = `Status: ERROR - ${errorMsg}`;
        statusInfoEl.className = 'status-refresh-info error';
      }
      
      console.error('Invalid batch readiness response:', batchResponse);
      return;
    }
    
    // Build a map: project_id -> readiness
    const readinessMap = new Map();
    for (const readiness of batchResponse.projects) {
      readinessMap.set(readiness.project_id, readiness);
    }
    
    // Update each project card using the map
    const projectCards = document.querySelectorAll('.project-card');
    
    for (const card of projectCards) {
      const projectId = parseInt(card.getAttribute('data-project-id'));
      const statusEl = card.querySelector('.launch-status');
      
      if (!statusEl) continue;
      
      const readiness = readinessMap.get(projectId);
      
      if (!readiness) {
        statusEl.innerHTML = '⚠️ NO DATA';
        statusEl.className = 'launch-status status-error';
        statusEl.title = 'project missing from batch readiness response';
        continue;
      }
      
      let statusHTML = '';
      let statusClass = '';
      
      // Status mapping driven by backend response
      if (readiness.ready === true) {
        // READY: All checks passed
        statusHTML = '🟢 READY';
        statusClass = 'status-ready';
      } else if (readiness.missing.includes('MISSING_LAUNCH_TASKS')) {
        // BLOCKED: Launch tasks missing
        statusHTML = '🔴 BLOCKED';
        statusClass = 'status-blocked';
      } else if (readiness.missing.includes('MISSING_ARCHITECTURE')) {
        // BLOCKED: Architecture missing
        statusHTML = '🔴 BLOCKED';
        statusClass = 'status-blocked';
      } else if (readiness.missing.includes('MISSING_LAUNCH_TASK_LOGS')) {
        // BLOCKED: Launch task logs missing
        statusHTML = '🔴 BLOCKED';
        statusClass = 'status-blocked';
      } else if (readiness.missing.includes('LAUNCH_TASKS_NOT_DONE')) {
        // IN PROGRESS: Launch tasks exist but not all done
        statusHTML = '🟡 IN PROGRESS';
        statusClass = 'status-in-progress';
      } else {
        // BLOCKED: Default safe state for any other missing requirements
        statusHTML = '🔴 BLOCKED';
        statusClass = 'status-blocked';
      }
      
      statusEl.innerHTML = statusHTML;
      statusEl.className = `launch-status ${statusClass}`;
      statusEl.title = readiness.missing.join(', ') || 'All checks passed';
    }
    
    // Update status info with success timestamp
    if (statusInfoEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      statusInfoEl.textContent = `Status: refreshed ${timeStr}`;
      statusInfoEl.className = 'status-refresh-info success';
    }
    
  } catch (err) {
    // Catch-all for any unexpected errors
    const errorMsg = err.message || 'Unknown error';
    
    const projectCards = document.querySelectorAll('.project-card');
    for (const card of projectCards) {
      const statusEl = card.querySelector('.launch-status');
      if (statusEl) {
        statusEl.innerHTML = '⚠️ ERROR';
        statusEl.className = 'launch-status status-error';
        statusEl.title = errorMsg;
      }
    }
    
    if (statusInfoEl) {
      statusInfoEl.textContent = `Status: ERROR - ${errorMsg}`;
      statusInfoEl.className = 'status-refresh-info error';
    }
    
    console.error('Failed to update project statuses:', err);
  }
}

// Auto-refresh status every 30 seconds
let statusRefreshInterval = null;

async function startStatusMonitoring() {
  // Clear any existing interval
  if (statusRefreshInterval) {
    clearInterval(statusRefreshInterval);
  }
  
  // Update status info immediately
  const statusInfoEl = document.getElementById('statusRefreshInfo');
  if (statusInfoEl) {
    statusInfoEl.textContent = 'Status: starting...';
    statusInfoEl.className = 'status-refresh-info';
  }
  
  // Immediate status update (await it)
  await updateProjectStatuses();
  
  // Set up auto-refresh every 30 seconds
  statusRefreshInterval = setInterval(updateProjectStatuses, 30000);
  
  console.log('✅ Launch readiness monitoring started (auto-refresh every 30s)');
}

function stopStatusMonitoring() {
  if (statusRefreshInterval) {
    clearInterval(statusRefreshInterval);
    statusRefreshInterval = null;
    console.log('⏸️ Launch readiness monitoring stopped');
  }
}

// Load System Progress
async function loadSystemProgress() {
  try {
    const response = await apiCall('/system/progress');
    
    if (!response || !response.ok) {
      console.error('Failed to load system progress');
      return;
    }
    
    const container = document.getElementById('system-progress-list');
    container.innerHTML = '';
    
    if (response.items.length === 0) {
      container.innerHTML = '<p class="empty-state">No system progress items.</p>';
      return;
    }
    
    response.items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'system-progress-item';
      itemEl.innerHTML = `
        <div class="progress-check">✅</div>
        <div class="progress-content">
          <div class="progress-title">${item.title}</div>
          <div class="progress-description">${item.description}</div>
        </div>
      `;
      container.appendChild(itemEl);
    });
    
    console.log(`✅ System progress loaded: ${response.items.length} items`);
  } catch (err) {
    console.error('Failed to load system progress:', err);
  }
}

// Override loadDashboard to start monitoring after projects load
const originalLoadDashboard = loadDashboard;
loadDashboard = async function() {
  await originalLoadDashboard();
  startStatusMonitoring();
  loadSystemProgress();
}

// Stop monitoring when leaving dashboard
const originalShowScreen = showScreen;
showScreen = function(screenId) {
  if (screenId !== 'dashboard-screen') {
    stopStatusMonitoring();
  }
  originalShowScreen(screenId);
}

// Defensive watchdog: ensure monitoring starts even if override chain breaks
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  if (token && localStorage.getItem('token')) {
    // Wait a bit for initial render, then check if dashboard is visible
    setTimeout(() => {
      const dashboardScreen = document.getElementById('dashboard-screen');
      if (dashboardScreen && !dashboardScreen.classList.contains('hidden')) {
        console.log('🔧 Watchdog: Starting status monitoring');
        startStatusMonitoring();
      }
    }, 2000);
  }
});
