import fs from 'fs';

const content = `
const DEFAULT_METADATA = {
  Python: { isClass: false, methodName: "solve" },
  Java: { isClass: true, className: "Solution", methodName: "solve" },
  "C++": { isClass: true, className: "Solution", methodName: "solve" },
  JavaScript: { isClass: false, methodName: "solve" },
  TypeScript: { isClass: false, methodName: "solve" },
  Go: { isClass: false, methodName: "solve" },
  Rust: { isClass: false, methodName: "solve" },
  "C#": { isClass: true, className: "Solution", methodName: "Solve" },
  Kotlin: { isClass: true, className: "Solution", methodName: "solve" },
  PHP: { isClass: true, className: "Solution", methodName: "solve" },
  Swift: { isClass: true, className: "Solution", methodName: "solve" }
};

export const PROBLEM_METADATA = {
  "Two Sum": {
    Python: { isClass: true, className: "Solution", methodName: "twoSum" },
    "C++": { isClass: true, className: "Solution", methodName: "twoSum" }
  },
  "Smart Warehouse Package Routing": {
    Python: { isClass: false, methodName: "solve" },
    "C++": { isClass: true, className: "Solution", methodName: "solve" }
  }
};

function parseInputString(inputStr) {
  if (typeof inputStr !== 'string') return inputStr;
  let stripped = inputStr.replace(/[a-zA-Z_]+\\s*=\\s*/g, '');
  stripped = stripped.replace(/'/g, '"');
  try {
    return JSON.parse('[' + stripped + ']');
  } catch (e) {
    return [];
  }
}

export function generateWrapperCode(language, code, testCases, problemTitle) {
  const meta = PROBLEM_METADATA[problemTitle]?.[language] || DEFAULT_METADATA[language];
  if (!meta) {
    throw new Error("UNSUPPORTED_LANGUAGE");
  }

  const parsedCases = testCases.map(tc => parseInputString(tc.input));

  switch(language) {
    case 'Python': return generatePythonWrapper(code, parsedCases, meta);
    case 'JavaScript': return generateJsWrapper(code, parsedCases, meta, false);
    case 'TypeScript': return generateJsWrapper(code, parsedCases, meta, true);
    case 'PHP': return generatePhpWrapper(code, parsedCases, meta);
    case 'C++': return generateCppWrapper(code, parsedCases, meta);
    case 'Java': return generateJavaWrapper(code, parsedCases, meta);
    case 'C#': return generateCsharpWrapper(code, parsedCases, meta);
    case 'Go': return generateGoWrapper(code, parsedCases, meta);
    case 'Rust': return generateRustWrapper(code, parsedCases, meta);
    case 'Kotlin': return generateKotlinWrapper(code, parsedCases, meta);
    case 'Swift': return generateSwiftWrapper(code, parsedCases, meta);
    default: throw new Error("UNSUPPORTED_LANGUAGE");
  }
}

function generatePythonWrapper(code, parsedCases, meta) {
  const testsJson = JSON.stringify(parsedCases);
  const invokeStr = meta.isClass 
    ? \`\${meta.className}().\${meta.methodName}(*tc)\`
    : \`\${meta.methodName}(*tc)\`;
  return \`
import json
import traceback

\${code}

if __name__ == "__main__":
    test_cases = json.loads('''\${testsJson}''')
    results = []
    for i, tc in enumerate(test_cases):
        try:
            res = \${invokeStr}
            results.append({"testCaseIndex": i, "actualOutput": res})
        except Exception as e:
            results.append({"testCaseIndex": i, "actualOutput": "RUNTIME_ERROR: " + str(e)})
    
    print(json.dumps(results))
\`;
}

function generateJsWrapper(code, parsedCases, meta, isTs) {
  const testsJson = JSON.stringify(parsedCases);
  const invokeStr = meta.isClass 
    ? \`new \${meta.className}().\${meta.methodName}(...tc)\`
    : \`\${meta.methodName}(...tc)\`;
  return \`
\${code}

const testCases = \${testsJson};
const results = [];
for (let i = 0; i < testCases.length; i++) {
    try {
        const tc = testCases[i];
        const res = \${invokeStr};
        results.push({testCaseIndex: i, actualOutput: res});
    } catch (e) {
        results.push({testCaseIndex: i, actualOutput: "RUNTIME_ERROR: " + (e.message || e)});
    }
}
console.log(JSON.stringify(results));
\`;
}

function toPhpLiteral(val) {
  if (Array.isArray(val)) return \`[\${val.map(toPhpLiteral).join(', ')}]\`;
  if (typeof val === 'string') return \`"\${val.replace(/"/g, '\\\\"')}"\`;
  return String(val);
}

function generatePhpWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? \`(new \${meta.className}())->\${meta.methodName}\` : \`\${meta.methodName}\`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
      const argsStr = tc.map(toPhpLiteral).join(', ');
      testCasesStr += \`
      try {
          $res = \${invokeStr}(\${argsStr});
          $results[] = ["testCaseIndex" => \${i}, "actualOutput" => $res];
      } catch (Throwable $e) {
          $results[] = ["testCaseIndex" => \${i}, "actualOutput" => "RUNTIME_ERROR: " . $e->getMessage()];
      }
\`;
  });
  // Ensure PHP tags are correct
  const safeCode = code.trim().startsWith('<?php') ? code.trim().substring(5) : code;
  return \`<?php
\${safeCode}

$results = [];
\${testCasesStr}
echo json_encode($results);
\`;
}

function toCppLiteral(val) {
  if (Array.isArray(val)) return \`{\${val.map(toCppLiteral).join(', ')}}\`;
  if (typeof val === 'string') return \`"\${val.replace(/"/g, '\\\\"')}"\`;
  return String(val);
}

function generateCppWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass 
    ? \`\${meta.className}().\${meta.methodName}\`
    : \`\${meta.methodName}\`;

  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toCppLiteral).join(', ');
    testCasesStr += \`
        try {
            auto res = \${invokeStr}(\${argsStr});
            std::cout << "{\\"testCaseIndex\\": " << \${i} << ", \\"actualOutput\\": " << toJson(res) << "}";
        } catch (const std::exception& e) {
            std::cout << "{\\"testCaseIndex\\": " << \${i} << ", \\"actualOutput\\": \\"RUNTIME_ERROR: " << e.what() << "\\"}";
        } catch (...) {
            std::cout << "{\\"testCaseIndex\\": " << \${i} << ", \\"actualOutput\\": \\"RUNTIME_ERROR: Unknown exception\\"}";
        }
        if (\${i} < \${parsedCases.length - 1}) std::cout << ", ";
\`;
  });

  return \`
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <map>
#include <set>
#include <algorithm>

template<typename T> std::string toJson(const T& val);
template<typename T> std::string toJson(const std::vector<T>& vec) {
    std::string res = "[";
    for(size_t i = 0; i < vec.size(); ++i) {
        res += toJson(vec[i]);
        if (i < vec.size() - 1) res += ", ";
    }
    res += "]";
    return res;
}
std::string toJson(const int& val) { return std::to_string(val); }
std::string toJson(const long long& val) { return std::to_string(val); }
std::string toJson(const double& val) { return std::to_string(val); }
std::string toJson(const bool& val) { return val ? "true" : "false"; }
std::string toJson(const std::string& val) { return "\\"" + val + "\\""; }

using namespace std;

\${code}

int main() {
    std::cout << "[";
\${testCasesStr}
    std::cout << "]" << std::endl;
    return 0;
}
\`;
}

function toJavaLiteral(val) {
  if (Array.isArray(val)) {
      if (val.length === 0) return "new int[]{}";
      if (Array.isArray(val[0])) return \`new int[][]{\${val.map(toJavaLiteral).join(', ')}}\`;
      if (typeof val[0] === 'string') return \`new String[]{\${val.map(toJavaLiteral).join(', ')}}\`;
      return \`new int[]{\${val.map(toJavaLiteral).join(', ')}}\`;
  }
  if (typeof val === 'string') return \`"\${val.replace(/"/g, '\\\\"')}"\`;
  return String(val);
}

function generateJavaWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? \`new \${meta.className}().\${meta.methodName}\` : \`\${meta.methodName}\`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toJavaLiteral).join(', ');
    testCasesStr += \`
        try {
            Object res = \${invokeStr}(\${argsStr});
            System.out.print("{\\"testCaseIndex\\": " + \${i} + ", \\"actualOutput\\": " + toJson(res) + "}");
        } catch (Exception e) {
            System.out.print("{\\"testCaseIndex\\": " + \${i} + ", \\"actualOutput\\": \\"RUNTIME_ERROR: " + e.getMessage() + "\\"}");
        }
        if (\${i} < \${parsedCases.length - 1}) System.out.print(", ");
\`;
  });

  return \`
import java.util.*;
import java.io.*;

\${code}

public class Main {
    public static String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof String) return "\\"" + o.toString().replace("\\"", "\\\\\\"") + "\\"";
        if (o instanceof int[]) return Arrays.toString((int[])o);
        if (o instanceof Object[]) {
            Object[] arr = (Object[])o;
            StringBuilder sb = new StringBuilder("[");
            for(int i=0; i<arr.length; i++) {
                sb.append(toJson(arr[i]));
                if(i < arr.length-1) sb.append(", ");
            }
            sb.append("]");
            return sb.toString();
        }
        if (o instanceof Iterable) {
            StringBuilder sb = new StringBuilder("[");
            Iterator it = ((Iterable)o).iterator();
            while(it.hasNext()) {
                sb.append(toJson(it.next()));
                if(it.hasNext()) sb.append(", ");
            }
            sb.append("]");
            return sb.toString();
        }
        return o.toString();
    }

    public static void main(String[] args) {
        System.out.print("[");
\${testCasesStr}
        System.out.print("]");
    }
}
\`;
}

function toCsharpLiteral(val) {
  if (Array.isArray(val)) {
      if (val.length === 0) return "new int[]{}";
      if (Array.isArray(val[0])) return \`new int[][]{\${val.map(toCsharpLiteral).join(', ')}}\`;
      if (typeof val[0] === 'string') return \`new string[]{\${val.map(toCsharpLiteral).join(', ')}}\`;
      return \`new int[]{\${val.map(toCsharpLiteral).join(', ')}}\`;
  }
  if (typeof val === 'string') return \`"\${val.replace(/"/g, '\\\\"')}"\`;
  return String(val);
}

function generateCsharpWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? \`new \${meta.className}().\${meta.methodName}\` : \`\${meta.methodName}\`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toCsharpLiteral).join(', ');
    testCasesStr += \`
        try {
            var res = \${invokeStr}(\${argsStr});
            Console.Write("{\\"testCaseIndex\\": " + \${i} + ", \\"actualOutput\\": " + ToJson(res) + "}");
        } catch (Exception e) {
            Console.Write("{\\"testCaseIndex\\": " + \${i} + ", \\"actualOutput\\": \\"RUNTIME_ERROR: " + e.Message + "\\"}");
        }
        if (\${i} < \${parsedCases.length - 1}) Console.Write(", ");
\`;
  });

  return \`
using System;
using System.Collections.Generic;

\${code}

public class Program {
    public static string ToJson(object o) {
        if (o == null) return "null";
        if (o is string s) return "\\"" + s.Replace("\\"", "\\\\\\"") + "\\"";
        if (o is int[] iArr) return "[" + string.Join(", ", iArr) + "]";
        if (o is string[] sArr) {
            var items = new List<string>();
            foreach (var item in sArr) items.Add(ToJson(item));
            return "[" + string.Join(", ", items) + "]";
        }
        if (o is System.Collections.IEnumerable e && !(o is string)) {
            var items = new List<string>();
            foreach (var item in e) items.Add(ToJson(item));
            return "[" + string.Join(", ", items) + "]";
        }
        return o.ToString();
    }

    public static void Main() {
        Console.Write("[");
\${testCasesStr}
        Console.Write("]");
    }
}
\`;
}

function toGoLiteral(val, isInner = false) {
  if (Array.isArray(val)) {
      if (val.length === 0) return isInner ? "{}" : "[]int{}";
      if (Array.isArray(val[0])) return (isInner ? "" : "[][]int") + \`{\${val.map(v => toGoLiteral(v, true)).join(', ')}}\`;
      if (typeof val[0] === 'string') return (isInner ? "" : "[]string") + \`{\${val.map(v => toGoLiteral(v, true)).join(', ')}}\`;
      return (isInner ? "" : "[]int") + \`{\${val.map(v => toGoLiteral(v, true)).join(', ')}}\`;
  }
  if (typeof val === 'string') return \`"\${val.replace(/"/g, '\\\\"')}"\`;
  return String(val);
}

function generateGoWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? \`\${meta.className}{}.\${meta.methodName}\` : \`\${meta.methodName}\`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(a => toGoLiteral(a)).join(', ');
    testCasesStr += \`
        func() {
            defer func() {
                if r := recover(); r != nil {
                    fmt.Printf("{\\"testCaseIndex\\": %d, \\"actualOutput\\": \\"RUNTIME_ERROR: %v\\"}", \${i}, r)
                }
            }()
            res := \${invokeStr}(\${argsStr})
            fmt.Printf("{\\"testCaseIndex\\": %d, \\"actualOutput\\": %s}", \${i}, toJson(res))
        }()
        if \${i} < \${parsedCases.length - 1} { fmt.Print(", ") }
\`;
  });

  // Basic package parsing
  const hasPackage = code.includes('package ');
  const codeLines = code.split('\\n').filter(l => !l.startsWith('package ')).join('\\n');

  return \`package main
import (
    "encoding/json"
    "fmt"
)

func toJson(val interface{}) string {
    b, err := json.Marshal(val)
    if err != nil { return "\\"error\\"" }
    return string(b)
}

\${codeLines}

func main() {
    fmt.Print("[")
\${testCasesStr}
    fmt.Print("]")
}
\`;
}

function toRustLiteral(val) {
  if (Array.isArray(val)) return \`vec![\${val.map(toRustLiteral).join(', ')}]\`;
  if (typeof val === 'string') return \`String::from("\${val.replace(/"/g, '\\\\"')}")\`;
  return String(val);
}

function generateRustWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? \`\${meta.className}::\${meta.methodName}\` : \`\${meta.methodName}\`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toRustLiteral).join(', ');
    testCasesStr += \`
        let res = \${invokeStr}(\${argsStr});
        print!("{{\\"testCaseIndex\\": {}, \\"actualOutput\\": {:?}}}", \${i}, res);
        if \${i} < \${parsedCases.length - 1} { print!(", "); }
\`;
  });

  return \`
\${code}

fn main() {
    print!("[");
\${testCasesStr}
    print!("]");
}
\`;
}

function toKotlinLiteral(val) {
  if (Array.isArray(val)) {
      if (val.length === 0) return "intArrayOf()";
      if (Array.isArray(val[0])) return \`arrayOf(\${val.map(toKotlinLiteral).join(', ')})\`;
      if (typeof val[0] === 'string') return \`arrayOf(\${val.map(toKotlinLiteral).join(', ')})\`;
      return \`intArrayOf(\${val.map(toKotlinLiteral).join(', ')})\`;
  }
  if (typeof val === 'string') return \`"\${val.replace(/"/g, '\\\\"')}"\`;
  return String(val);
}

function generateKotlinWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? \`\${meta.className}().\${meta.methodName}\` : \`\${meta.methodName}\`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toKotlinLiteral).join(', ');
    testCasesStr += \`
        try {
            val res = \${invokeStr}(\${argsStr})
            print("{\\"testCaseIndex\\": \${i}, \\"actualOutput\\": " + toJson(res) + "}")
        } catch (e: Exception) {
            print("{\\"testCaseIndex\\": \${i}, \\"actualOutput\\": \\"RUNTIME_ERROR: " + e.message + "\\"}")
        }
        if (\${i} < \${parsedCases.length - 1}) print(", ")
\`;
  });

  return \`
\${code}

fun toJson(o: Any?): String {
    if (o == null) return "null"
    if (o is String) return "\\"" + o.replace("\\"", "\\\\\\"") + "\\""
    if (o is IntArray) return o.joinToString(prefix = "[", postfix = "]")
    if (o is Array<*>) return o.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    if (o is Iterable<*>) return o.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    return o.toString()
}

fun main() {
    print("[")
\${testCasesStr}
    print("]")
}
\`;
}

function toSwiftLiteral(val) {
  if (Array.isArray(val)) return \`[\${val.map(toSwiftLiteral).join(', ')}]\`;
  if (typeof val === 'string') return \`"\${val.replace(/"/g, '\\\\"')}"\`;
  return String(val);
}

function generateSwiftWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? \`\${meta.className}().\${meta.methodName}\` : \`\${meta.methodName}\`;
  let testCasesStr = "";
  
  // Quick heuristic to get argument labels from Swift code if possible
  // For basic support, we will pass them without labels unless the starter code uses explicit labels.
  // Wait, Swift functions require argument labels. For \`solve(packages: [[Int]], maxPriority: Int)\`
  // we must pass \`solve(packages: ..., maxPriority: ...)\`
  
  // We can't parse Swift easily here, so we will assume the problem uses standard Swift function without labels if it's generic \`solve(_ arg: Int)\`, or we pass labels.
  // Actually, wait, let's just use the signature from the problem description or assume no labels for simplicity. 
  // Wait, in \`codingProblems.js\`: \`func solve(packages: [[Int]], maxPriority: Int) -> Int\`
  // This means the labels are \`packages\` and \`maxPriority\`.
  // This is tricky. Let's just use the array index as a fallback or assume the user removes labels: \`func solve(_ a: Int, _ b: Int)\`.
  // To avoid breaking Swift, I'll recommend using \`_ \` in the starter code, or I'll just pass them sequentially without labels in the wrapper.
  // Wait, if they don't use \`_\`, it fails to compile. We can modify the Swift starter code in \`codingProblems.js\` to use \`_\`!
  // I will just use \`\${invokeStr}( \${argsStr} )\` assuming they use \`_\`!
  
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toSwiftLiteral).join(', ');
    testCasesStr += \`
        let res\${i} = \${invokeStr}(\${argsStr})
        print("{\\"testCaseIndex\\": \${i}, \\"actualOutput\\": \\(toJson(res\${i}))}", terminator: "")
        if \${i} < \${parsedCases.length - 1} { print(", ", terminator: "") }
\`;
  });

  return \`
import Foundation

\${code}

func toJson(_ o: Any) -> String {
    if let s = o as? String {
        return "\\"" + s + "\\""
    }
    if let arr = o as? [Any] {
        let els = arr.map { toJson($0) }.joined(separator: ", ")
        return "[\\(els)]"
    }
    return "\\(o)"
}

print("[", terminator: "")
\${testCasesStr}
print("]")
\`;
}
`;

fs.writeFileSync('c:/interviewiq/server/services/executionWrappers.js', content);
console.log('Successfully wrote executionWrappers.js');
