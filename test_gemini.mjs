import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY || '';
console.log('Key prefix:', key.substring(0, 8));
console.log('Key valid:', key && (key.startsWith('AIza') || key.startsWith('AQ.')));

const genAI = new GoogleGenerativeAI(key);

// Test 1: gemini-3.8-flash (current model name in code)
console.log('\n--- Test 1: gemini-3.8-flash ---');
try {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
  const result = await model.generateContent('Say "ok" only.');
  console.log('SUCCESS:', result.response.text().trim());
} catch(e) {
  console.log('ERROR:', e.message?.substring(0, 200));
}

// Test 2: gemini-1.5-flash (correct name)
console.log('\n--- Test 2: gemini-1.5-flash ---');
try {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent('Say "ok" only.');
  console.log('SUCCESS:', result.response.text().trim());
} catch(e) {
  console.log('ERROR:', e.message?.substring(0, 200));
}

// Test 3: gemini-2.0-flash
console.log('\n--- Test 3: gemini-2.0-flash ---');
try {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent('Say "ok" only.');
  console.log('SUCCESS:', result.response.text().trim());
} catch(e) {
  console.log('ERROR:', e.message?.substring(0, 200));
}

// Test 4: gemini-flash (alias)
console.log('\n--- Test 4: gemini-flash ---');
try {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash' });
  const result = await model.generateContent('Say "ok" only.');
  console.log('SUCCESS:', result.response.text().trim());
} catch(e) {
  console.log('ERROR:', e.message?.substring(0, 200));
}
