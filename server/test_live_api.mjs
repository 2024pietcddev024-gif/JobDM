import { evaluateCode } from './services/aiEngine.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
  const req = {
    problemTitle: 'Two Sum',
    problemDescription: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    language: 'python',
    code: `class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]`,
    testResult: {
      status: 'success',
      passedCount: 2,
      totalCount: 2,
      results: [ { status: 'passed' }, { status: 'passed' } ]
    },
    inputFormat: 'nums = [2,7,11,15], target = 9',
    outputFormat: '[0,1]',
    constraints: [],
    examples: []
  };

  console.log('Sending request to evaluateCode...');
  const result = await evaluateCode(req);
  console.log(JSON.stringify(result, null, 2));
}

run();
