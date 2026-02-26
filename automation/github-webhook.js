/**
 * GitHub Webhook Handler
 * Automatically updates dashboard when you push code
 * 
 * Setup:
 * 1. Add this to your server.js
 * 2. Configure GitHub webhook: http://84.8.221.172:3000/webhook/github
 * 3. Set secret in environment: GITHUB_WEBHOOK_SECRET
 */

const crypto = require('crypto');

function verifyGitHubSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

async function handleGitHubWebhook(req, res, db) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'your-secret-here';
  
  if (!verifyGitHubSignature(JSON.stringify(req.body), signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = req.headers['x-github-event'];
  const payload = req.body;
  
  console.log(`📦 GitHub ${event} event received`);
  
  if (event === 'push') {
    const repo = payload.repository.name;
    const commits = payload.commits;
    
    // Map repo names to project names
    const projectMap = {
      'hammampos-desktop': 'HammamPOS',
      'chassesouk-ma': 'chasseSouk.ma',
      'agriflow': 'AgriFlow',
      'ma-registrar-platform': '.MA Registrar Platform',
      'project-dashboard': 'Project Dashboard'
    };
    
    const projectName = projectMap[repo];
    if (!projectName) {
      console.log(`⚠️  Unknown repo: ${repo}`);
      return res.json({ message: 'Repo not tracked' });
    }
    
    // Find project
    db.get('SELECT id FROM projects WHERE name = ?', [projectName], (err, project) => {
      if (err || !project) {
        console.log(`❌ Project not found: ${projectName}`);
        return res.json({ message: 'Project not found' });
      }
      
      // Log activity for each commit
      commits.forEach(commit => {
        const message = commit.message.split('\n')[0]; // First line only
        
        db.run(
          'INSERT INTO activity_log (project_id, action, details, actor) VALUES (?, ?, ?, ?)',
          [project.id, 'code_pushed', `${message} (${commit.id.substring(0, 7)})`, 'github']
        );
        
        // Auto-complete tasks mentioned in commit message
        // Format: "fix: Complete Dark Mode implementation #task:Dark Mode"
        const taskMatch = message.match(/#task:(.+?)(?:\s|$)/i);
        if (taskMatch) {
          const taskTitle = taskMatch[1].trim();
          
          db.get(
            'SELECT id FROM tasks WHERE project_id = ? AND title LIKE ?',
            [project.id, `%${taskTitle}%`],
            (err, task) => {
              if (task) {
                db.run('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', 
                  ['done', new Date().toISOString(), task.id]
                );
                console.log(`✅ Auto-completed task: ${taskTitle}`);
              }
            }
          );
        }
      });
      
      console.log(`✅ Logged ${commits.length} commits for ${projectName}`);
    });
    
    return res.json({ message: 'Webhook processed', commits: commits.length });
  }
  
  if (event === 'deployment_status') {
    if (payload.deployment_status.state === 'success') {
      const repo = payload.repository.name;
      const url = payload.deployment_status.target_url;
      
      // Auto-update project URL when deployed
      const projectMap = {
        'chassesouk-ma': 'chasseSouk.ma',
        'agriflow': 'AgriFlow'
      };
      
      const projectName = projectMap[repo];
      if (projectName && url) {
        db.run(
          'UPDATE projects SET project_url = ? WHERE name = ?',
          [url, projectName],
          (err) => {
            if (!err) {
              console.log(`✅ Updated ${projectName} URL: ${url}`);
            }
          }
        );
      }
    }
  }
  
  res.json({ message: 'Webhook received' });
}

module.exports = { handleGitHubWebhook };
