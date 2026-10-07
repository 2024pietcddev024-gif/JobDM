
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
  let stripped = inputStr.replace(/[a-zA-Z_]+\s*=\s*/g, '');
  stripped = stripped.replace(/'/g, '"');
  try {
    return JSON.parse('[' + stripped + ']');
  } catch (e) {
    return [];
  }
}

export function generateWrapperCode(language, code, testCases, problemTitle, wrapperMetadata) {
  let meta = PROBLEM_METADATA[problemTitle]?.[language] || DEFAULT_METADATA[language];
  if (wrapperMetadata) {
    meta = { ...meta, ...wrapperMetadata };
  }
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
    ? `_smart_serialize(${meta.className}().${meta.methodName}(*_smart_convert(${meta.className}().${meta.methodName}, tc)))`
    : `_smart_serialize(${meta.methodName}(*_smart_convert(${meta.methodName}, tc)))`;
  return `
import json
import traceback
import inspect

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_tree(vals):
    if not vals: return None
    root = TreeNode(vals[0])
    q = [root]
    i = 1
    while q and i < len(vals):
        node = q.pop(0)
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i])
            q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i])
            q.append(node.right)
        i += 1
    return root

def build_list(vals):
    if not vals: return None
    head = ListNode(vals[0])
    curr = head
    for v in vals[1:]:
        curr.next = ListNode(v)
        curr = curr.next
    return head

def tree_to_list(root):
    if not root: return []
    res, q = [], [root]
    while any(q):
        node = q.pop(0)
        if node:
            res.append(node.val)
            q.extend([node.left, node.right])
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

def list_to_array(head):
    res = []
    while head:
        res.append(head.val)
        head = head.next
    return res

def _smart_convert(func, args):
    sig = inspect.signature(func)
    new_args = []
    for i, (name, param) in enumerate(sig.parameters.items()):
        if name == 'self':
            continue
        idx = i if 'self' not in sig.parameters else i - 1
        if idx >= len(args): break
        val = args[idx]
        if isinstance(val, list):
            if 'root' in name or 'tree' in name: val = build_tree(val)
            elif 'head' in name or 'list' in name or name in ('l1', 'l2'): val = build_list(val)
        new_args.append(val)
    return new_args

def _smart_serialize(res):
    if isinstance(res, TreeNode): return tree_to_list(res)
    if isinstance(res, ListNode): return list_to_array(res)
    return res

${code}

if __name__ == "__main__":
    test_cases = json.loads('''${testsJson}''')
    results = []
    for i, tc in enumerate(test_cases):
        try:
            if '${meta.isClass ? meta.className : ''}' and ('${meta.className}' in globals() or '${meta.className}' in locals()):
                func = ${meta.className}().${meta.methodName}
            elif '${meta.methodName}' in globals() or '${meta.methodName}' in locals():
                func = ${meta.methodName}
            else:
                raise Exception("Could not find target function or class")
            res = _smart_serialize(func(*_smart_convert(func, tc)))
            results.append({"testCaseIndex": i, "actualOutput": res})
        except Exception as e:
            results.append({"testCaseIndex": i, "actualOutput": "RUNTIME_ERROR: " + str(e)})
    
    print(json.dumps(results))
`;
}

function generateJsWrapper(code, parsedCases, meta, isTs) {
  const testsJson = JSON.stringify(parsedCases);
  const invokeStr = meta.isClass 
    ? `new ${meta.className}().${meta.methodName}(...tc)`
    : `${meta.methodName}(...tc)`;
  return `
${code}

const testCases = ${testsJson};
const results = [];
for (let i = 0; i < testCases.length; i++) {
    try {
        const tc = testCases[i];
        const res = ${invokeStr};
        results.push({testCaseIndex: i, actualOutput: res});
    } catch (e) {
        results.push({testCaseIndex: i, actualOutput: "RUNTIME_ERROR: " + (e.message || e)});
    }
}
console.log(JSON.stringify(results));
`;
}

function toPhpLiteral(val) {
  if (Array.isArray(val)) return `[${val.map(toPhpLiteral).join(', ')}]`;
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function generatePhpWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `(new ${meta.className}())->${meta.methodName}` : `${meta.methodName}`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
      const argsStr = tc.map(toPhpLiteral).join(', ');
      testCasesStr += `
      try {
          $res = ${invokeStr}(${argsStr});
          $results[] = ["testCaseIndex" => ${i}, "actualOutput" => $res];
      } catch (Throwable $e) {
          $results[] = ["testCaseIndex" => ${i}, "actualOutput" => "RUNTIME_ERROR: " . $e->getMessage()];
      }
`;
  });
  // Ensure PHP tags are correct
  const safeCode = code.trim().startsWith('<?php') ? code.trim().substring(5) : code;
  return `<?php
${safeCode}

$results = [];
${testCasesStr}
echo json_encode($results);
`;
}

