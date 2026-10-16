import fs from 'fs';
import db from '../db.js';

const problems = [];
let idCounter = 1;

function generateProblem(topic, title, difficulty, description, hints, refFn, testCasesData, meta) {
  const problem = {
    id: `dsa-div-${idCounter++}`, // Wait, I will use dsa-b2-ID
    topic, title, difficulty, description,
    input_format: meta.input_format,
    output_format: meta.output_format,
    constraints: meta.constraints,
    hints,
    test_cases: [],
    metadata: { isClass: true, className: "Solution", methodName: "solve" },
    starter_code: meta.starter
  };
  
  // Independent validation using JS reference engine
  for (const tc of testCasesData) {
    const rawExpected = refFn(...tc.args);
    // Convert to strict JSON string to match DB format
    let expStr = JSON.stringify(rawExpected);
    // Format input as string array for the backend parser (e.g. "[1, 2]")
    let inpStr = tc.args.length === 1 ? JSON.stringify(tc.args[0]) : JSON.stringify(tc.args);
    
    problem.test_cases.push({
      input: inpStr,
      expected_output: expStr,
      is_hidden: tc.hidden
    });
  }
  
  return problem;
}

const p1 = generateProblem(
  "Strings", "Reverse Vowels of a String", "Easy",
  "Given a string s, reverse only all the vowels in the string and return it. The vowels are 'a', 'e', 'i', 'o', and 'u', and they can appear in both lower and upper cases, more than once.",
  ["Use two pointers, one at the start and one at the end.", "Swap when both point to a vowel."],
  (s) => {
    const vowels = new Set(['a','e','i','o','u','A','E','I','O','U']);
    let arr = s.split('');
    let l = 0, r = arr.length - 1;
    while(l < r) {
      if(!vowels.has(arr[l])) l++;
      else if(!vowels.has(arr[r])) r--;
      else {
        [arr[l], arr[r]] = [arr[r], arr[l]];
        l++; r--;
      }
    }
    return arr.join('');
  },
  [
    { args: ["hello"], hidden: false },
    { args: ["leetcode"], hidden: false },
    { args: ["aA"], hidden: true },
    { args: [""], hidden: true },
    { args: ["xyz"], hidden: true } // boundary check
  ],
  {
    input_format: "A string 's'", output_format: "A string", constraints: ["1 <= s.length <= 3 * 10^5"],
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public String solve(String s) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s) {\n        return \"\";\n    }\n}"
    }
  }
);
p1.id = 'dsa-str-001';
problems.push(p1);

const p2 = generateProblem(
  "Hash Table", "Two Sum Less Than K", "Easy",
  "Given an array of integers and an integer k, find the maximum sum of two elements such that the sum is strictly less than k. If no such sum exists, return -1.",
  ["Sort the array first.", "Use two pointers from the ends to find the max sum less than K."],
  (nums, k) => {
    let max = -1;
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        let sum = nums[i] + nums[j];
        if (sum < k && sum > max) max = sum;
      }
    }
    return max;
  },
  [
    { args: [[34,23,1,24,75,33,54,8], 60], hidden: false },
    { args: [[10,20,30], 15], hidden: false },
    { args: [[1,1], 3], hidden: true }, // duplicates
    { args: [[], 10], hidden: true } // empty
  ],
  {
    input_format: "An array of integers 'nums' and an integer 'k'", output_format: "An integer", constraints: ["1 <= nums.length <= 100", "1 <= nums[i] <= 1000", "1 <= k <= 2000"],
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int k) {\n        return -1;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int k) {\n        return -1;\n    }\n}"
    }
  }
);
p2.id = 'dsa-ht-001';
problems.push(p2);

// Add a 3rd problem: Arrays
const p3 = generateProblem(
  "Arrays", "Squares of a Sorted Array", "Easy",
  "Given an integer array sorted in non-decreasing order, return an array of the squares of each number sorted in non-decreasing order.",
  ["Squaring a negative makes it positive.", "Use two pointers starting from the ends and build the result array backwards."],
  (nums) => nums.map(x => x * x).sort((a,b) => a - b),
  [
    { args: [[-4,-1,0,3,10]], hidden: false },
    { args: [[-7,-3,2,3,11]], hidden: false },
    { args: [[0,0,0]], hidden: true },
    { args: [[-5]], hidden: true }
  ],
  {
    input_format: "An array of integers 'nums'", output_format: "An array of integers", constraints: ["1 <= nums.length <= 10^4", "-10^4 <= nums[i] <= 10^4"],
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  }
);
p3.id = 'dsa-arr-101';
problems.push(p3);


async function seedDiverse() {
  let totalSeeded = 0;
  let conflicts = 0;
  
  const beforeCount = await db.query('SELECT COUNT(*) FROM coding_problems');
  console.log("Before rerunning, DB has problems:", beforeCount.rows[0].count);

  for (const p of problems) {
    try {
      // Content comparison check for problems
      const existingProb = await db.query('SELECT * FROM coding_problems WHERE id = $1', [p.id]);
      if (existingProb.rows.length > 0) {
        const ep = existingProb.rows[0];
        // simple content check on description
        if (ep.description !== p.description || ep.title !== p.title) {
          console.warn(`[CONFLICT] Problem ${p.id} exists but content differs! Skipping overwrite to prevent data loss.`);
          conflicts++;
        }
      } else {
        await db.query(
          `INSERT INTO coding_problems (id, title, topic, difficulty, description, input_format, output_format, constraints, hints, starter_code, wrapper_metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [p.id, p.title, p.topic, p.difficulty, p.description, p.input_format, p.output_format, 
           JSON.stringify(p.constraints), JSON.stringify(p.hints), JSON.stringify(p.starter_code), JSON.stringify(p.metadata)]
        );
        totalSeeded++;
      }

      // Content-level idempotency for test cases
      for (const tc of p.test_cases) {
        const existingTc = await db.query(
          'SELECT id FROM coding_test_cases WHERE problem_id = $1 AND input = $2 AND expected_output = $3 AND is_hidden = $4',
          [p.id, tc.input, tc.expected_output, tc.is_hidden]
        );
        if (existingTc.rows.length === 0) {
          await db.query(
            `INSERT INTO coding_test_cases (problem_id, input, expected_output, is_hidden)
             VALUES ($1, $2, $3, $4)`,
            [p.id, tc.input, tc.expected_output, tc.is_hidden]
          );
        }
      }
    } catch (err) {
      console.error(`Failed to process problem ${p.title}: `, err.message);
    }
  }

  const afterCount = await db.query('SELECT COUNT(*) FROM coding_problems');
  console.log("After rerunning, DB has problems:", afterCount.rows[0].count);
  console.log(`Total new problems inserted in this run: ${totalSeeded}`);
  console.log(`Total content conflicts detected: ${conflicts}`);
  
  process.exit(0);
}

seedDiverse();
