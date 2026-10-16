import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log(`API Key configured: ${!!key}`);
if (key) {
  console.log(`Key starts with AIza or AQ.: ${key.startsWith('AIza') || key.startsWith('AQ.')}`);
}

const genAI = key ? new GoogleGenerativeAI(key) : null;

async function run() {
  if (!genAI) {
    console.log('No GenAI client.');
    return;
  }
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say exactly: LIVE_API_SUCCESS');
    console.log(`Live API Request: SUCCESS. Response: ${result.response.text().trim()}`);
  } catch (err) {
    const errMsg = err.message || String(err);
    console.error(`Live API Request: FAILED.`);
    console.error(`Error message: ${errMsg}`);
  }
}

run();