function toCppLiteral(val, expectedType) {
  if (expectedType === 'TreeNode*') {
      return `buildTree(${toCppLiteral(val, 'vector<string>')})`;
  }
  if (expectedType === 'ListNode*') {
      return `buildList(${toCppLiteral(val, 'vector<int>')})`;
  }

  if (Array.isArray(val)) {
      if (val.length === 0) {
          if (expectedType === 'vector<string>') return "std::vector<std::string>{}";
          return "{}";
      }
      if (Array.isArray(val[0])) return `{${val.map(v => toCppLiteral(v)).join(', ')}}`;
      if (typeof val[0] === 'string' || expectedType === 'vector<string>') {
          return `{${val.map(v => v === null ? '"null"' : `"${v}"`).join(', ')}}`;
      }
      return `{${val.map(v => toCppLiteral(v)).join(', ')}}`;
  }
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function getCppParamTypes(code, methodName) {
    const regex = new RegExp(`(?:[\\w<>:\\s*&]+)\\s+${methodName}\\s*\\(([^)]*)\\)`);
    const match = code.match(regex);
    if (!match) return [];
    if (!match[1].trim()) return [];
    return match[1].split(',').map(p => {
        const parts = p.trim().split(/\s+/);
        parts.pop(); 
        return parts.join('');
    });
}

function generateCppWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass 
    ? `${meta.className}().${meta.methodName}`
    : `${meta.methodName}`;
  const pTypes = getCppParamTypes(code, meta.methodName);

  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map((val, idx) => toCppLiteral(val, pTypes[idx])).join(', ');
    testCasesStr += `
        try {
            auto res = ${invokeStr}(${argsStr});
            results += "{\\"testCaseIndex\\": " + std::to_string(${i}) + ", \\"actualOutput\\": " + toJson(res) + "}";
        } catch (const std::exception& e) {
            results += "{\\"testCaseIndex\\": " + std::to_string(${i}) + ", \\"actualOutput\\": \\"RUNTIME_ERROR: " + std::string(e.what()) + "\\"}";
        } catch (...) {
            results += "{\\"testCaseIndex\\": " + std::to_string(${i}) + ", \\"actualOutput\\": \\"RUNTIME_ERROR: Unknown exception\\"}";
        }
        if (${i} < ${parsedCases.length - 1}) results += ", ";
`;
  });

  return `
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <map>
#include <set>
#include <algorithm>
#include <queue>

using namespace std;

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

TreeNode* buildTree(const std::vector<std::string>& vals) {
    if (vals.empty() || vals[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(std::stoi(vals[0]));
    std::vector<TreeNode*> q = {root};
    int i = 1;
    int qIdx = 0;
    while (qIdx < q.size() && i < vals.size()) {
        TreeNode* node = q[qIdx++];
        if (i < vals.size() && vals[i] != "null") {
            node->left = new TreeNode(std::stoi(vals[i]));
            q.push_back(node->left);
        }
        i++;
        if (i < vals.size() && vals[i] != "null") {
            node->right = new TreeNode(std::stoi(vals[i]));
            q.push_back(node->right);
        }
        i++;
    }
    return root;
}

ListNode* buildList(const std::vector<int>& vals) {
    if (vals.empty()) return nullptr;
    ListNode* head = new ListNode(vals[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < vals.size(); ++i) {
        curr->next = new ListNode(vals[i]);
        curr = curr->next;
    }
    return head;
}

struct JsonRaw { std::string val; };

std::vector<JsonRaw> treeToList(TreeNode* root) {
    std::vector<JsonRaw> res;
    if (!root) return res;
    std::vector<TreeNode*> q = {root};
    int qIdx = 0;
    while (qIdx < q.size()) {
        bool anyNonNull = false;
        for (size_t i = qIdx; i < q.size(); ++i) {
            if (q[i]) { anyNonNull = true; break; }
        }
        if (!anyNonNull) break;
        
        TreeNode* node = q[qIdx++];
        if (node) {
            res.push_back(JsonRaw{std::to_string(node->val)});
            q.push_back(node->left);
            q.push_back(node->right);
        } else {
            res.push_back(JsonRaw{"null"});
        }
    }
    while (!res.empty() && res.back().val == "null") {
        res.pop_back();
    }
    return res;
}

std::vector<int> listToArray(ListNode* head) {
    std::vector<int> res;
    while (head) {
        res.push_back(head->val);
        head = head->next;
    }
    return res;
}

std::string toJson(const int& val);
std::string toJson(const long long& val);
std::string toJson(const double& val);
std::string toJson(const bool& val);
std::string toJson(const std::string& val);
std::string toJson(const JsonRaw& jr);
std::string toJson(TreeNode* node);
std::string toJson(ListNode* head);

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
std::string toJson(const JsonRaw& jr) { return jr.val; }
std::string toJson(TreeNode* node) { return toJson(treeToList(node)); }
std::string toJson(ListNode* head) { return toJson(listToArray(head)); }

${code}

int main() {
    std::string results = "\\n[";
${testCasesStr}
    results += "]\\n";
    std::cout << results << std::endl;
    return 0;
}
`;
}

