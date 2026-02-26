# Oracle Region Change Guide

## Problem
Your ISP (IAM/Maroc Telecom) is blocking SSH connections to Oracle's Morocco West (Casablanca) datacenter at IP 152.70.210.136. The HTTP API on port 3000 still works, but SSH on port 22 is blocked at the ISP level.

## Solution
Create a new Oracle instance in a different region that IAM doesn't block.

---

## Step 1: Choose New Region

**Recommended regions (closest to Morocco):**
1. **France Central (Paris)** - Best choice, closest to Morocco
2. **UK South (London)** - Good alternative
3. **Germany Central (Frankfurt)** - Also good

**Why these?** Low latency to Morocco, and less likely to be blocked by IAM.

---

## Step 2: Create New Oracle Instance

### A. Login to Oracle Cloud
1. Go to https://cloud.oracle.com
2. Login with your account

### B. Create Compute Instance
1. Click **Menu** (☰) → **Compute** → **Instances**
2. Click **Create Instance**

### C. Configure Instance
**Name:** `project-dashboard-paris` (or your preferred name)

**Placement:**
- **Region:** France Central (Paris) - or your chosen region
- **Availability Domain:** Choose any (AD-1 is fine)

**Image and Shape:**
- **Image:** Oracle Linux 8 (or Ubuntu 22.04 if you prefer)
- **Shape:** VM.Standard.E2.1.Micro (Always Free tier)
  - 1 OCPU
  - 1 GB RAM
  - This is FREE forever

**Networking:**
- **VCN:** Create new VCN (or use existing)
- **Subnet:** Create new public subnet (or use existing)
- **Public IP:** ✅ Assign a public IPv4 address

**Add SSH Keys:**
- ✅ **IMPORTANT:** Use your EXISTING SSH key
- Click "Paste public keys"
- Paste the content of: `projects/.ssh/oracle_key.pub`
- If you don't have the .pub file, generate it:
  ```bash
  ssh-keygen -y -f projects/.ssh/oracle_key > projects/.ssh/oracle_key.pub
  ```

**Boot Volume:**
- Keep defaults (50 GB is fine)

### D. Create Instance
1. Click **Create**
2. Wait 2-3 minutes for provisioning
3. Note the **Public IP Address** (you'll need this)

---

## Step 3: Configure Firewall Rules

### A. VCN Security List
1. Go to **Networking** → **Virtual Cloud Networks**
2. Click your VCN name
3. Click **Security Lists** → **Default Security List**
4. Click **Add Ingress Rules**

**Add these rules:**

**Rule 1: SSH**
- Source CIDR: `0.0.0.0/0`
- IP Protocol: TCP
- Destination Port: 22
- Description: SSH access

**Rule 2: HTTP API**
- Source CIDR: `0.0.0.0/0`
- IP Protocol: TCP
- Destination Port: 3000
- Description: Project Dashboard API

**Rule 3: HTTPS (optional, for future)**
- Source CIDR: `0.0.0.0/0`
- IP Protocol: TCP
- Destination Port: 443
- Description: HTTPS

### B. Instance Firewall (after SSH access)
Once you can SSH in, run:
```bash
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## Step 4: Test SSH Connection

Replace `<NEW_IP>` with your new instance's public IP:

```bash
ssh -i projects/.ssh/oracle_key opc@<NEW_IP>
```

**Expected result:** You should connect successfully!

If it works, you've bypassed the IAM block! 🎉

---

## Step 5: Setup New Instance

Once connected via SSH:

### A. Update System
```bash
sudo yum update -y
```

### B. Install Node.js
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### C. Install PM2
```bash
sudo npm install -g pm2
```

### D. Install SQLite
```bash
sudo yum install -y sqlite
```

### E. Create Project Directory
```bash
mkdir -p ~/project-dashboard/public
```

---

## Step 6: Migrate Data from Old Instance

Since SSH is blocked to the old instance, we'll use the HTTP API to export data:

### A. Export Data via API (from your local machine)
```bash
cd projects/project-dashboard
node -e "
const http = require('http');
const fs = require('fs');

const options = {
  hostname: '152.70.210.136',
  port: 3000,
  path: '/api/export?format=json',
  method: 'GET',
  headers: { 'Authorization': 'Bearer YOUR_TOKEN_HERE' }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('backup-data.json', data);
    console.log('Data exported to backup-data.json');
  });
});

req.on('error', (e) => console.error(e));
req.end();
"
```

**OR** just use curl:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://152.70.210.136:3000/api/export?format=json > backup-data.json
```

