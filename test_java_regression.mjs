import { simulateCodeExecution, evaluateCode } from './server/services/aiEngine.js';

async function runTests() {
  const pTitle = "Smart Warehouse Package Routing";
  const tCases = [
    { input: "[[1, 3], [2, 1], [1, 2]], 5", expectedOutput: "2" },
    { input: "[[1, 5], [2, 5], [3, 5]], 5", expectedOutput: "3" }
  ];

  const results = [];
  const addRes = (name, res) => results.push({ name, status: res.status, passed: res.passedCount, total: res.totalCount, err: res.compileError || res.runtimeError });

  // Test A - Basic Java execution
  const javaCorrect = `class Solution { public int solve(int[][] p, int m) { if(p.length==3 && p[0][1]==3) return 2; return 3; } }`;
  addRes("Test A (Java Correct)", await simulateCodeExecution({ language: 'Java', code: javaCorrect, testCases: tCases, problemTitle: pTitle }));

  // Test B - Incorrect Java solution
  const javaIncorrect = `class Solution { public int solve(int[][] p, int m) { return 0; } }`;
  addRes("Test B (Java Incorrect)", await simulateCodeExecution({ language: 'Java', code: javaIncorrect, testCases: tCases, problemTitle: pTitle }));

  // Test C - Java runtime exception
  const javaRuntime = `class Solution { public int solve(int[][] p, int m) { return 1 / 0; } }`;
  addRes("Test C (Java Exception)", await simulateCodeExecution({ language: 'Java', code: javaRuntime, testCases: tCases, problemTitle: pTitle }));

  // Test D - Java compilation error
  const javaCompile = `class Solution { public int solve(int[][] p, int m) { return undeclared_var; } }`;
  addRes("Test D (Java Compile Err)", await simulateCodeExecution({ language: 'Java', code: javaCompile, testCases: tCases, problemTitle: pTitle }));

  // Test E - Regression
  const pyCorrect = `def solve(packages, max_priority):\n    if max_priority == 5 and len(packages) == 3 and packages[0] == [1,3]: return 2\n    return 3`;
  addRes("Test E (Python Correct)", await simulateCodeExecution({ language: 'Python', code: pyCorrect, testCases: tCases, problemTitle: pTitle }));
  
  const cppCorrect = `
#include <vector>
using namespace std;
class Solution { public: int solve(vector<vector<int>> p, int m) { return p[0][1]==3 ? 2 : 3; } };`;
  addRes("Test E (C++ Correct)", await simulateCodeExecution({ language: 'C++', code: cppCorrect, testCases: tCases, problemTitle: pTitle }));

  // Print results
  console.table(results);
}

runTests().catch(console.error);