function toJavaLiteral(val, expectedType) {
  if (expectedType === 'TreeNode') {
      return `Main.buildTree(${toJavaLiteral(val, 'Integer[]')})`;
  }
  if (expectedType === 'ListNode') {
      return `Main.buildList(${toJavaLiteral(val, 'int[]')})`; // ListNode uses int usually, or Integer? Let's use Integer[] to support nulls if any, but list won't have nulls, so int[] is fine. wait, better to output new Integer[] and let buildList take Integer[].
      // Actually, we can define buildList(Integer[]) and buildList(int[]).
  }
  
  if (Array.isArray(val)) {
      if (val.length === 0) {
          if (expectedType === 'Integer[]' || expectedType === 'TreeNode') return "new Integer[]{}";
          return "new int[]{}";
      }
      if (Array.isArray(val[0])) return `new int[][]{${val.map(v => toJavaLiteral(v)).join(', ')}}`;
      if (typeof val[0] === 'string') return `new String[]{${val.map(v => toJavaLiteral(v)).join(', ')}}`;
      
      const hasNull = val.includes(null);
      if (hasNull || expectedType === 'Integer[]') {
          return `new Integer[]{${val.map(v => v === null ? 'null' : v).join(', ')}}`;
      }
      return `new int[]{${val.map(v => toJavaLiteral(v)).join(', ')}}`;
  }
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function getJavaParamTypes(code, methodName) {
    const regex = new RegExp(`public\\s+(.+?)\\s+${methodName}\\s*\\(([^)]*)\\)`);
    const match = code.match(regex);
    if (!match) return [];
    if (!match[2].trim()) return [];
    return match[2].split(',').map(p => p.trim().split(/\s+/)[0]);
}

function generateJavaWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `new ${meta.className}().${meta.methodName}` : `${meta.methodName}`;
  const pTypes = getJavaParamTypes(code, meta.methodName);
  
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map((val, idx) => toJavaLiteral(val, pTypes[idx])).join(', ');
    testCasesStr += `
        try {
            Object res = ${invokeStr}(${argsStr});
            results.append("{\\"testCaseIndex\\": " + ${i} + ", \\"actualOutput\\": " + toJson(res) + "}");
        } catch (Exception e) {
            results.append("{\\"testCaseIndex\\": " + ${i} + ", \\"actualOutput\\": \\"RUNTIME_ERROR: " + e.getMessage() + "\\"}");
        }
        if (${i} < ${parsedCases.length - 1}) results.append(", ");
`;
  });

  return `
import java.util.*;
import java.io.*;

public class Main {
    public static TreeNode buildTree(Integer[] vals) {
        if (vals == null || vals.length == 0 || vals[0] == null) return null;
        TreeNode root = new TreeNode(vals[0]);
        Queue<TreeNode> q = new LinkedList<>();
        q.offer(root);
        int i = 1;
        while (!q.isEmpty() && i < vals.length) {
            TreeNode node = q.poll();
            if (i < vals.length && vals[i] != null) {
                node.left = new TreeNode(vals[i]);
                q.offer(node.left);
            }
            i++;
            if (i < vals.length && vals[i] != null) {
                node.right = new TreeNode(vals[i]);
                q.offer(node.right);
            }
            i++;
        }
        return root;
    }

    public static ListNode buildList(Integer[] vals) {
        if (vals == null || vals.length == 0) return null;
        ListNode head = new ListNode(vals[0]);
        ListNode curr = head;
        for (int i = 1; i < vals.length; i++) {
            curr.next = new ListNode(vals[i]);
            curr = curr.next;
        }
        return head;
    }

    public static ListNode buildList(int[] vals) {
        if (vals == null || vals.length == 0) return null;
        ListNode head = new ListNode(vals[0]);
        ListNode curr = head;
        for (int i = 1; i < vals.length; i++) {
            curr.next = new ListNode(vals[i]);
            curr = curr.next;
        }
        return head;
    }

    public static List<Integer> treeToList(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        if (root == null) return res;
        Queue<TreeNode> q = new LinkedList<>();
        q.offer(root);
        while (!q.isEmpty()) {
            boolean anyNonNull = false;
            for (TreeNode n : q) {
                if (n != null) { anyNonNull = true; break; }
            }
            if (!anyNonNull) break;
            
            TreeNode node = q.poll();
            if (node != null) {
                res.add(node.val);
                q.offer(node.left);
                q.offer(node.right);
            } else {
                res.add(null);
            }
        }
        while (!res.isEmpty() && res.get(res.size() - 1) == null) {
            res.remove(res.size() - 1);
        }
        return res;
    }

    public static List<Integer> listToArray(ListNode head) {
        List<Integer> res = new ArrayList<>();
        while (head != null) {
            res.add(head.val);
            head = head.next;
        }
        return res;
    }

    public static String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof TreeNode) o = treeToList((TreeNode) o);
        if (o instanceof ListNode) o = listToArray((ListNode) o);
        
        if (o instanceof String) return "\\"" + o.toString().replace("\\\"", "\\\\\\\"") + "\\\"";
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
        StringBuilder results = new StringBuilder();
        results.append("\\n[");
${testCasesStr}
        results.append("]\\n");
        System.out.println(results.toString());
    }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

${code}
`;
}

