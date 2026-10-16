import { evaluateCode } from '../server/services/aiEngine.js';
import dotenv from 'dotenv';
dotenv.config();

// Intentionally use a bad API key or just let it fail via 503
process.env.GEMINI_API_KEY = "invalid_key_to_force_failure";

async function testFallback() {
  console.log("Testing fallback behavior when Gemini fails...");
  
  const testResult = {
    status: 'success',
    passedCount: 2,
    totalCount: 2,
    compileError: null,
    runtimeError: null,
    results: []
  };

  const response = await evaluateCode({
    problemTitle: "Two Sum",
    problemDescription: "...",
    language: "Python",
    code: "...",
    testResult,
    inputFormat: "...",
    outputFormat: "..."
  });

  console.log("\\n--- Fallback Response ---");
  console.log(JSON.stringify(response, null, 2));

  if (response.verdict === 'correct' && response.summary === 'CORRECT ANSWER' && response.correctness === '100.00%') {
    console.log("\\n✅ SUCCESS: Deterministic verdict was preserved despite AI failure.");
  } else {
    console.log("\\n❌ FAILURE: Deterministic verdict was lost or corrupted.");
  }
}

testFallback().catch(console.error);
