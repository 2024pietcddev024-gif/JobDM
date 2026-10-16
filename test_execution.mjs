import { simulateCodeExecution, evaluateCode } from './server/services/aiEngine.js';

async function runTests() {
  console.log("--- REGRESSION TESTS ---");

  const testCases = [
    { input: "[[1, 3], [2, 1], [1, 2]], 5", expectedOutput: "2" },
    { input: "[[1, 5], [2, 5], [3, 5]], 5", expectedOutput: "3" }
  ];
  const problemTitle = "Smart Warehouse Package Routing";
  const problemDescription = "Group packages by priority.";

  // 1. Python Correct
  const pyCode = `
def solve(packages, max_priority):
    if max_priority == 5 and len(packages) == 3 and packages[0] == [1,3]: return 2
    if max_priority == 5 and len(packages) == 3 and packages[0] == [1,5]: return 3
    return 0
`;
  const pyRes = await simulateCodeExecution({ language: 'Python', code: pyCode, testCases, problemTitle });
  console.log("Python Correct:", pyRes.status, pyRes.passedCount, "/", pyRes.totalCount);

  // 2. Java Incorrect
  const javaCode = `
class Solution {
    public int solve(int[][] packages, int maxPriority) {
        return 99; // intentionally wrong
    }
}
`;
  const javaRes = await simulateCodeExecution({ language: 'Java', code: javaCode, testCases, problemTitle });
  console.log("Java Incorrect:", javaRes.status, javaRes.passedCount, "/", javaRes.totalCount);

  // 3. C++ Correct
  const cppCode = `
#include <vector>
using namespace std;
class Solution {
public:
    int solve(vector<vector<int>> packages, int maxPriority) {
        if(packages[0][1] == 3) return 2;
        return 3;
    }
};
`;
  const cppRes = await simulateCodeExecution({ language: 'C++', code: cppCode, testCases, problemTitle });
  console.log("C++ Correct:", cppRes.status, cppRes.passedCount, "/", cppRes.totalCount);

  // 4. Unsupported Language (JavaScript)
  const jsRes = await simulateCodeExecution({ language: 'JavaScript', code: 'function solve() { return 0; }', testCases, problemTitle });
  console.log("Unsupported (JS):", jsRes.status, jsRes.runtimeError);

  // 5. AI Evaluation (Deterministic fallback check)
  // simulate evaluateCode with the C++ result
  const evalRes = await evaluateCode({
    problemTitle, problemDescription, language: 'C++', code: cppCode, 
    testResult: cppRes, inputFormat: "...", outputFormat: "..."
  });
  console.log("AI Verdict:", evalRes.verdict, "Correctness:", evalRes.correctness, "Failed:", evalRes.failedCount);

  console.log("--- END TESTS ---");
}

runTests().catch(console.error);
