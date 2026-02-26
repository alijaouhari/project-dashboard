/**
 * Deployment Detector
 * Periodically checks if projects are deployed and updates URLs
 * Run as cron job: */5 * * * * node deployment-detector.js
 */

const API_URL = 'http://84.8.221.172:3000/api';
const PASSWORD = 'admin123';

const DEPLOYMENT_CHECKS = {
  'chasseSouk.ma': [
    'https://chassesouk.vercel.app',
    'https://chassesouk.ma'
  ],
  'AgriFlow': [
    'https://agriflow-eta.vercel.app',
    'https://agriflow.vercel.app'
  ]
};

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

async function updateProjectUrl(token, projectId, url) {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ project_url: url })
  });
  return response.json();
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Deployment Detector\n');
  
  const token = await login();
  const projects = await getProjects(token);
  
  for (const [projectName, urls] of Object.entries(DEPLOYMENT_CHECKS)) {
    const project = projects.find(p => p.name === projectName);
    if (!project) continue;
    
    console.log(`📦 Checking ${projectName}...`);
    
    for (const url of urls) {
      const isLive = await checkUrl(url);
      
      if (isLive && project.project_url !== url) {
        console.log(`   ✅ Found deployment: ${url}`);
        await updateProjectUrl(token, project.id, url);
        console.log(`   ✅ Updated project URL`);
        break;
      } else if (isLive) {
        console.log(`   ✅ Already tracking: ${url}`);
        break;
      }
    }
  }
  
  console.log('\n✅ Check complete!');
}

main().catch(console.error);
