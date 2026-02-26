# Project Dashboard Automation

Automated tools to keep your dashboard in sync with actual work.

## 🤖 Available Automations

### 1. Kiro Auto-Sync
**What:** I call this after completing tasks to update the dashboard
**Usage:**
```bash
node kiro-sync.js "Project Dashboard" "Dark Mode" done
node kiro-sync.js "chasseSouk" "Deploy to Vercel" done
```

### 2. GitHub Webhook
**What:** Auto-updates dashboard when you push code
**Setup:**
1. Add to server.js:
```javascript
const { handleGitHubWebhook } = require('./automation/github-webhook');
app.post('/webhook/github', express.json(), (req, res) => {
  handleGitHubWebhook(req, res, db);
});
```

2. Configure GitHub webhook:
   - URL: `http://84.8.221.172:3000/webhook/github`
   - Content type: `application/json`
   - Secret: Set `GITHUB_WEBHOOK_SECRET` env var
   - Events: Push, Deployment status

3. Commit message format:
```
feat: Add dark mode #task:Dark Mode
fix: Complete authentication #task:Authentication
```

### 3. Deployment Detector
**What:** Checks if projects are deployed and updates URLs
**Usage:**
```bash
# Run manually
node deployment-detector.js

# Or setup cron (every 5 minutes)
*/5 * * * * cd /home/opc/project-dashboard/automation && node deployment-detector.js
```

### 4. AI Commit Analyzer
**What:** Analyzes git commits and suggests task updates
**Usage:**
```bash
node ai-commit-analyzer.js ../chassesouk-ma
node ai-commit-analyzer.js ../agriflow
```

## 📋 Setup Instructions

### Install Dependencies
```bash
cd automation
npm install node-fetch
```

### Make Scripts Executable
```bash
chmod +x kiro-sync.js
chmod +x ai-commit-analyzer.js
```

### Setup Cron Jobs
```bash
crontab -e

# Add these lines:
*/5 * * * * cd /home/opc/project-dashboard/automation && node deployment-detector.js >> /tmp/deployment-detector.log 2>&1
0 * * * * cd /home/opc/project-dashboard/automation && node ai-commit-analyzer.js /path/to/project >> /tmp/ai-analyzer.log 2>&1
```

## 🎯 Automation Workflow

1. **You work on a project** → Make commits
2. **GitHub webhook fires** → Logs activity in dashboard
3. **Commit mentions task** → Auto-completes task
4. **You deploy** → Deployment detector updates URL
5. **AI analyzer runs** → Suggests more updates
6. **I complete work** → I run kiro-sync to update

## 🔐 Security

- All scripts use JWT authentication
- GitHub webhook verifies signature
- Password stored in script (change in production)
- API only accessible from your network

## 💡 Tips

- Use consistent task naming in commits
- Run AI analyzer before starting work to see what's tracked
- Check deployment detector logs to verify URL updates
- Customize project mappings in each script

## 🚀 Future Enhancements

- Slack/Discord notifications
- Automatic task creation from TODO comments
- Integration with Jira/Linear
- Voice commands via Telegram bot
- Weekly progress reports via email
