const https = require('http');

const API_URL = 'http://84.8.221.172:3000';
const PASSWORD = 'admin123';

// Login first
const loginData = JSON.stringify({ password: PASSWORD });

const loginOptions = {
  hostname: '84.8.221.172',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('🔐 Logging in to dashboard...\n');

const loginReq = https.request(loginOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const token = response.token;
      
      if (!token) {
        console.error('❌ Login failed');
        return;
      }
      
      console.log('✅ Logged in successfully\n');
      console.log('📊 Updating project statuses...\n');
      
      // Update each project
      const updates = [
        {
          id: 3, // chasseSouk.ma
          status: 'active',
          progress: 45,
          notes: 'MVP deployed to Vercel. User auth, listing wizard, phone validation, firearm waiver implemented.'
        },
        {
          id: 5, // Project Dashboard
          status: 'completed',
          progress: 100,
          notes: 'Fully functional dashboard deployed to Oracle server with JWT auth and task tracking.'
        },
        {
          id: 1, // HammamPOS
          status: 'completed',
          progress: 100,
          notes: 'Desktop application completed. Windows installer created. Web version archived.'
        }
      ];
      
      updates.forEach(update => {
        const updateData = JSON.stringify(update);
        
        const updateOptions = {
          hostname: '84.8.221.172',
          port: 3000,
          path: `/api/projects/${update.id}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': updateData.length
          }
        };
        
        const updateReq = https.request(updateOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            console.log(`✅ Updated project ID ${update.id}`);
          });
        });
        
        updateReq.on('error', (e) => {
          console.error(`❌ Error updating project ${update.id}:`, e.message);
        });
        
        updateReq.write(updateData);
        updateReq.end();
      });
      
      setTimeout(() => {
        console.log('\n📊 All updates sent!');
        console.log('🌐 View dashboard: http://84.8.221.172:3000\n');
      }, 2000);
      
    } catch (e) {
      console.error('❌ Error parsing response:', e.message);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('❌ Login request failed:', e.message);
});

loginReq.write(loginData);
loginReq.end();
