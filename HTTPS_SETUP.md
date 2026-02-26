# HTTPS Setup Guide

## Why HTTPS?

The "Not secure" warning appears because the site uses HTTP instead of HTTPS. For production use, you should add SSL/TLS encryption.

## Quick Fix Options

### Option 1: Cloudflare Tunnel (Easiest, Free)
1. Sign up at cloudflare.com
2. Install cloudflared on Oracle server
3. Run: `cloudflared tunnel --url http://localhost:3000`
4. Get free HTTPS URL like: `https://your-tunnel.trycloudflare.com`

**Pros:** Free, automatic HTTPS, no configuration
**Cons:** Random URL (can upgrade to custom domain)

### Option 2: Let's Encrypt + Nginx (Professional)
1. Get a domain name (e.g., dashboard.yourdomain.com)
2. Point domain to 84.8.221.172
3. Install Nginx and Certbot
4. Get free SSL certificate

**Commands:**
```bash
# Install Nginx
sudo yum install nginx

# Install Certbot
sudo yum install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d dashboard.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name dashboard.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/dashboard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Self-Signed Certificate (Quick Test)
**Not recommended for production** - browsers will show warnings

```bash
# Generate certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Update server.js to use HTTPS
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(3000);
```

## Recommended Approach

For internal use (only you access it):
- **Use as-is** - HTTP is fine for internal tools
- Or use **Cloudflare Tunnel** for quick HTTPS

For production (others will access):
- **Get a domain name**
- **Use Let's Encrypt + Nginx**
- **Set up auto-renewal**

## Current Status

- ✅ Site works on HTTP
- ⚠️ No HTTPS (shows "Not secure")
- ✅ Password protected
- ✅ JWT authentication
- ✅ Only accessible from your network

**For internal use, the current setup is secure enough.**
