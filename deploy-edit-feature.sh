#!/bin/bash
# Deploy edit feature to Oracle server

echo "Deploying dashboard edit feature..."

scp -i ../. ssh/oracle_key -o StrictHostKeyChecking=no \
  public/index.html \
  public/app.js \
  public/style.css \
  opc@152.70.210.136:/home/opc/project-dashboard/public/

echo "Files uploaded. Restarting dashboard service..."

ssh -i ../.ssh/oracle_key -o StrictHostKeyChecking=no opc@152.70.210.136 \
  "pm2 restart project-dashboard || (cd /home/opc/project-dashboard && pm2 start server.js --name project-dashboard)"

echo "✅ Dashboard edit feature deployed!"
echo "Visit: http://84.8.221.172:3000"
