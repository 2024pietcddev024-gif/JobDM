import fs from 'fs';
import { generateWrapperCode } from '../server/services/executionWrappers.js';

const PISTON_LANG_MAP = {
  'Python': { language: 'python', version: '3.10.0' },
  'Java': { language: 'java', version: '15.0.2' },
  'C++': { language: 'c++', version: '10.2.0' },
  'JavaScript': { language: 'javascript', version: '18.15.0' },
  'TypeScript': { language: 'typescript', version: '5.0.3' },
  'Go': { language: 'go', version: '1.16.2' },
  'Rust': { language: 'rust', version: '1.68.2' },
  'C#': { language: 'csharp', version: '6.12.0' },
  'Kotlin': { language: 'kotlin', version: '1.8.20' },
  'PHP': { language: 'php', version: '8.2.3' },
  'Swift': { language: 'swift', version: '5.3.3' }
};

const mockCodes = {
  Python: 'def solve(a, b):\n    return a + b',
  Java: 'class Solution {\n    public Object solve(Object a, Object b) {\n        return (Integer)a + (Integer)b;\n    }\n}',
  'C++': '#include <vector>\n#include <string>\nclass Solution {\npublic:\n    int solve(int a, int b) {\n        return a + b;\n    }\n};',
  JavaScript: 'function solve(a, b) {\n  return a + b;\n}',
  TypeScript: 'function solve(a: any, b: any): any {\n  return a + b;\n}',
  Go: 'package main\n\nfunc solve(a int, b int) int {\n    return a + b\n}',
  Rust: 'impl Solution {\n    pub fn solve(a: i32, b: i32) -> i32 {\n        return a + b;\n    }\n}\nstruct Solution;',
  'C#': 'public class Solution {\n    public object Solve(object a, object b) {\n        return (int)a + (int)b;\n    }\n}',
  Kotlin: 'class Solution {\n    fun solve(a: Int, b: Int): Int {\n        return a + b\n    }\n}',
  PHP: 'class Solution {\n    function solve($a, $b) {\n        return $a + $b;\n    }\n}',
  Swift: 'class Solution {\n    func solve(_ a: Int, _ b: Int) -> Int {\n        return a + b\n    }\n}'
};

const testCases = [
  { input: "1, 2" }
];

async function runTest() {
  for (const lang of Object.keys(PISTON_LANG_MAP)) {
    try {
      console.log(`\n--- Testing ${lang} ---`);
      // Update Rust mock code
      let code = mockCodes[lang];
      if (lang === 'Rust') {
         // Rust wrapper expects `solve(1, 2)`, but default meta specifies no class.
         // Wait, DEFAULT_METADATA has Rust: {isClass: false, methodName: "solve"}.
         code = 'fn solve(a: i32, b: i32) -> i32 { a + b }';
      }
      
      const wrapper = generateWrapperCode(lang, code, testCases, 'Generic Problem');
      const pistonConfig = PISTON_LANG_MAP[lang];
      
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonConfig.language,
          version: pistonConfig.version,
          files: [{ content: wrapper }],
          compile_timeout: 10000,
          run_timeout: 3000
        })
      });
      const data = await res.json();
      
      if (data.compile && data.compile.code !== 0) {
        console.log(`[Compile Error] ${lang}:\n`, data.compile.output);
      } else {
        console.log(`[Run Output] ${lang}:\n`, data.run.output);
      }
    } catch (e) {
      console.log(`Failed for ${lang}: ${e.message}`);
    }
  }
}

runTest();
