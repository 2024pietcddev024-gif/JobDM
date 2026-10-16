import { GoogleGenerativeAI } from '@google/generative-ai';
import util from 'util';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const PISTON_LANG_MAP = {
  'Python': { language: 'python', version: '3.10.0' },
};

function compareOutputs(actual, expected) {
  if (actual === null || actual === undefined) return false;
  if (expected === null || expected === undefined) return false;
  
  const strActual = String(actual).trim();
  const strExpected = String(expected).trim();
  if (strActual === strExpected) return true;

  try {
    const parsedActual = JSON.parse(strActual.replace(/'/g, '"'));
    const parsedExpected = JSON.parse(strExpected.replace(/'/g, '"'));
    return deepEqualWithFlexibleArray(parsedActual, parsedExpected);
  } catch(e) {
    return strActual.toLowerCase() === strExpected.toLowerCase();
  }
}

function deepEqualWithFlexibleArray(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    let exactMatch = true;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualWithFlexibleArray(a[i], b[i])) {
        exactMatch = false; break;
      }
    }
    if (exactMatch) return true;
    
    // Fallback: sort and compare
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    for (let i = 0; i < sortedA.length; i++) {
      if (JSON.stringify(sortedA[i]) !== JSON.stringify(sortedB[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqualWithFlexibleArray(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

async function runDiagnostic() {
  const language = 'Python';
  const problemTitle = 'Two Sum';
  const code = `
class Solution:
    def twoSum(self, nums, target):
        m = {}
        for i, v in enumerate(nums):
            if target - v in m:
                return [m[target - v], i]
            m[v] = i
        return []
`;
  const testCases = [
    { input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0,1]" },
    { input: "nums = [3,2,4], target = 6", expectedOutput: "[1,2]" }
  ];

  console.log('=== DIAGNOSTIC EXECUTION START ===');
  console.log('Language:', language);
  console.log('Problem:', problemTitle);
  console.log('Code:\\n' + code.trim());
  console.log('Test Cases:', testCases);

  const pistonConfig = PISTON_LANG_MAP[language];
  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
  const prompt = `You are an expert test runner generator for a coding platform.
Language: ${language}
Problem: "${problemTitle}"

User Code:
\`\`\`
${code}
\`\`\`

Test Cases:
${JSON.stringify(testCases)}

TASK:
Write a complete, single-file executable program in ${language} that:
1. Includes the exact User Code provided above.
2. Has a main entry point.
3. Hardcodes the provided test cases and iterates over them.
4. Parses the inputs correctly to pass into the user's function/method.
5. Captures the RETURN VALUE of the user's function.
6. Prints EXACTLY ONE LINE of JSON to standard output at the very end of execution. Structure:
[
  { "testCaseIndex": 0, "actualOutput": <captured_output_serialized_as_json_or_string> }
]
7. Do NOT validate correctness. Just capture the actual output!
8. Catch any runtime exceptions. If an exception occurs, set "actualOutput": "RUNTIME_ERROR: <error_msg>".
9. Print the JSON array on a single line at the very end. Do NOT wrap it in markdown. Do NOT explain anything. ONLY OUTPUT RAW CODE.`;

  const result = await model.generateContent(prompt);
  let wrappedCode = result.response.text();
  wrappedCode = wrappedCode.replace(/^```[a-zA-Z]*\s*/i, '').replace(/\s*```$/i, '').trim();

  console.log('\n=== GENERATED WRAPPER CODE ===\n' + wrappedCode + '\n============================');

  const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: pistonConfig.language,
      version: pistonConfig.version,
      files: [{ content: wrappedCode }],
      compile_timeout: 10000,
      run_timeout: 4000
    })
  });

  console.log('\n=== PISTON HTTP STATUS ===');
  console.log(pistonRes.status, pistonRes.statusText);

  const pistonData = await pistonRes.json();
  console.log('\n=== PISTON COMPILATION OUTPUT ===');
  console.log(pistonData.compile ? pistonData.compile.output : 'None');

  console.log('\n=== PISTON RUNTIME OUTPUT ===');
  console.log(pistonData.run ? pistonData.run.output : 'None');

  console.log('\n=== PISTON STDERR ===');
  console.log(pistonData.run ? pistonData.run.stderr : 'None');

  const runOutput = pistonData.run.output || '';
  let parsedResults = null;
  const lines = runOutput.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i].trim());
      if (Array.isArray(parsed)) {
        parsedResults = parsed;
        break;
      }
    } catch (e) {}
  }

  console.log('\n=== PARSED TEST RESULTS ===');
  console.log(util.inspect(parsedResults, { depth: null }));

  if (!parsedResults) return;

  let passedCount = 0;
  const evaluatedResults = parsedResults.map((res, i) => {
    const tc = testCases[i];
    if (!tc) return res;
    
    let isRuntimeError = typeof res.actualOutput === 'string' && res.actualOutput.startsWith('RUNTIME_ERROR');
    let passed = false;
    
    if (!isRuntimeError) {
       passed = compareOutputs(res.actualOutput, tc.expectedOutput);
       if (passed) passedCount++;
       else {
         console.log(`\nFailed comparison for TC ${i}: Actual: ${res.actualOutput} | Expected: ${tc.expectedOutput}`);
       }
    }
    
    return {
      ...res,
      expectedOutput: tc.expectedOutput,
      passed,
      isRuntimeError
    };
  });
  
  let status = 'success';
  if (passedCount < testCases.length) status = 'wrong_answer';
  if (evaluatedResults.some(r => r.isRuntimeError)) status = 'runtime_error';

  console.log('\n=== BACKEND FINAL STATUS ===');
  console.log('Passed:', passedCount, '/', testCases.length);
  console.log('Status:', status);
}

runDiagnostic().catch(console.error);
