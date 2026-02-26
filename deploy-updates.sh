#!/bin/bash

echo "🚀 Deploying Project Dashboard Updates"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server details
SERVER="opc@84.8.221.172"
KEY="$HOME/.ssh/oracle_key"
REMOTE_DIR="/home/opc/project-dashboard"

echo -e "${BLUE}📦 Step 1: Uploading updated files...${NC}"
scp -i "$KEY" public/app.js "$SERVER:$REMOTE_DIR/public/"
scp -i "$KEY" public/index.html "$SERVER:$REMOTE_DIR/public/"
scp -i "$KEY" add-archived-projects.js "$SERVER:$REMOTE_DIR/"
scp -i "$KEY" complete-dashboard-tasks.js "$SERVER:$REMOTE_DIR/"
scp -i "$KEY" setup-cloudflare-tunnel.sh "$SERVER:$REMOTE_DIR/"
scp -i "$KEY" cloudflare-tunnel.service "$SERVER:$REMOTE_DIR/"
echo -e "${GREEN}✅ Files uploaded${NC}"
echo ""

echo -e "${BLUE}📊 Step 2: Adding archived projects...${NC}"
ssh -i "$KEY" "$SERVER" "cd $REMOTE_DIR && node add-archived-projects.js"
echo ""

echo -e "${BLUE}✅ Step 3: Completing dashboard tasks...${NC}"
ssh -i "$KEY" "$SERVER" "cd $REMOTE_DIR && node complete-dashboard-tasks.js"
echo ""

echo -e "${BLUE}🔄 Step 4: Restarting server...${NC}"
ssh -i "$KEY" "$SERVER" "cd $REMOTE_DIR && pm2 restart dashboard"
echo -e "${GREEN}✅ Server restarted${NC}"
echo ""

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the dashboard: http://84.8.221.172:3000"
echo "2. Set up HTTPS with Cloudflare Tunnel:"
echo "   ssh -i ~/.ssh/oracle_key opc@84.8.221.172"
echo "   cd /home/opc/project-dashboard"
echo "   bash setup-cloudflare-tunnel.sh"
echo ""
