#!/bin/bash

echo "🔒 Cloudflare Tunnel Setup for Project Dashboard"
echo "================================================"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📥 Installing cloudflared..."
    
    # Download cloudflared for Linux
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    chmod +x cloudflared-linux-amd64
    sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
    
    echo "✅ cloudflared installed"
else
    echo "✅ cloudflared already installed"
fi

echo ""
echo "🚀 Starting Cloudflare Tunnel..."
echo ""
echo "This will create a secure HTTPS tunnel to your dashboard."
echo "You'll get a URL like: https://random-name.trycloudflare.com"
echo ""
echo "Keep this terminal open to maintain the tunnel."
echo "Press Ctrl+C to stop the tunnel."
echo ""
echo "Starting in 3 seconds..."
sleep 3

# Start the tunnel
cloudflared tunnel --url http://localhost:3000
