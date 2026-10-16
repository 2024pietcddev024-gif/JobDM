import { evaluateCode } from '../server/services/aiEngine.js';
import dotenv from 'dotenv';
dotenv.config();

async function traceDataFlow() {
  console.log("=== DIAGNOSTIC REPORT: Merge Intervals ===");

  const problemTitle = "Merge Intervals";
  console.log("Problem ID/Title:", problemTitle);
  console.log("Language:", "Python");
  
  // 1. Setup intentionally incorrect solution
  const code = `def solve(input):\n    intervals = input\n    # wrong logic, causes type error with unhashable list\n    d = {}\n    for i in intervals:\n        d[i] = True\n    return []`;
  
  const testResult = {
    status: 'runtime_error',
    passedCount: 0,
    totalCount: 2,
    compileError: null,
    runtimeError: "TypeError: unhashable type: 'list' on line 5",
    results: [
      { passed: false, expectedOutput: '[[1,5],[6,9]]', actualOutput: 'Unavailable', input: '[[1,3],[6,9]], [1,5]', isHidden: false }
    ]
  };

  console.log("Deterministic Verdict:", testResult.status);

  // 2. Call evaluateCode
  let res;
  try {
    res = await evaluateCode({
      problemTitle,
      problemDescription: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.",
      language: "Python",
      code,
      testResult,
      inputFormat: "intervals: list of list of int",
      outputFormat: "list of list of int"
    });
  } catch (e) {
    console.error("evaluateCode threw:", e);
    return;
  }

  // 3. Capture diagnostic info
  console.log("\\n--- RESULT ---");
  console.log("reviewSource:", res.reviewSource);
  console.log("Has correctedCode:", res.correctedCode !== undefined && res.correctedCode !== null);
  console.log("correctedCode length:", res.correctedCode ? res.correctedCode.length : 0);
  
  if (res.correctedCode) {
    console.log("First 30 chars of correctedCode:", res.correctedCode.substring(0, 30).replace(/\\n/g, '\\\\n'));
  }

  console.log("Has Reference Solution hardcoded?", !!(REFERENCE_SOLUTIONS[problemTitle] && REFERENCE_SOLUTIONS[problemTitle]["Python"]));

  console.log("\\n--- FULL RES.CORRECTEDCODE ---");
  console.log(res.correctedCode);
  
  // 4. Check Frontend Rendering condition
  // In CodingSandbox.jsx:
  // {aiReview.correctedCode && ( ... renders block ... )}
  console.log("\\n--- FRONTEND RENDER CONDITION ---");
  console.log("aiReview.correctedCode is truthy?", !!res.correctedCode);
  console.log("Is it an empty string?", res.correctedCode === '');
  console.log("Is it a generic placeholder?", res.correctedCode === "// A trusted reference solution is currently unavailable for this problem and language.");
}

traceDataFlow().catch(console.error);
