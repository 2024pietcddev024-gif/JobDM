import jwt from 'jsonwebtoken';

const JWT_SECRET = 'f32c1e9b-cf67-4738-841e-b45e168c0e13';
const token = jwt.sign({ id: 1, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });

const testCases = [
  { input: "[[1, 3], [2, 1], [1, 2]], 5", expectedOutput: "2" },
  { input: "[[1, 5], [2, 5], [3, 5]], 5", expectedOutput: "3" }
];
const problemTitle = 'Smart Warehouse Package Routing';

const tests = [
  {
    language: 'Python',
    code: `def solve(packages, max_priority):\n    return 2 if len(packages) == 3 and max_priority == 5 and packages[0][1] == 3 else 3\n`
  },
  {
    language: 'Java',
    code: `class Solution {\n    public int solve(int[][] packages, int maxPriority) {\n        if (packages[0][1] == 3) return 2;\n        return 3;\n    }\n}`
  },
  {
    language: 'C++',
    code: `#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>>& packages, int maxPriority) {\n        if (packages[0][1] == 3) return 2;\n        return 3;\n    }\n};`
  },
  {
    language: 'JavaScript',
    code: `function solve(packages, maxPriority) {\n    if (packages[0][1] === 3) return 2;\n    return 3;\n}`
  },
  {
    language: 'TypeScript',
    code: `function solve(packages: number[][], maxPriority: number): number {\n    if (packages[0][1] === 3) return 2;\n    return 3;\n}`
  },
  {
    language: 'Go',
    code: `package main\n\nfunc solve(packages [][]int, maxPriority int) int {\n    if packages[0][1] == 3 { return 2 }\n    return 3\n}`
  },
  {
    language: 'Rust',
    code: `fn solve(packages: Vec<Vec<i32>>, max_priority: i32) -> i32 {\n    if packages[0][1] == 3 { return 2 }\n    return 3\n}`
  },
  {
    language: 'C#',
    code: `public class Solution {\n    public int Solve(int[][] packages, int maxPriority) {\n        if (packages[0][1] == 3) return 2;\n        return 3;\n    }\n}`
  },
  {
    language: 'Kotlin',
    code: `class Solution {\n    fun solve(packages: Array<IntArray>, maxPriority: Int): Int {\n        if (packages[0][1] == 3) return 2\n        return 3\n    }\n}`
  },
  {
    language: 'PHP',
    code: `class Solution {\n    function solve($packages, $maxPriority) {\n        if ($packages[0][1] == 3) return 2;\n        return 3;\n    }\n}`
  },
  {
    language: 'Swift',
    code: `class Solution {\n    func solve(_ packages: [[Int]], _ maxPriority: Int) -> Int {\n        if packages[0][1] == 3 { return 2 }\n        return 3\n    }\n}`
  }
];

async function runTests() {
  const results = {};
  for (const test of tests) {
    console.log(`Testing ${test.language}...`);
    try {
      const res = await fetch('http://localhost:3001/api/code/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...test, testCases, problemTitle })
      });
      const data = await res.json();
      console.log(`[${test.language}] => ${data.status} (Passed: ${data.passedCount}/${data.totalCount})`);
      results[test.language] = data;
    } catch (err) {
      console.error(`Error testing ${test.language}:`, err.message);
      results[test.language] = { error: err.message };
    }
  }
  
  console.log('\\nFinal Verification Report Summary:');
  for (const lang of Object.keys(results)) {
    const d = results[lang];
    if (d.status === 'success') console.log(`[PASS] ${lang} - Correct (Execution successful)`);
    else console.log(`[FAIL] ${lang} - Status: ${d.status}, Error: ${d.runtimeError || d.compileError || d.error}`);
  }
}

runTests();
