import fs from 'fs';

const problems = [];
let idCounter = 1;

// Base 1: Elements divisible by X
for (let x = 2; x <= 21; x++) {
  problems.push({
    id: `dsa-div-${x}`,
    title: `Find Elements Divisible by ${x}`,
    topic: 'Arrays',
    difficulty: x > 10 ? 'Medium' : 'Easy',
    description: `Given an array of integers, return a new array containing only the elements that are perfectly divisible by ${x}.`,
    input_format: `An array of integers 'nums'.`,
    output_format: `An array of integers.`,
    constraints: ['0 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
    hints: [`Use the modulo operator % to check if a number is divisible by ${x}.`],
    test_cases: [
      { input: `[ ${x}, ${x+1}, ${x*2}, ${x*2+1} ]`, expected_output: `[ ${x}, ${x*2} ]`, is_hidden: false },
      { input: `[ 1, 2, 3 ]`, expected_output: x <= 3 ? (x === 2 ? `[ 2 ]` : `[ 3 ]`) : `[ ]`, is_hidden: false },
      { input: `[ ${x*3}, ${x*4} ]`, expected_output: `[ ${x*3}, ${x*4} ]`, is_hidden: true },
      { input: `[ ]`, expected_output: `[ ]`, is_hidden: true }
    ],
    metadata: { isClass: true, className: "Solution", methodName: "solve" },
    starter_code: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  });
}

// Write the first 20 problems to JSON
fs.writeFileSync('c:/interviewiq/server/scripts/batch1_seed.json', JSON.stringify(problems, null, 2));
console.log(`Generated ${problems.length} problems for Batch 1.`);
