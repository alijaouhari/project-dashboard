#!/usr/bin/env node
/**
 * AI Commit Analyzer
 * Analyzes git commits and suggests task updates
 * Usage: node ai-commit-analyzer.js <project-path>
 */

const { execSync } = require('child_process');
const path = require('path');

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

function getRecentCommits(projectPath, count = 10) {
  try {
    const output = execSync(
      `git -C "${projectPath}" log -${count} --pretty=format:"%H|%s|%an|%ar"`,
      { encoding: 'utf-8' }
    );
    
    return output.split('\n').map(line => {
      const [hash, message, author, date] = line.split('|');
      return { hash: hash.substring(0, 7), message, author, date };
    });
  } catch (err) {
    console.error('❌ Error reading git log:', err.message);
    return [];
  }
}

function analyzeCommits(commits, tasks) {
  const suggestions = [];
  
  // Keywords that indicate task completion
  const completionKeywords = ['complete', 'finish', 'done', 'implement', 'add', 'fix'];
  const wipKeywords = ['wip', 'progress', 'start', 'begin'];
  
  commits.forEach(commit => {
    const msg = commit.message.toLowerCase();
    
    // Check if commit mentions any task
    tasks.forEach(task => {
      const taskWords = task.title.toLowerCase().split(' ');
      const matchCount = taskWords.filter(word => 
        word.length > 3 && msg.includes(word)
      ).length;
      
      if (matchCount >= 2) {
        const isCompletion = completionKeywords.some(kw => msg.includes(kw));
        const isWip = wipKeywords.some(kw => msg.includes(kw));
        
        if (isCompletion && task.status !== 'done') {
          suggestions.push({
            task,
            commit,
            action: 'complete',
            confidence: matchCount >= 3 ? 'high' : 'medium'
          });
        } else if (isWip && task.status === 'pending') {
          suggestions.push({
            task,
            commit,
            action: 'in_progress',
            confidence: 'low'
          });
        }
      }
    });
  });
  
  return suggestions;
}

async function main() {
  const projectPath = process.argv[2];
  
  if (!projectPath) {
    console.log('Usage: node ai-commit-analyzer.js <project-path>');
    console.log('Example: node ai-commit-analyzer.js ../chassesouk-ma');
    process.exit(1);
  }
  
  console.log('🤖 AI Commit Analyzer\n');
  console.log(`📂 Project: ${projectPath}\n`);
  
  const projectName = path.basename(projectPath);
  const commits = getRecentCommits(projectPath);
  
  if (commits.length === 0) {
    console.log('❌ No commits found');
    process.exit(1);
  }
  
  console.log(`📝 Found ${commits.length} recent commits\n`);
  
  const token = await login();
  const projects = await getProjects(token);
  
  const project = projects.find(p => 
    p.name.toLowerCase().includes(projectName.toLowerCase())
  );
  
  if (!project) {
    console.log('❌ Project not found in dashboard');
    process.exit(1);
  }
  
  const projectData = await getProjectTasks(token, project.id);
  const suggestions = analyzeCommits(commits, projectData.tasks);
  
  if (suggestions.length === 0) {
    console.log('✅ No task updates suggested');
    process.exit(0);
  }
  
  console.log(`💡 Found ${suggestions.length} suggestions:\n`);
  
  suggestions.forEach((s, i) => {
    const icon = s.confidence === 'high' ? '🟢' : s.confidence === 'medium' ? '🟡' : '⚪';
    console.log(`${i + 1}. ${icon} ${s.action.toUpperCase()}: ${s.task.title}`);
    console.log(`   Commit: ${s.commit.hash} - ${s.commit.message}`);
    console.log(`   Confidence: ${s.confidence}\n`);
  });
  
  console.log('Run kiro-sync.js to apply these updates manually');
}

main().catch(console.error);
