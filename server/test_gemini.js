import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];
    for (const name of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent('Say hello world.');
        console.log(`✅ Model ${name} worked! Response: ${result.response.text()}`);
      } catch (err) {
        console.error(`❌ Model ${name} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
