const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No API key found in .env');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  console.log('Fetching available models...');
  let models = [];
  try {
    const req = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
    if (!req.ok) {
      console.log('Failed to fetch models list:', req.status, req.statusText);
      return;
    }
    const res = await req.json();
    models = res.models.map(m => m.name.replace('models/', ''));
  } catch (err) {
    console.error('Error fetching models:', err.message);
    return;
  }

  const candidates = models.filter(m => m.includes('flash') || m.includes('pro'));
  console.log('Found ' + candidates.length + ' candidate models.');

  for (const modelName of candidates) {
    console.log('\nTesting model: ' + modelName);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Generate a simple JSON object with a single boolean property "success" set to true.');
      console.log('  [SUCCESS] -> ' + result.response.text().slice(0, 50).replace(/\n/g, ''));
      console.log('  FOUND A WORKING MODEL! Stopping search.');
      return;
    } catch (err) {
      let statusStr = '';
      if (err.status) statusStr = '[' + err.status + '] ';
      else if (err.message.includes('503')) statusStr = '[503] ';
      else if (err.message.includes('404')) statusStr = '[404] ';
      else statusStr = '[ERROR] ';
      
      console.log('  ' + statusStr + err.message.split('\n')[0]);
    }
  }
}

testAllModels();
