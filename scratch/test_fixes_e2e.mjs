import db from '../server/db.js';

// We implement the 3 minimal fixes here in this test script to verify if all 17 tests pass:

function toCppLiteral(val, expectedType) {
  if (expectedType === 'TreeNode*') return `buildTree(${toCppLiteral(val, 'vector<string>')})`;
  if (expectedType === 'ListNode*') return `buildList(${toCppLiteral(val, 'vector<int>')})`;
  if (Array.isArray(val)) {
    if (val.length === 0) return expectedType === 'vector<string>' ? "std::vector<std::string>{}" : "{}";
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
  if (!match || !match[1].trim()) return [];
  return match[1].split(',').map(p => {
    const parts = p.trim().split(/\s+/);
    parts.pop(); 
    return parts.join('');
  });
}

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

function toJavaLiteral(val, expectedType) {
  if (expectedType === 'TreeNode') return `Main.buildTree(${toJavaLiteral(val, 'Integer[]')})`;
  if (expectedType === 'ListNode') return `Main.buildList(${toJavaLiteral(val, 'int[]')})`;
  if (Array.isArray(val)) {
    if (val.length === 0) return (expectedType === 'Integer[]' || expectedType === 'TreeNode') ? "new Integer[]{}" : "new int[]{}";
    if (Array.isArray(val[0])) return `new int[][]{${val.map(v => toJavaLiteral(v)).join(', ')}}`;
    if (typeof val[0] === 'string') return `new String[]{${val.map(v => toJavaLiteral(v)).join(', ')}}`;
    const hasNull = val.includes(null);
    if (hasNull || expectedType === 'Integer[]') return `new Integer[]{${val.map(v => v === null ? 'null' : v).join(', ')}}`;
    return `new int[]{${val.map(v => toJavaLiteral(v)).join(', ')}}`;
  }
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\\"')}"`;
  return String(val);
}

function getJavaParamTypes(code, methodName) {
  const regex = new RegExp(`public\\s+(.+?)\\s+${methodName}\\s*\\(([^)]*)\\)`);
  const match = code.match(regex);
  if (!match || !match[2].trim()) return [];
  return match[2].split(',').map(p => p.trim().split(/\s+/)[0]);
}

// 1. Patched C++ Wrapper
function generateCppWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `${meta.className}().${meta.methodName}` : `${meta.methodName}`;
  const pTypes = getCppParamTypes(code, meta.methodName);
  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const actualArgs = (pTypes.length > 1 && tc.length === 1 && Array.isArray(tc[0])) ? tc[0] : tc;
    const argsStr = actualArgs.map((val, idx) => toCppLiteral(val, pTypes[idx])).join(', ');
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
    while (!res.empty() && res.back().val == "null") res.pop_back();
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

// 2. Patched Java Wrapper
function generateJavaWrapper(code, parsedCases, meta) {
  const invokeStr = meta.isClass ? `new ${meta.className}().${meta.methodName}` : `${meta.methodName}`;
  const pTypes = getJavaParamTypes(code, meta.methodName);
  
  // Extract user import statements so they appear at the top of the file
  const importLines = [];
  const nonImportLines = [];
  code.split('\n').forEach(line => {
    if (line.trim().startsWith('import ')) importLines.push(line.trim());
    else nonImportLines.push(line);
  });
  const cleanCode = nonImportLines.join('\n');
  const userImports = importLines.join('\n');

  let testCasesStr = "";
  parsedCases.forEach((tc, i) => {
    const actualArgs = (pTypes.length > 1 && tc.length === 1 && Array.isArray(tc[0])) ? tc[0] : tc;
    const argsStr = actualArgs.map((val, idx) => toJavaLiteral(val, pTypes[idx])).join(', ');
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
${userImports}

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
        while (!res.isEmpty() && res.get(res.size() - 1) == null) res.remove(res.size() - 1);
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

${cleanCode}
`;
}

