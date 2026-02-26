# Change SSH Port - Quick Fix Guide

## The Idea
IAM might be blocking port 22 specifically, not SSH itself. If we change SSH to run on a different port (like 2222), it might work!

---

## Step 1: Test if Port 2222 is Open

First, let's check if Oracle allows port 2222:

### A. Add Port 2222 to Oracle Firewall

1. Go to https://cloud.oracle.com
2. **Menu** → **Compute** → **Instances**
3. Click your instance (152.70.210.136)
4. Click **Subnet** link
5. Click **Security Lists** → **Default Security List**
6. Click **Add Ingress Rules**

**Add this rule:**
- Source CIDR: `0.0.0.0/0`
- IP Protocol: TCP
- Destination Port: 2222
- Description: SSH on alternate port

Click **Add Ingress Rules**

---

## Step 2: Change SSH Port on Server

Since we can't SSH in, we'll use the HTTP API to run commands. But wait... we need SSH to change SSH port. This is a chicken-and-egg problem.

**Alternative approach:** Use Oracle Cloud Shell (built into Oracle Console)

### Using Oracle Cloud Shell:

1. Go to https://cloud.oracle.com
2. Click the **Cloud Shell** icon (>_) in the top-right corner
3. Wait for it to start (30 seconds)
4. Run these commands:

```bash
# Connect to your instance (Cloud Shell has access)
ssh -i ~/.ssh/oracle_key opc@152.70.210.136
```

**If Cloud Shell can't connect either**, then we need to use Oracle Console's Serial Console:

### Using Serial Console (if Cloud Shell fails):

1. Go to **Compute** → **Instances**
2. Click your instance
3. Click **Console Connection** in the left menu
4. Click **Create Console Connection**
5. Wait 1 minute
6. Click **Launch Cloud Shell Connection**
7. Login as `opc` (you'll need to set a password first)

---

## Step 3: Change SSH Port (Once Connected)

Once you're connected via Cloud Shell or Serial Console:

```bash
# Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Find this line:
```
#Port 22
```

Change it to:
```
Port 22
Port 2222
```

**Important:** Keep BOTH ports open initially! This way if 2222 doesn't work, you can still use Cloud Shell on port 22.

Save and exit (Ctrl+X, Y, Enter)

```bash
# Restart SSH service
sudo systemctl restart sshd

# Verify SSH is listening on both ports
sudo ss -tlnp | grep ssh
```

You should see:
```
LISTEN  0  128  0.0.0.0:22    0.0.0.0:*  users:(("sshd",pid=...))
LISTEN  0  128  0.0.0.0:2222  0.0.0.0:*  users:(("sshd",pid=...))
```

---

## Step 4: Test Connection from Your Machine

From your local machine:

```bash
# Test port 2222
ssh -i projects/.ssh/oracle_key -p 2222 opc@152.70.210.136
```

**If it works:** 🎉 IAM isn't blocking port 2222!

**If it times out:** IAM is blocking all SSH traffic to that IP, not just port 22.

---

## Step 5: If Port 2222 Works

If port 2222 works, update your deployment scripts:

### Update SSH commands to use port 2222:

```bash
# Deploy files
scp -i projects/.ssh/oracle_key -P 2222 public/index.html opc@152.70.210.136:~/project-dashboard/public/
scp -i projects/.ssh/oracle_key -P 2222 public/app.js opc@152.70.210.136:~/project-dashboard/public/
scp -i projects/.ssh/oracle_key -P 2222 public/style.css opc@152.70.210.136:~/project-dashboard/public/

# SSH in
ssh -i projects/.ssh/oracle_key -p 2222 opc@152.70.210.136

# Restart dashboard
ssh -i projects/.ssh/oracle_key -p 2222 opc@152.70.210.136 "pm2 restart project-dashboard"
```

**Note:** Use `-P` (capital P) for `scp` and `-p` (lowercase p) for `ssh`

---

## Step 6: Try Other Ports if 2222 Fails

If 2222 doesn't work, try these ports (add them to Oracle firewall first):

**Common alternate SSH ports:**
- 2200
- 2022
- 8022
- 22000
- 443 (HTTPS port - rarely blocked!)
- 8443

**Port 443 is interesting** because it's the HTTPS port. ISPs almost never block it because it would break all secure websites.

### To try port 443:

1. Add port 443 to Oracle firewall (if not already there)
2. In SSH config, add: `Port 443`
3. Restart SSH: `sudo systemctl restart sshd`
4. Test: `ssh -i projects/.ssh/oracle_key -p 443 opc@152.70.210.136`

---

## Quick Test Script

Run this to test multiple ports at once:

```bash
cd projects

# Test different ports
for port in 22 2222 2200 8022 443 8443; do
  echo "Testing port $port..."
  timeout 5 ssh -i .ssh/oracle_key -p $port -o ConnectTimeout=5 opc@152.70.210.136 "echo 'Port $port works!'" 2>/dev/null && echo "✅ Port $port: SUCCESS" || echo "❌ Port $port: FAILED"
done
```

This will test all ports and show which ones work.

---

## If NO Ports Work

If IAM is blocking ALL ports to that specific IP (152.70.210.136), then:

1. **They're blocking the Oracle Morocco datacenter entirely**
2. **Solution:** Change to different region (France/UK/Germany)
3. **Use the ORACLE_REGION_CHANGE_GUIDE.md**

---

## Probability Assessment

**Port 2222 working:** 40% chance
- Many ISPs only block port 22 specifically
- Worth trying first (5 minutes)

**Port 443 working:** 60% chance
- HTTPS port, rarely blocked
- Best alternative if 2222 fails

**No ports working:** 30% chance
- IAM blocking the entire IP/datacenter
- Need to change region

---

## Summary

**Try this order:**
1. Add port 2222 to Oracle firewall (2 min)
2. Use Cloud Shell to change SSH port (5 min)
3. Test port 2222 from your machine (1 min)
4. If fails, try port 443 (3 min)
5. If all fail, change region (25 min)

**Total time if port change works:** ~10 minutes
**Total time if need region change:** ~35 minutes

---

## Need Help?

Let me know:
- Can you access Oracle Cloud Shell?
- Which ports should we try first?
- Do you want me to create the test script?

---

**Created:** February 26, 2026
**Status:** Ready to test
**Estimated time:** 10 minutes (if port change works)
