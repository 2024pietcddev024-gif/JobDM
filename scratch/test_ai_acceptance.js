import { evaluateCode } from '../server/services/aiEngine.js';
import dotenv from 'dotenv';
dotenv.config();

async function runTests() {
  console.log("=== AI Review Final Acceptance Verification ===");
  
  // 1. Correct Python submission
  const correctResult = {
    status: 'success',
    passedCount: 2,
    totalCount: 2,
    compileError: null,
    runtimeError: null,
    results: [
      { passed: true, expectedOutput: '2', actualOutput: '2', isHidden: false },
      { passed: true, expectedOutput: 'Hidden', actualOutput: 'Hidden (Passed)', isHidden: true }
    ]
  };

  try {
    const res1 = await evaluateCode({
      problemTitle: "Two Sum",
      problemDescription: "Given an array of integers nums and an integer target...",
      language: "Python",
      code: "def solve(input):\n    nums = input['nums']\n    target = input['target']\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []",
      testResult: correctResult,
      inputFormat: "nums: list of int, target: int",
      outputFormat: "list of two ints"
    });
    console.log("\\n1. Correct Python submission:");
    console.log(res1.verdict === 'correct' ? "✅ PASS" : "❌ FAIL");
  } catch (e) { console.error(e); }

  // 2. Incorrect Python submission
  const incorrectResult = {
    status: 'wrong_answer',
    passedCount: 1,
    totalCount: 2,
    compileError: null,
    runtimeError: null,
    results: [
      { passed: false, expectedOutput: '2', actualOutput: '3', input: '[[1, 3], [2, 1], [1, 2]], 5', isHidden: false },
      { passed: true, expectedOutput: 'Hidden', actualOutput: 'Hidden (Passed)', isHidden: true }
    ]
  };
  
  try {
    const res2 = await evaluateCode({
      problemTitle: "Two Sum",
      problemDescription: "Given an array of integers nums and an integer target...",
      language: "Python",
      code: "def solve(input):\n    return []",
      testResult: incorrectResult,
      inputFormat: "nums: list of int, target: int",
      outputFormat: "list of two ints"
    });
    console.log("\\n2. Incorrect Python submission:");
    console.log(res2.verdict === 'incorrect' ? "✅ PASS" : "❌ FAIL");
  } catch (e) { console.error(e); }

  // 3. Hidden Test Security
  const hiddenResult = {
    status: 'wrong_answer',
    passedCount: 1,
    totalCount: 2,
    compileError: null,
    runtimeError: null,
    results: [
      { passed: true, expectedOutput: '2', actualOutput: '2', isHidden: false },
      { passed: false, expectedOutput: 'Hidden', actualOutput: 'Hidden (Failed)', isHidden: true }
    ]
  };
  
  try {
    const res3 = await evaluateCode({
      problemTitle: "Two Sum",
      problemDescription: "Given an array of integers nums and an integer target...",
      language: "Python",
      code: "def solve(input):\n    return [0, 1]",
      testResult: hiddenResult,
      inputFormat: "nums: list of int, target: int",
      outputFormat: "list of two ints"
    });
    console.log("\\n7. Hidden test security:");
    if (res3.mistakeExplanation && !res3.mistakeExplanation.includes('Hidden')) {
        console.log("✅ PASS (No hidden output exposed)");
    } else {
        console.log("❌ FAIL or UNVERIFIED");
    }
  } catch (e) { console.error(e); }
}

runTests().catch(console.error);
