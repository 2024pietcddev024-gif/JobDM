import { simulateCodeExecution } from './server/services/aiEngine.js';

const testLanguages = async () => {
  const pythonRes = await simulateCodeExecution({
    language: 'Python',
    code: 'def solve(x):\n    print("Python works")\n    return x',
    testCases: [{ input: '1', expectedOutput: '1' }],
    problemTitle: 'Test'
  });
  console.log('Python Result:', pythonRes.status, pythonRes.passedCount, pythonRes.runtimeError || pythonRes.compileError || '');

  const javaRes = await simulateCodeExecution({
    language: 'Java',
    code: 'class Solution {\n    public Object solve(Object input) {\n        System.out.println("Java works");\n        return input;\n    }\n}',
    testCases: [{ input: '1', expectedOutput: '1' }],
    problemTitle: 'Test'
  });
  console.log('Java Result:', javaRes.status, javaRes.passedCount, javaRes.runtimeError || javaRes.compileError || '');

  const cppRes = await simulateCodeExecution({
    language: 'C++',
    code: 'class Solution {\npublic:\n    int solve(int input) {\n        std::cout << "C++ works\\n";\n        return input;\n    }\n};',
    testCases: [{ input: '1', expectedOutput: '1' }],
    problemTitle: 'Test'
  });
  console.log('C++ Result:', cppRes.status, cppRes.passedCount, cppRes.runtimeError || cppRes.compileError || '');
};

testLanguages();
