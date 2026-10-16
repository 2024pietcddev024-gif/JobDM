import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
console.log("Key:", GEMINI_KEY.substring(0, 5) + '...');
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });
model.generateContent('hello').then(r => console.log('Success')).catch(e => console.error('Error:', e.message));