// 3. Patched Python Wrapper
function generatePythonWrapper(code, parsedCases, meta) {
  const testsJson = JSON.stringify(parsedCases);
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
    while res and res[-1] is None: res.pop()
    return res

def list_to_array(head):
    res = []
    while head:
        res.append(head.val)
        head = head.next
    return res

def _smart_convert(func, args):
    sig = inspect.signature(func)
    params = [p for p in sig.parameters.values() if p.name != 'self']
    if len(args) == 1 and isinstance(args[0], (list, tuple)) and len(params) > 1 and len(args[0]) >= len(params):
        args = args[0]
    new_args = []
    for i, p in enumerate(params):
        if i >= len(args): break
        val = args[i]
        if isinstance(val, list):
            if 'root' in p.name or 'tree' in p.name: val = build_tree(val)
            elif 'head' in p.name or 'list' in p.name or p.name in ('l1', 'l2'): val = build_list(val)
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

// Execute through Piston directly with compilation classification
async function executeWithPatchedLogic(language, code, testCases, problemTitle, meta) {
  const parsedCases = testCases.map(tc => parseInputString(tc.input));
  let finalCode;
  let filename, version;
  if (language === 'Python') {
    finalCode = generatePythonWrapper(code, parsedCases, meta);
    filename = 'main.py'; version = '3.10.0';
  } else if (language === 'Java') {
    finalCode = generateJavaWrapper(code, parsedCases, meta);
    filename = 'Main.java'; version = '15.0.2';
  } else if (language === 'C++') {
    finalCode = generateCppWrapper(code, parsedCases, meta);
    filename = 'main.cpp'; version = '10.2.0';
  }

  const payload = {
    language: language === 'C++' ? 'c++' : language.toLowerCase(),
    version,
    files: [{ name: filename, content: finalCode }]
  };

  const res = await fetch('http://localhost:2000/api/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  const runOutput = data.run ? data.run.stdout : '';
  const runStderr = data.run ? data.run.stderr : '';
  const compileError = data.compile ? data.compile.stderr : '';

  if (data.compile && data.compile.code !== 0) {
    return { status: 'compilation_error', compileError: compileError || runOutput, passedCount: 0, totalCount: testCases.length };
  }
  if (data.run && data.run.code !== 0 && !runOutput.includes('actualOutput')) {
    const isCompileErr = runStderr.includes('error: compilation failed') || runStderr.includes('error: not a statement');
    if (isCompileErr) {
      return { status: 'compilation_error', compileError: runStderr, passedCount: 0, totalCount: testCases.length };
    }
    return { status: 'runtime_error', runtimeError: runStderr || runOutput, passedCount: 0, totalCount: testCases.length };
  }

  let parsedRunOutput = [];
  try {
    const match = runOutput.match(/\[.*\]/s);
    if (match) parsedRunOutput = JSON.parse(match[0]);
  } catch(e) {}

  let passedCount = 0;
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const outItem = parsedRunOutput.find(r => r.testCaseIndex === i) || {};
    const actualOutput = outItem.actualOutput;
    const isRuntimeError = typeof actualOutput === 'string' && actualOutput.startsWith('RUNTIME_ERROR');
    const passed = !isRuntimeError && (JSON.stringify(actualOutput) === JSON.stringify(JSON.parse(tc.expectedOutput)) || String(actualOutput).trim() === String(tc.expectedOutput).trim());
    if (passed) passedCount++;
  }

  return {
    status: passedCount === testCases.length ? 'success' : 'wrong_answer',
    passedCount,
    totalCount: testCases.length
  };
}

// Now test all 6 previously failing scenarios:
async function testAll() {
  console.log("=== TESTING PATCHED IMPLEMENTATION ===");

  // 1. Java Compilation Error
  const res1 = await executeWithPatchedLogic('Java', `class Solution { public int solve(int[] n) { invalid syntax; } }`, [{ input: "[1]", expectedOutput: "1" }], 'Test', { isClass: true, className: 'Solution', methodName: 'solve' });
  console.log("1. Java Compilation Error Status:", res1.status, res1.status === 'compilation_error' ? '-> PASS' : '-> FAIL');

  // 2. Java with import java.util.* on dsa-div-2
  const probDiv2 = (await db.query('SELECT * FROM coding_problems WHERE id = $1', ['dsa-div-2'])).rows[0];
  const tcsDiv2 = (await db.query('SELECT input, expected_output FROM coding_test_cases WHERE problem_id = $1', ['dsa-div-2'])).rows.map(r => ({ input: r.input, expectedOutput: r.expected_output }));
  const javaDiv2Code = `import java.util.*;
class Solution {
    public int[] solve(int[] nums) {
        List<Integer> list = new ArrayList<>();
        for (int x : nums) if (x % 2 == 0) list.add(x);
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}`;
  const res2 = await executeWithPatchedLogic('Java', javaDiv2Code, tcsDiv2, probDiv2.title, probDiv2.wrapper_metadata);
  console.log("2. Java with imports (dsa-div-2):", res2.passedCount, "/", res2.totalCount, res2.status === 'success' ? '-> PASS' : '-> FAIL');

  // 3. Multi-Arg Two Sum II in Python
  const probTwoSum = (await db.query('SELECT * FROM coding_problems WHERE id = $1', ['dsa-b3-1'])).rows[0];
  const tcsTwoSum = (await db.query('SELECT input, expected_output FROM coding_test_cases WHERE problem_id = $1', ['dsa-b3-1'])).rows.map(r => ({ input: r.input, expectedOutput: r.expected_output }));
  const pyTwoSumCode = `class Solution:
    def solve(self, numbers, target):
        l, r = 0, len(numbers) - 1
        while l < r:
            s = numbers[l] + numbers[r]
            if s == target: return [l + 1, r + 1]
            elif s < target: l += 1
            else: r -= 1
        return []`;
  const res3 = await executeWithPatchedLogic('Python', pyTwoSumCode, tcsTwoSum, probTwoSum.title, probTwoSum.wrapper_metadata);
  console.log("3. Multi-Arg Python (Two Sum II):", res3.passedCount, "/", res3.totalCount, res3.status === 'success' ? '-> PASS' : '-> FAIL');

  // 4. Multi-Arg Two Sum II in Java
  const javaTwoSumCode = `class Solution {
    public int[] solve(int[] numbers, int target) {
        int l = 0, r = numbers.length - 1;
        while (l < r) {
            int s = numbers[l] + numbers[r];
            if (s == target) return new int[]{l + 1, r + 1};
            else if (s < target) l++;
            else r--;
        }
        return new int[]{};
    }
}`;
  const res4 = await executeWithPatchedLogic('Java', javaTwoSumCode, tcsTwoSum, probTwoSum.title, probTwoSum.wrapper_metadata);
  console.log("4. Multi-Arg Java (Two Sum II):", res4.passedCount, "/", res4.totalCount, res4.status === 'success' ? '-> PASS' : '-> FAIL');

  // 5. Multi-Arg Two Sum II in C++
  const cppTwoSumCode = `#include <vector>
using namespace std;
class Solution {
public:
    vector<int> solve(vector<int> numbers, int target) {
        int l = 0, r = numbers.size() - 1;
        while (l < r) {
            int s = numbers[l] + numbers[r];
            if (s == target) return {l + 1, r + 1};
            else if (s < target) l++;
            else r--;
        }
        return {};
    }
};`;
  const res5 = await executeWithPatchedLogic('C++', cppTwoSumCode, tcsTwoSum, probTwoSum.title, probTwoSum.wrapper_metadata);
  console.log("5. Multi-Arg C++ (Two Sum II):", res5.passedCount, "/", res5.totalCount, res5.status === 'success' ? '-> PASS' : '-> FAIL');

  process.exit(0);
}

testAll().catch(e => { console.error(e); process.exit(1); });
