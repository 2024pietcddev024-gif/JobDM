import { evaluateCode } from '../server/services/aiEngine.js';
import dotenv from 'dotenv';
dotenv.config();

async function traceDataFlow() {
  console.log("=== DIAGNOSTIC REPORT: Merge Intervals (LIVE AI) ===");

  const problemTitle = "Merge Intervals";
  const code = `def solve(input):\n    intervals = input\n    d = {}\n    for i in intervals:\n        d[i] = True\n    return []`;
  
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

  console.log("\\n--- RESULT ---");
  console.log("reviewSource:", res.reviewSource);
  console.log("Has correctedCode:", res.correctedCode !== undefined && res.correctedCode !== null);
  
  if (res.correctedCode) {
    console.log("First 30 chars of correctedCode:", res.correctedCode.substring(0, 30).replace(/\\n/g, '\\\\n'));
    console.log("\\n--- FULL RES.CORRECTEDCODE ---");
    console.log(res.correctedCode);
  }
}
traceDataFlow().catch(console.error);
