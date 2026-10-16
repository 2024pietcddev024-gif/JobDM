import { simulateCodeExecution, evaluateCode } from './server/services/aiEngine.js';

async function runTests() {
  const pTitle = "Smart Warehouse Package Routing";
  const pDesc = "Group packages by priority.";
  const tCases = [
    { input: "[[1, 3], [2, 1], [1, 2]], 5", expectedOutput: "2" },
    { input: "[[1, 5], [2, 5], [3, 5]], 5", expectedOutput: "3" }
  ];

  const results = [];
  const addRes = (name, res) => results.push({ name, status: res.status, passed: res.passedCount, total: res.totalCount, err: res.compileError || res.runtimeError });

  // A. Correctness
  // Correct Python
  const pCode = `def solve(packages, max_priority):\n    if max_priority == 5 and len(packages) == 3 and packages[0] == [1,3]: return 2\n    return 3`;
  addRes("Correct Python", await simulateCodeExecution({ language: 'Python', code: pCode, testCases: tCases, problemTitle: pTitle }));

  // Incorrect Java
  const jCode = `class Solution { public int solve(int[][] p, int m) { return 0; } }`;
  addRes("Incorrect Java", await simulateCodeExecution({ language: 'Java', code: jCode, testCases: tCases, problemTitle: pTitle }));

  // Partially passing C++
  const cCodePart = `
#include <vector>
using namespace std;
class Solution { public: int solve(vector<vector<int>> p, int m) { return 2; } };`;
  addRes("Partial C++", await simulateCodeExecution({ language: 'C++', code: cCodePart, testCases: tCases, problemTitle: pTitle }));

  // B. Execution Failures
  // C++ Compilation Error
  const cCodeErr = `class Solution { public: int solve() { return undeclared_var; } };`;
  addRes("C++ Compile Error", await simulateCodeExecution({ language: 'C++', code: cCodeErr, testCases: tCases, problemTitle: pTitle }));

  // Python Syntax Error
  const pSyntax = `def solve(p, m) return 2`;
  addRes("Python Syntax Error", await simulateCodeExecution({ language: 'Python', code: pSyntax, testCases: tCases, problemTitle: pTitle }));

  // Java Runtime Exception
  const jRuntime = `class Solution { public int solve(int[][] p, int m) { return 1 / 0; } }`;
  addRes("Java Runtime Exception", await simulateCodeExecution({ language: 'Java', code: jRuntime, testCases: tCases, problemTitle: pTitle }));

  // Python Infinite Loop
  const pLoop = `def solve(p, m):\n    while True: pass`;
  addRes("Python Infinite Loop", await simulateCodeExecution({ language: 'Python', code: pLoop, testCases: tCases, problemTitle: pTitle }));

  // C. Verdict Integrity Check (using evaluateCode)
  const evalRes = await evaluateCode({
    problemTitle: pTitle, problemDescription: pDesc, language: 'C++', code: cCodeErr, 
    testResult: { status: 'compilation_error', passedCount: 0, totalCount: 2 }, inputFormat: "", outputFormat: ""
  });
  console.log("AI Verdict for Compile Error:", evalRes.verdict, evalRes.summary);

  console.table(results);
}

runTests().catch(console.error);
