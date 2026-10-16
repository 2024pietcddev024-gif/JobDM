import { simulateCodeExecution } from './server/services/aiEngine.js';

const code = `
class Solution:
    def solve(self, nums):
        return [x for x in nums if x % 2 == 0]
`;

const testCases = [{ input: "[2, 3, 4]", expectedOutput: "[2, 4]" }];
const wrapperMetadata = { isClass: true, className: "Solution", methodName: "solve" };

simulateCodeExecution({ language: 'Python', code, testCases, problemTitle: 'test', wrapperMetadata })
  .then(res => console.log(res))
  .catch(console.error);
