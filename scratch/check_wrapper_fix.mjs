import { generateWrapperCode } from '../server/services/executionWrappers.js';

// Test Two Sum II with unpacked input
const testCases = [
  { input: "[[2,7,11,15],9]", expectedOutput: "[1,2]" }
];

console.log("Current wrapper output for C++ Two Sum II:");
const cppCode = `#include <vector>
using namespace std;
class Solution {
public:
    vector<int> solve(vector<int> numbers, int target) {
        return {1, 2};
    }
};`;

try {
  const cppWrapper = generateWrapperCode('C++', cppCode, testCases, 'Two Sum II - Input Array Is Sorted');
  console.log(cppWrapper.slice(-300));
} catch(e) {
  console.error("C++ Wrapper Error:", e);
}
