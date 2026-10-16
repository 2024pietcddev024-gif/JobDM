import { simulateCodeExecution } from '../server/services/aiEngine.js';
import dotenv from 'dotenv';
dotenv.config();

const twoSumTestCases = [
  { input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0,1]" },
  { input: "nums = [3,2,4], target = 6", expectedOutput: "[1,2]" }
];

async function runTests() {
  console.log("Starting End-to-End Execution Audits...");

  // Scenario 1: Correct solution (Python)
  console.log("\\n--- SCENARIO 1: Correct Solution (Python) ---");
  const code1 = `
class Solution:
    def twoSum(self, nums, target):
        m = {}
        for i, v in enumerate(nums):
            if target - v in m:
                return [m[target - v], i]
            m[v] = i
        return []
  `;
  const res1 = await simulateCodeExecution({ language: 'Python', code: code1, testCases: twoSumTestCases, problemTitle: 'Two Sum' });
  console.log("Status:", res1.status);
  console.log("Passed:", res1.passedCount, "/", res1.totalCount);
  if (res1.status === 'error') console.log("Error:", res1.runtimeError);

  // Scenario 2: Incorrect solution (Python)
  console.log("\\n--- SCENARIO 2: Incorrect Solution (Python) ---");
  const code2 = `
class Solution:
    def twoSum(self, nums, target):
        return [0, 0] # Intentionally wrong
  `;
  const res2 = await simulateCodeExecution({ language: 'Python', code: code2, testCases: twoSumTestCases, problemTitle: 'Two Sum' });
  console.log("Status:", res2.status);
  console.log("Passed:", res2.passedCount, "/", res2.totalCount);

  // Scenario 3: Compilation / Syntax Error (Python)
  console.log("\\n--- SCENARIO 3: Syntax Error (Python) ---");
  const code3 = `
class Solution:
    def twoSum(self, nums, target):
        retur [0, 0] # Syntax error
  `;
  const res3 = await simulateCodeExecution({ language: 'Python', code: code3, testCases: twoSumTestCases, problemTitle: 'Two Sum' });
  console.log("Status:", res3.status);
  console.log("Passed:", res3.passedCount, "/", res3.totalCount);

  // Scenario 4: Runtime Error (Python)
  console.log("\\n--- SCENARIO 4: Runtime Error (Python) ---");
  const code4 = `
class Solution:
    def twoSum(self, nums, target):
        x = 1 / 0 # Division by zero
        return [0, 1]
  `;
  const res4 = await simulateCodeExecution({ language: 'Python', code: code4, testCases: twoSumTestCases, problemTitle: 'Two Sum' });
  console.log("Status:", res4.status);
  console.log("Passed:", res4.passedCount, "/", res4.totalCount);

  // Scenario 5: Different Language (C++)
  console.log("\\n--- SCENARIO 5: Correct Solution (C++) ---");
  const code5 = `
#include <vector>
#include <unordered_map>
using namespace std;
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> m;
        for (int i = 0; i < nums.size(); ++i) {
            if (m.count(target - nums[i])) {
                return {m[target - nums[i]], i};
            }
            m[nums[i]] = i;
        }
        return {};
    }
};
  `;
  const res5 = await simulateCodeExecution({ language: 'C++', code: code5, testCases: twoSumTestCases, problemTitle: 'Two Sum' });
  console.log("Status:", res5.status);
  console.log("Passed:", res5.passedCount, "/", res5.totalCount);

}

runTests().catch(console.error);
