// Update descriptions for the 5 new projects
const fetch = require('node-fetch');

const API_URL = 'http://84.8.221.172:3000/api';
const PASSWORD = 'admin123';

const projectDescriptions = {
  7: `Health tracking app for monitoring ketosis and autophagy states based on glucose measurements. 
Users log glucose readings and the app estimates their metabolic state (normal/ketosis/autophagy). 
Features: glucose logging, state estimation, 7-day history charts, fasting timer.
Target users: People doing intermittent fasting, keto diet, or metabolic health optimization.`,

  8: `Arabic/bilingual emotional journaling and reflection platform. "Voice of the Heart" - QalbVoice.
Users can record voice notes or write text entries with emotion tagging (happy, sad, grateful, anxious, peaceful).
Features: voice/text journaling, daily reflection prompts, timeline view, mood tracking over time.
Target users: Arabic speakers seeking emotional expression and spiritual reflection.`,

  9: `French business management system for small Moroccan businesses.
All-in-one CRM, invoicing, and product catalog management.
Features: client management, invoice generation with PDF export, product/service catalog, payment tracking, revenue dashboard.
Target users: Small business owners in Morocco who need French-language business tools.`,

  10: `Personal development tool for self-reflection and pattern recognition.
Daily check-ins help users notice behavioral patterns, triggers, and growth areas.
Features: daily mood/reflection check-ins, AI-assisted pattern detection, goal tracking, reflection library.
Target users: People working on self-awareness, personal growth, and behavioral change.`,

  11: `Self-discovery and personal growth platform with structured exercises.
Guided journeys help users discover their values, strengths, and life purpose.
Features: values assessment, strengths finder, life wheel balance, purpose exploration, multi-day guided journeys.
Target users: People seeking deeper self-understanding and life alignment.`
};

async function updateDescriptions() {
  try {
    // Login
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD })
    });
    
    const { token } = await loginRes.json();
    console.log('✅ Logged in successfully\n');

    // Update each project
    for (const [projectId, description] of Object.entries(projectDescriptions)) {
      console.log(`Updating Project #${projectId}...`);
      
      const updateRes = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description })
      });

      if (updateRes.ok) {
        console.log(`✅ Project #${projectId} description updated\n`);
      } else {
        console.log(`❌ Failed to update Project #${projectId}`);
        console.log(await updateRes.text());
      }
    }

    console.log('\n🎉 All descriptions updated!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateDescriptions();