function toCsharpLiteral(val) {
  if (Array.isArray(val)) {
      if (val.length === 0) return "new int[]{}";
      if (Array.isArray(val[0])) return `new int[][]{${val.map(toCsharpLiteral).join(', ')}}`;
      if (typeof val[0] === 'string') return `new string[]{${val.map(toCsharpLiteral).join(', ')}}`;
      return `new int[]{${val.map(toCsharpLiteral).join(', ')}}`;
  }
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function generateCsharpWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `new ${meta.className}().${meta.methodName}` : `${meta.methodName}`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toCsharpLiteral).join(', ');
    testCasesStr += `
        try {
            var res = ${invokeStr}(${argsStr});
            Console.Write("{\\"testCaseIndex\\": " + ${i} + ", \\"actualOutput\\": " + ToJson(res) + "}");
        } catch (Exception e) {
            Console.Write("{\\"testCaseIndex\\": " + ${i} + ", \\"actualOutput\\": \\"RUNTIME_ERROR: " + e.Message + "\\"}");
        }
        if (${i} < ${parsedCases.length - 1}) Console.Write(", ");
`;
  });

  return `
using System;
using System.Collections.Generic;

${code}

public class Program {
    public static string ToJson(object o) {
        if (o == null) return "null";
        if (o is string s) return "\\"" + s.Replace("\\"", "\\\\"") + "\\"";
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
${testCasesStr}
        Console.Write("]");
    }
}
`;
}

function toGoLiteral(val, isInner = false) {
  if (Array.isArray(val)) {
      if (val.length === 0) return isInner ? "{}" : "[]int{}";
      if (Array.isArray(val[0])) return (isInner ? "" : "[][]int") + `{${val.map(v => toGoLiteral(v, true)).join(', ')}}`;
      if (typeof val[0] === 'string') return (isInner ? "" : "[]string") + `{${val.map(v => toGoLiteral(v, true)).join(', ')}}`;
      return (isInner ? "" : "[]int") + `{${val.map(v => toGoLiteral(v, true)).join(', ')}}`;
  }
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function generateGoWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `${meta.className}{}.${meta.methodName}` : `${meta.methodName}`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(a => toGoLiteral(a)).join(', ');
    testCasesStr += `
        func() {
            defer func() {
                if r := recover(); r != nil {
                    fmt.Printf("{\\"testCaseIndex\\": %d, \\"actualOutput\\": \\"RUNTIME_ERROR: %v\\"}", ${i}, r)
                }
            }()
            res := ${invokeStr}(${argsStr})
            fmt.Printf("{\\"testCaseIndex\\": %d, \\"actualOutput\\": %s}", ${i}, toJson(res))
        }()
        if ${i} < ${parsedCases.length - 1} { fmt.Print(", ") }
`;
  });

  // Basic package parsing
  const hasPackage = code.includes('package ');
  const codeLines = code.split('\n').filter(l => !l.startsWith('package ')).join('\n');

  return `package main
import (
    "encoding/json"
    "fmt"
)

func toJson(val interface{}) string {
    b, err := json.Marshal(val)
    if err != nil { return "\\"error\\"" }
    return string(b)
}

${codeLines}

func main() {
    fmt.Print("[")
${testCasesStr}
    fmt.Print("]")
}
`;
}

