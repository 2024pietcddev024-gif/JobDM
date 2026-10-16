import db from '../server/db.js';
import { simulateCodeExecution } from '../server/services/aiEngine.js';

async function runTests() {
  const results = [];
  function logResult(testName, passed, details = '') {
    results.push({ testName, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName}${details ? ': ' + details : ''}`);
  }

  console.log("=================================================================");
  console.log("STARTING FULL QA VERIFICATION SUITE FOR CODING PRACTICE");
  console.log("=================================================================\n");

  // 1. Fetch Problem: Missing Number (dsa-b6-10)
  const probMissingNumber = (await db.query('SELECT * FROM coding_problems WHERE id = $1', ['dsa-b6-10'])).rows[0];
  const tcsMissingNumber = (await db.query('SELECT input, expected_output, is_hidden FROM coding_test_cases WHERE problem_id = $1 ORDER BY id', ['dsa-b6-10'])).rows.map(tc => ({
    input: tc.input,
    expectedOutput: tc.expected_output,
    isHidden: tc.is_hidden
  }));

  // ── PYTHON TESTS ──
  console.log("--- PYTHON TESTS ---");
  
  // Python: Correct Solution
  const pyCorrectCode = `class Solution:
    def solve(self, nums):
        n = len(nums)
        return (n * (n + 1)) // 2 - sum(nums)`;
  const pyCorrectRes = await simulateCodeExecution({
    language: 'Python',
    code: pyCorrectCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("Python - Correct Solution", pyCorrectRes.status === 'success' && pyCorrectRes.passedCount === tcsMissingNumber.length,
    `${pyCorrectRes.passedCount}/${pyCorrectRes.totalCount} passed`);

  // Python: Incorrect Solution
  const pyIncorrectCode = `class Solution:
    def solve(self, nums):
        return -999`;
  const pyIncorrectRes = await simulateCodeExecution({
    language: 'Python',
    code: pyIncorrectCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("Python - Incorrect Solution", pyIncorrectRes.status === 'wrong_answer' && pyIncorrectRes.passedCount === 0,
    `Status: ${pyIncorrectRes.status}, passed: ${pyIncorrectRes.passedCount}`);

  // Python: Syntax Error
  const pySyntaxErrorCode = `class Solution:
    def solve(self, nums
        return 0`;
  const pySyntaxErrorRes = await simulateCodeExecution({
    language: 'Python',
    code: pySyntaxErrorCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("Python - Syntax Error", pySyntaxErrorRes.status === 'runtime_error' || pySyntaxErrorRes.status === 'compilation_error',
    `Status: ${pySyntaxErrorRes.status}`);

  // Python: Empty / Boundary Input (dsa-div-2)
  const probDiv2 = (await db.query('SELECT * FROM coding_problems WHERE id = $1', ['dsa-div-2'])).rows[0];
  const tcsDiv2 = (await db.query('SELECT input, expected_output, is_hidden FROM coding_test_cases WHERE problem_id = $1 ORDER BY id', ['dsa-div-2'])).rows.map(tc => ({
    input: tc.input,
    expectedOutput: tc.expected_output,
    isHidden: tc.is_hidden
  }));
  const pyDiv2Code = `class Solution:
    def solve(self, nums):
        return [x for x in nums if x % 2 == 0]`;
  const pyDiv2Res = await simulateCodeExecution({
    language: 'Python',
    code: pyDiv2Code,
    testCases: tcsDiv2,
    problemTitle: probDiv2.title,
    wrapperMetadata: probDiv2.wrapper_metadata
  });
  const emptyTc = tcsDiv2.find(t => t.input.replace(/\s+/g, '') === '[]');
  const emptyRes = pyDiv2Res.results?.find(r => r.input.replace(/\s+/g, '') === '[]');
  logResult("Python - Empty / Boundary Array Input", pyDiv2Res.status === 'success' && emptyRes?.passed === true,
    `Empty input passed: ${emptyRes?.passed}`);

  // ── JAVA TESTS ──
  console.log("\n--- JAVA TESTS ---");

  // Java: Correct Solution
  const javaCorrectCode = `class Solution {
    public int solve(int[] nums) {
        int n = nums.length;
        int total = n * (n + 1) / 2;
        int sum = 0;
        for (int x : nums) sum += x;
        return total - sum;
    }
}`;
  const javaCorrectRes = await simulateCodeExecution({
    language: 'Java',
    code: javaCorrectCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("Java - Correct Solution", javaCorrectRes.status === 'success' && javaCorrectRes.passedCount === tcsMissingNumber.length,
    `${javaCorrectRes.passedCount}/${javaCorrectRes.totalCount} passed`);

  // Java: Incorrect Solution
  const javaIncorrectCode = `class Solution {
    public int solve(int[] nums) {
        return -999;
    }
}`;
  const javaIncorrectRes = await simulateCodeExecution({
    language: 'Java',
    code: javaIncorrectCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("Java - Incorrect Solution", javaIncorrectRes.status === 'wrong_answer' && javaIncorrectRes.passedCount === 0,
    `Status: ${javaIncorrectRes.status}, passed: ${javaIncorrectRes.passedCount}`);

  // Java: Compilation Error
  const javaCompileErrorCode = `class Solution {
    public int solve(int[] nums) {
        this is not valid java code;
    }
}`;
  const javaCompileErrorRes = await simulateCodeExecution({
    language: 'Java',
    code: javaCompileErrorCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("Java - Compilation Error", javaCompileErrorRes.status === 'compilation_error',
    `Status: ${javaCompileErrorRes.status}`);

  // ── C++ TESTS ──
  console.log("\n--- C++ TESTS ---");

  // C++: Correct Solution
  const cppCorrectCode = `#include <vector>
#include <numeric>
using namespace std;
class Solution {
public:
    int solve(vector<int> nums) {
        int n = nums.size();
        int total = n * (n + 1) / 2;
        int sum = 0;
        for (int x : nums) sum += x;
        return total - sum;
    }
};`;
  const cppCorrectRes = await simulateCodeExecution({
    language: 'C++',
    code: cppCorrectCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("C++ - Correct Solution", cppCorrectRes.status === 'success' && cppCorrectRes.passedCount === tcsMissingNumber.length,
    `${cppCorrectRes.passedCount}/${cppCorrectRes.totalCount} passed`);

  // C++: Incorrect Solution
  const cppIncorrectCode = `#include <vector>
using namespace std;
class Solution {
public:
    int solve(vector<int> nums) {
        return -999;
    }
};`;
  const cppIncorrectRes = await simulateCodeExecution({
    language: 'C++',
    code: cppIncorrectCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("C++ - Incorrect Solution", cppIncorrectRes.status === 'wrong_answer' && cppIncorrectRes.passedCount === 0,
    `Status: ${cppIncorrectRes.status}, passed: ${cppIncorrectRes.passedCount}`);

  // C++: Compilation Error
  const cppCompileErrorCode = `#include <vector>
class Solution {
public:
    int solve(vector<int> nums) {
        undefined_variable_error;
    }
};`;
  const cppCompileErrorRes = await simulateCodeExecution({
    language: 'C++',
    code: cppCompileErrorCode,
    testCases: tcsMissingNumber,
    problemTitle: probMissingNumber.title,
    wrapperMetadata: probMissingNumber.wrapper_metadata
  });
  logResult("C++ - Compilation Error", cppCompileErrorRes.status === 'compilation_error',
    `Status: ${cppCompileErrorRes.status}`);

  // ── MULTI-ARGUMENT PROBLEM TEST (Two Sum II: dsa-b3-1) ──
  console.log("\n--- MULTI-ARGUMENT PROBLEM TESTS (dsa-b3-1: solve(numbers, target)) ---");
  const probTwoSum = (await db.query('SELECT * FROM coding_problems WHERE id = $1', ['dsa-b3-1'])).rows[0];
  const tcsTwoSum = (await db.query('SELECT input, expected_output, is_hidden FROM coding_test_cases WHERE problem_id = $1 ORDER BY id', ['dsa-b3-1'])).rows.map(tc => ({
    input: tc.input,
    expectedOutput: tc.expected_output,
    isHidden: tc.is_hidden
  }));

  // Multi-Arg Python
  const pyTwoSumCode = `class Solution:
    def solve(self, numbers, target):
        l, r = 0, len(numbers) - 1
        while l < r:
            s = numbers[l] + numbers[r]
            if s == target:
                return [l + 1, r + 1]
            elif s < target:
                l += 1
            else:
                r -= 1
        return []`;
  const pyTwoSumRes = await simulateCodeExecution({
    language: 'Python',
    code: pyTwoSumCode,
    testCases: tcsTwoSum,
    problemTitle: probTwoSum.title,
    wrapperMetadata: probTwoSum.wrapper_metadata
  });
  logResult("Multi-Arg Python - Two Sum II", pyTwoSumRes.status === 'success' && pyTwoSumRes.passedCount === tcsTwoSum.length,
    `${pyTwoSumRes.passedCount}/${pyTwoSumRes.totalCount} passed`);

  // Multi-Arg Java
  const javaTwoSumCode = `class Solution {
    public int[] solve(int[] numbers, int target) {
        int l = 0, r = numbers.length - 1;
        while (l < r) {
            int s = numbers[l] + numbers[r];
            if (s == target) return new int[]{l + 1, r + 1};
            else if (s < target) l++;
            else r--;
        }
        return new int[]{};
    }
}`;
  const javaTwoSumRes = await simulateCodeExecution({
    language: 'Java',
    code: javaTwoSumCode,
    testCases: tcsTwoSum,
    problemTitle: probTwoSum.title,
    wrapperMetadata: probTwoSum.wrapper_metadata
  });
  logResult("Multi-Arg Java - Two Sum II", javaTwoSumRes.status === 'success' && javaTwoSumRes.passedCount === tcsTwoSum.length,
    `${javaTwoSumRes.passedCount}/${javaTwoSumRes.totalCount} passed`);

  // Multi-Arg C++
  const cppTwoSumCode = `#include <vector>
using namespace std;
class Solution {
public:
    vector<int> solve(vector<int> numbers, int target) {
        int l = 0, r = numbers.size() - 1;
        while (l < r) {
            int s = numbers[l] + numbers[r];
            if (s == target) return {l + 1, r + 1};
            else if (s < target) l++;
            else r--;
        }
        return {};
    }
};`;
  const cppTwoSumRes = await simulateCodeExecution({
    language: 'C++',
    code: cppTwoSumCode,
    testCases: tcsTwoSum,
    problemTitle: probTwoSum.title,
    wrapperMetadata: probTwoSum.wrapper_metadata
  });
  logResult("Multi-Arg C++ - Two Sum II", cppTwoSumRes.status === 'success' && cppTwoSumRes.passedCount === tcsTwoSum.length,
    `${cppTwoSumRes.passedCount}/${cppTwoSumRes.totalCount} passed`);

  // ── ARRAY / COLLECTION RETURN TYPE TESTS (dsa-div-2) ──
  console.log("\n--- ARRAY RETURN TYPE TESTS (dsa-div-2) ---");

  // Java: Array Return
  const javaDiv2Code = `import java.util.*;
class Solution {
    public int[] solve(int[] nums) {
        List<Integer> list = new ArrayList<>();
        for (int x : nums) {
            if (x % 2 == 0) list.add(x);
        }
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}`;
  const javaDiv2Res = await simulateCodeExecution({
    language: 'Java',
    code: javaDiv2Code,
    testCases: tcsDiv2,
    problemTitle: probDiv2.title,
    wrapperMetadata: probDiv2.wrapper_metadata
  });
  logResult("Java - Array Return Type", javaDiv2Res.status === 'success' && javaDiv2Res.passedCount === tcsDiv2.length,
    `${javaDiv2Res.passedCount}/${javaDiv2Res.totalCount} passed`);

  // C++: Vector Return
  const cppDiv2Code = `#include <vector>
using namespace std;
class Solution {
public:
    vector<int> solve(vector<int> nums) {
        vector<int> res;
        for (int x : nums) {
            if (x % 2 == 0) res.push_back(x);
        }
        return res;
    }
};`;
  const cppDiv2Res = await simulateCodeExecution({
    language: 'C++',
    code: cppDiv2Code,
    testCases: tcsDiv2,
    problemTitle: probDiv2.title,
    wrapperMetadata: probDiv2.wrapper_metadata
  });
  logResult("C++ - Vector Return Type", cppDiv2Res.status === 'success' && cppDiv2Res.passedCount === tcsDiv2.length,
    `${cppDiv2Res.passedCount}/${cppDiv2Res.totalCount} passed`);

  // ── API ENDPOINT INTEGRATION TESTS (/api/code/run) ──
  console.log("\n--- API ENDPOINT TESTS (POST /api/code/run) ---");

  // Incomplete code check
  const apiRunIncomplete = await fetch('http://localhost:3001/api/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'Python', code: 'pass', problemId: 'dsa-b6-10' })
  }).then(r => r.json());
  logResult("API /run - Incomplete Code Guard", apiRunIncomplete.status === 'incomplete',
    `Returned status: ${apiRunIncomplete.status}`);

  // Valid run check
  const apiRunValid = await fetch('http://localhost:3001/api/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'Python', code: pyCorrectCode, problemId: 'dsa-b6-10' })
  }).then(r => r.json());
  logResult("API /run - Valid Code Execution", apiRunValid.status === 'success' && apiRunValid.results?.length > 0,
    `Status: ${apiRunValid.status}, results count: ${apiRunValid.results?.length}`);

  console.log("\n=================================================================");
  console.log(`SUMMARY: ${results.filter(r => r.passed).length} / ${results.length} TESTS PASSED`);
  console.log("=================================================================");

  process.exit(results.every(r => r.passed) ? 0 : 1);
}

runTests().catch(err => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