### B. Copy Database Directly (if you have it locally)
If you have a recent backup of `dashboard.db`, use that instead.

---

## Step 7: Deploy to New Instance

### A. Copy Files to New Instance
```bash
cd projects/project-dashboard

# Copy application files
scp -i ../. ssh/oracle_key server.js opc@<NEW_IP>:~/project-dashboard/
scp -i ../.ssh/oracle_key package.json opc@<NEW_IP>:~/project-dashboard/
scp -i ../.ssh/oracle_key public/index.html opc@<NEW_IP>:~/project-dashboard/public/
scp -i ../.ssh/oracle_key public/app.js opc@<NEW_IP>:~/project-dashboard/public/
scp -i ../.ssh/oracle_key public/style.css opc@<NEW_IP>:~/project-dashboard/public/

# Copy database (if you have it)
scp -i ../.ssh/oracle_key dashboard.db opc@<NEW_IP>:~/project-dashboard/
```

### B. Install Dependencies on New Instance
```bash
ssh -i projects/.ssh/oracle_key opc@<NEW_IP>
cd ~/project-dashboard
npm install
```

### C. Start Dashboard
```bash
pm2 start server.js --name project-dashboard
pm2 save
pm2 startup
```

### D. Test
```bash
curl http://localhost:3000/api/projects
```

---

## Step 8: Update Local Configuration

Update your local scripts to use the new IP:

```bash
# In your terminal
export ORACLE_IP="<NEW_IP>"
echo "New Oracle IP: $ORACLE_IP"
```

Test the API:
```bash
curl http://<NEW_IP>:3000/api/projects
```

---

## Step 9: Verify Everything Works

1. **SSH Access:** `ssh -i projects/.ssh/oracle_key opc@<NEW_IP>`
2. **API Access:** `curl http://<NEW_IP>:3000/api/projects`
3. **Dashboard UI:** Open `http://<NEW_IP>:3000` in browser
4. **Deploy Edit Feature:** Now you can deploy the edit feature files!

---

## Step 10: Deploy Edit Feature (Finally!)

Now that SSH works:

```bash
cd projects/project-dashboard

# Deploy updated files
scp -i ../.ssh/oracle_key public/index.html opc@<NEW_IP>:~/project-dashboard/public/
scp -i ../.ssh/oracle_key public/app.js opc@<NEW_IP>:~/project-dashboard/public/
scp -i ../.ssh/oracle_key public/style.css opc@<NEW_IP>:~/project-dashboard/public/

# Restart dashboard
ssh -i ../.ssh/oracle_key opc@<NEW_IP> "pm2 restart project-dashboard"
```

**Done!** Your edit feature is now live! 🎉

---

## Optional: Setup Custom Domain

If you have a domain, point it to the new IP:

1. Go to your DNS provider
2. Update A record: `dashboard.yourdomain.com` → `<NEW_IP>`
3. Wait for DNS propagation (5-30 minutes)

---

## Cleanup Old Instance (Later)

Once everything works on the new instance:

1. Go to Oracle Cloud Console
2. **Compute** → **Instances**
3. Find old instance (152.70.210.136)
4. Click **More Actions** → **Terminate**
5. Confirm termination

This frees up your Always Free tier slot.

---

## Summary

**What we're doing:**
1. Creating new Oracle instance in France/UK/Germany (not Morocco)
2. Using same SSH key (no new key needed)
3. Migrating data via HTTP API (since SSH is blocked to old instance)
4. Deploying dashboard to new instance
5. Finally deploying the edit feature that's been waiting!

**Why this works:**
- IAM blocks Oracle Morocco datacenter
- IAM doesn't block Oracle France/UK/Germany datacenters
- Same free tier, just different location
- Slightly higher latency (~20-50ms more), but SSH works!

**Time estimate:**
- Instance creation: 5 minutes
- Setup: 10 minutes
- Data migration: 5 minutes
- Testing: 5 minutes
- **Total: ~25 minutes**

---

## Need Help?

If you get stuck at any step, let me know which step and what error you're seeing.

**Common issues:**
- "Permission denied" → Check SSH key path
- "Connection timeout" → Check VCN security list rules
- "Port already in use" → Kill existing process: `pm2 delete all`
- "Database locked" → Stop PM2: `pm2 stop all`, then restart

---

**Created:** February 26, 2026
**Status:** Ready to execute
**Estimated time:** 25 minutes