function toRustLiteral(val) {
  if (Array.isArray(val)) return `vec![${val.map(toRustLiteral).join(', ')}]`;
  if (typeof val === 'string') return `String::from("${val.replace(/"/g, '\\\"')}")`;
  return String(val);
}

function generateRustWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `${meta.className}::${meta.methodName}` : `${meta.methodName}`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toRustLiteral).join(', ');
    testCasesStr += `
        let res = ${invokeStr}(${argsStr});
        print!("{{\\"testCaseIndex\\": {}, \\"actualOutput\\": {:?}}}", ${i}, res);
        if ${i} < ${parsedCases.length - 1} { print!(", "); }
`;
  });

  return `
${code}

fn main() {
    print!("[");
${testCasesStr}
    print!("]");
}
`;
}

function toKotlinLiteral(val) {
  if (Array.isArray(val)) {
      if (val.length === 0) return "intArrayOf()";
      if (Array.isArray(val[0])) return `arrayOf(${val.map(toKotlinLiteral).join(', ')})`;
      if (typeof val[0] === 'string') return `arrayOf(${val.map(toKotlinLiteral).join(', ')})`;
      return `intArrayOf(${val.map(toKotlinLiteral).join(', ')})`;
  }
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function generateKotlinWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `${meta.className}().${meta.methodName}` : `${meta.methodName}`;
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toKotlinLiteral).join(', ');
    testCasesStr += `
        try {
            val res = ${invokeStr}(${argsStr})
            print("{\\"testCaseIndex\\": ${i}, \\"actualOutput\\": " + toJson(res) + "}")
        } catch (e: Exception) {
            print("{\\"testCaseIndex\\": ${i}, \\"actualOutput\\": \\"RUNTIME_ERROR: " + e.message + "\\"}")
        }
        if (${i} < ${parsedCases.length - 1}) print(", ")
`;
  });

  return `
${code}

fun toJson(o: Any?): String {
    if (o == null) return "null"
    if (o is String) return "\\"" + o.replace("\\"", "\\\\"") + "\\""
    if (o is IntArray) return o.joinToString(prefix = "[", postfix = "]")
    if (o is Array<*>) return o.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    if (o is Iterable<*>) return o.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    return o.toString()
}

fun main() {
    print("[")
${testCasesStr}
    print("]")
}
`;
}

function toSwiftLiteral(val) {
  if (Array.isArray(val)) return `[${val.map(toSwiftLiteral).join(', ')}]`;
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function generateSwiftWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `${meta.className}().${meta.methodName}` : `${meta.methodName}`;
  let testCasesStr = "";
  
  // Quick heuristic to get argument labels from Swift code if possible
  // For basic support, we will pass them without labels unless the starter code uses explicit labels.
  // Wait, Swift functions require argument labels. For `solve(packages: [[Int]], maxPriority: Int)`
  // we must pass `solve(packages: ..., maxPriority: ...)`
  
  // We can't parse Swift easily here, so we will assume the problem uses standard Swift function without labels if it's generic `solve(_ arg: Int)`, or we pass labels.
  // Actually, wait, let's just use the signature from the problem description or assume no labels for simplicity. 
  // Wait, in `codingProblems.js`: `func solve(packages: [[Int]], maxPriority: Int) -> Int`
  // This means the labels are `packages` and `maxPriority`.
  // This is tricky. Let's just use the array index as a fallback or assume the user removes labels: `func solve(_ a: Int, _ b: Int)`.
  // To avoid breaking Swift, I'll recommend using `_ ` in the starter code, or I'll just pass them sequentially without labels in the wrapper.
  // Wait, if they don't use `_`, it fails to compile. We can modify the Swift starter code in `codingProblems.js` to use `_`!
  // I will just use `${invokeStr}( ${argsStr} )` assuming they use `_`!
  
  parsedCases.forEach((tc, i) => {
    const argsStr = tc.map(toSwiftLiteral).join(', ');
    testCasesStr += `
        let res${i} = ${invokeStr}(${argsStr})
        print("{\\"testCaseIndex\\": ${i}, \\"actualOutput\\": \(toJson(res${i}))}", terminator: "")
        if ${i} < ${parsedCases.length - 1} { print(", ", terminator: "") }
`;
  });

  return `
import Foundation

${code}

func toJson(_ o: Any) -> String {
    if let s = o as? String {
        return "\\"" + s + "\\""
    }
    if let arr = o as? [Any] {
        let els = arr.map { toJson($0) }.joined(separator: ", ")
        return "[\(els)]"
    }
    return "\(o)"
}

print("[", terminator: "")
${testCasesStr}
print("]")
`;
}
