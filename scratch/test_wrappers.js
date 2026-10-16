import fs from 'fs';
import { generateWrapperCode, PROBLEM_METADATA } from '../server/services/executionWrappers.js';

const languages = [
  'Python', 'Java', 'C++', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C#', 'Kotlin', 'PHP', 'Swift'
];

// mock codes for testing
const mockCodes = {
  Python: 'def solve(a, b):\n    return a + b',
  Java: 'class Solution {\n    public Object solve(Object a, Object b) {\n        return (Integer)a + (Integer)b;\n    }\n}',
  'C++': '#include <vector>\n#include <string>\nclass Solution {\npublic:\n    int solve(int a, int b) {\n        return a + b;\n    }\n};',
  JavaScript: 'function solve(a, b) {\n  return a + b;\n}',
  TypeScript: 'function solve(a: any, b: any): any {\n  return a + b;\n}',
  Go: 'package main\n\nfunc solve(a int, b int) int {\n    return a + b\n}',
  Rust: 'fn solve(a: i32, b: i32) -> i32 {\n    return a + b;\n}',
  'C#': 'public class Solution {\n    public object Solve(object a, object b) {\n        return (int)a + (int)b;\n    }\n}',
  Kotlin: 'class Solution {\n    fun solve(a: Int, b: Int): Int {\n        return a + b\n    }\n}',
  PHP: 'class Solution {\n    function solve($a, $b) {\n        return $a + $b;\n    }\n}',
  Swift: 'class Solution {\n    func solve(a: Int, b: Int) -> Int {\n        return a + b\n    }\n}'
};

const testCases = [
  { input: "1, 2" }
];

async function runTest() {
  for (const lang of languages) {
    try {
      console.log(`Testing ${lang}...`);
      const wrapper = generateWrapperCode(lang, mockCodes[lang], testCases, 'Generic Problem');
      console.log(wrapper);
    } catch (e) {
      console.log(`Failed for ${lang}: ${e.message}`);
    }
  }
}

runTest();
