import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- BACKTRACKING (5) ---
  {
    topic: "Backtracking", title: "Subsets", difficulty: "Medium",
    desc: "Given an integer array `nums` of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.",
    meta: { input_format: "Array of integers", output_format: "2D Array of integers", constraints: ["1 <= nums.length <= 10"] },
    hints: ["Use backtracking to either include or exclude each element."],
    inputs: [ [[1,2,3]], [[0]], [[1,2]], [[4,5,6,7]] ],
    refFn: (nums) => {
      let res = [];
      const dfs = (i, path) => {
        if(i===nums.length) { res.push([...path]); return; }
        path.push(nums[i]); dfs(i+1, path);
        path.pop(); dfs(i+1, path);
      };
      dfs(0, []);
      // Sort output arrays for deterministic matching
      for(let a of res) a.sort((a,b)=>a-b);
      res.sort((a,b) => {
        if(a.length !== b.length) return a.length - b.length;
        for(let i=0; i<a.length; i++) { if(a[i]!==b[i]) return a[i]-b[i]; }
        return 0;
      });
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "Combinations", difficulty: "Medium",
    desc: "Given two integers `n` and `k`, return all possible combinations of `k` numbers chosen from the range `[1, n]`. You may return the answer in any order.",
    meta: { input_format: "Integer `n`, Integer `k`", output_format: "2D Array of integers", constraints: ["1 <= n <= 20", "1 <= k <= n"] },
    hints: ["Use backtracking. Start from 1 up to n, and pick elements until the path length is k."],
    inputs: [ [4, 2], [1, 1], [5, 3], [3, 3] ],
    refFn: (n, k) => {
      let res = [];
      const dfs = (start, path) => {
        if(path.length===k) { res.push([...path]); return; }
        for(let i=start; i<=n; i++) {
          path.push(i); dfs(i+1, path); path.pop();
        }
      };
      dfs(1, []);
      for(let a of res) a.sort((a,b)=>a-b);
      res.sort((a,b) => {
        for(let i=0; i<a.length; i++) { if(a[i]!==b[i]) return a[i]-b[i]; }
        return 0;
      });
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n, k):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int n, int k) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(int n, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "Permutations", difficulty: "Medium",
    desc: "Given an array `nums` of distinct integers, return all the possible permutations. You can return the answer in any order.",
    meta: { input_format: "Array of integers", output_format: "2D Array of integers", constraints: ["1 <= nums.length <= 6"] },
    hints: ["Use backtracking with a visited set or array to keep track of used elements."],
    inputs: [ [[1,2,3]], [[0,1]], [[1]], [[4,5,6]] ],
    refFn: (nums) => {
      let res = [];
      const dfs = (path, used) => {
        if(path.length===nums.length) { res.push([...path]); return; }
        for(let i=0; i<nums.length; i++) {
          if(!used[i]) {
            used[i] = true; path.push(nums[i]);
            dfs(path, used);
            path.pop(); used[i] = false;
          }
        }
      };
      dfs([], Array(nums.length).fill(false));
      res.sort((a,b) => {
        for(let i=0; i<a.length; i++) { if(a[i]!==b[i]) return a[i]-b[i]; }
        return 0;
      });
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "Combination Sum", difficulty: "Medium",
    desc: "Given an array of distinct integers `candidates` and a target integer `target`, return a list of all unique combinations of `candidates` where the chosen numbers sum to `target`. You may return the combinations in any order. The same number may be chosen from `candidates` an unlimited number of times.",
    meta: { input_format: "Array of integers `candidates`, Integer `target`", output_format: "2D Array of integers", constraints: ["1 <= candidates.length <= 30"] },
    hints: ["Sort candidates. Backtrack and decide whether to include the current candidate again or move to the next."],
    inputs: [ [[2,3,6,7], 7], [[2,3,5], 8], [[2], 1], [[2,4,6,8], 10] ],
    refFn: (c, t) => {
      c.sort((a,b)=>a-b);
      let res = [];
      const dfs = (i, sum, path) => {
        if(sum===t) { res.push([...path]); return; }
        if(sum>t || i>=c.length) return;
        path.push(c[i]); dfs(i, sum+c[i], path);
        path.pop(); dfs(i+1, sum, path);
      };
      dfs(0, 0, []);
      for(let a of res) a.sort((a,b)=>a-b);
      res.sort((a,b) => {
        if(a.length !== b.length) return a.length - b.length;
        for(let i=0; i<a.length; i++) { if(a[i]!==b[i]) return a[i]-b[i]; }
        return 0;
      });
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, candidates, target):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] candidates, int target) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> candidates, int target) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "N-Queens", difficulty: "Hard",
    desc: "The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other. Given an integer `n`, return all distinct solutions to the n-queens puzzle. You may return the answer in any order. Each solution contains a distinct board configuration of the n-queens' placement, where 'Q' and '.' both indicate a queen and an empty space, respectively.",
    meta: { input_format: "Integer `n`", output_format: "2D Array of strings", constraints: ["1 <= n <= 9"] },
    hints: ["Use backtracking with three sets: columns, positive diagonals (r+c), and negative diagonals (r-c)."],
    inputs: [ [4], [1], [5], [6] ],
    refFn: (n) => {
      let res = [];
      let board = Array(n).fill().map(()=>Array(n).fill('.'));
      const dfs = (r, cols, posDiag, negDiag) => {
        if(r===n) { res.push(board.map(row=>row.join(''))); return; }
        for(let c=0; c<n; c++) {
          if(cols.has(c) || posDiag.has(r+c) || negDiag.has(r-c)) continue;
          cols.add(c); posDiag.add(r+c); negDiag.add(r-c);
          board[r][c] = 'Q';
          dfs(r+1, cols, posDiag, negDiag);
          board[r][c] = '.';
          cols.delete(c); posDiag.delete(r+c); negDiag.delete(r-c);
        }
      };
      dfs(0, new Set(), new Set(), new Set());
      res.sort((a,b) => a.join('').localeCompare(b.join('')));
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<String>> solve(int n) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<string>> solve(int n) {\n        return {};\n    }\n}"
    }
  },

  // --- BIT MANIPULATION (5) ---
  {
    topic: "Bit Manipulation", title: "Single Number", difficulty: "Easy",
    desc: "Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one. You must implement a solution with a linear runtime complexity and use only constant extra space.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 3 * 10^4"] },
    hints: ["Use XOR operation. a XOR a = 0, and a XOR 0 = a."],
    inputs: [ [[2,2,1]], [[4,1,2,1,2]], [[1]], [[-1,-1,-2]] ],
    refFn: (nums) => nums.reduce((a,b)=>a^b, 0),
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Bit Manipulation", title: "Number of 1 Bits", difficulty: "Easy",
    desc: "Write a function that takes the binary representation of a positive integer and returns the number of set bits it has (also known as the Hamming weight).",
    meta: { input_format: "Integer `n`", output_format: "Integer", constraints: ["1 <= n <= 2^31 - 1"] },
    hints: ["Use n & (n-1) to drop the lowest set bit repeatedly."],
    inputs: [ [11], [128], [2147483645], [15] ],
    refFn: (n) => { let c=0; while(n!==0) { n=n&(n-1); c++; } return c; },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public int solve(int n) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Bit Manipulation", title: "Counting Bits", difficulty: "Easy",
    desc: "Given an integer `n`, return an array `ans` of length `n + 1` such that for each `i` (0 <= i <= n), `ans[i]` is the number of 1's in the binary representation of `i`.",
    meta: { input_format: "Integer `n`", output_format: "Array of integers", constraints: ["0 <= n <= 10^5"] },
    hints: ["dp[i] = dp[i >> 1] + (i & 1)."],
    inputs: [ [2], [5], [0], [10] ],
    refFn: (n) => {
      let res = Array(n+1).fill(0);
      for(let i=1; i<=n; i++) res[i] = res[i>>1] + (i&1);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public int[] solve(int n) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(int n) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Bit Manipulation", title: "Reverse Bits", difficulty: "Easy",
    desc: "Reverse bits of a given 32 bits unsigned integer.",
    meta: { input_format: "Integer `n`", output_format: "Integer", constraints: ["The input must be an integer, which will be treated as unsigned 32-bit."] },
    hints: ["Extract the lowest bit, shift the result to the left, and OR with the extracted bit."],
    inputs: [ [43261596], [3221225471], [0], [1] ],
    refFn: (n) => {
      let res = 0;
      for(let i=0; i<32; i++) { res = (res*2) + (n&1); n>>=1; }
      return res >>> 0;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public int solve(int n) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    uint32_t solve(uint32_t n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Bit Manipulation", title: "Missing Number", difficulty: "Easy",
    desc: "Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Compute the expected sum of 0 to n and subtract the actual sum.", "Or XOR all numbers from 0 to n, and XOR with elements in the array."],
    inputs: [ [[3,0,1]], [[0,1]], [[9,6,4,2,3,5,7,0,1]], [[0]] ],
    refFn: (nums) => {
      let n = nums.length;
      let sum = (n*(n+1))/2;
      return sum - nums.reduce((a,b)=>a+b, 0);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },

  // --- MATH (5) ---
  {
    topic: "Math", title: "Fizz Buzz", difficulty: "Easy",
    desc: "Given an integer `n`, return a string array `answer` (1-indexed) where: answer[i] == 'FizzBuzz' if i is divisible by 3 and 5. answer[i] == 'Fizz' if i is divisible by 3. answer[i] == 'Buzz' if i is divisible by 5. answer[i] == i (as a string) if none of the above conditions are true.",
    meta: { input_format: "Integer `n`", output_format: "Array of strings", constraints: ["1 <= n <= 10^4"] },
    hints: ["Check divisibility by 15 first, then 3 and 5."],
    inputs: [ [3], [5], [15], [1] ],
    refFn: (n) => {
      let res = [];
      for(let i=1; i<=n; i++) {
        if(i%15===0) res.push("FizzBuzz");
        else if(i%3===0) res.push("Fizz");
        else if(i%5===0) res.push("Buzz");
        else res.push(i.toString());
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(int n) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(int n) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Palindrome Number", difficulty: "Easy",
    desc: "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.",
    meta: { input_format: "Integer `x`", output_format: "Boolean", constraints: ["-2^31 <= x <= 2^31 - 1"] },
    hints: ["Negative numbers are never palindromes.", "Reverse the integer mathematically and compare it to the original."],
    inputs: [ [121], [-121], [10], [12321] ],
    refFn: (x) => {
      if(x<0) return false;
      let rev = 0, orig = x;
      while(x>0) { rev = (rev*10) + (x%10); x=Math.floor(x/10); }
      return rev===orig;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, x):\n        pass",
      Java: "class Solution {\n    public boolean solve(int x) {\n        return false;\n    }\n}",
      "C++": "class Solution {\npublic:\n    bool solve(int x) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Power of Two", difficulty: "Easy",
    desc: "Given an integer `n`, return `true` if it is a power of two. Otherwise, return `false`. An integer `n` is a power of two, if there exists an integer `x` such that `n == 2^x`.",
    meta: { input_format: "Integer `n`", output_format: "Boolean", constraints: ["-2^31 <= n <= 2^31 - 1"] },
    hints: ["A power of two has exactly one bit set in its binary representation.", "Check if n > 0 and (n & (n - 1)) == 0."],
    inputs: [ [1], [16], [3], [0] ],
    refFn: (n) => { return n > 0 && (n & (n - 1)) === 0; },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public boolean solve(int n) {\n        return false;\n    }\n}",
      "C++": "class Solution {\npublic:\n    bool solve(int n) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Pow(x, n)", difficulty: "Medium",
    desc: "Implement `pow(x, n)`, which calculates `x` raised to the power `n` (i.e., `x^n`).",
    meta: { input_format: "Float `x`, Integer `n`", output_format: "Float", constraints: ["-100.0 < x < 100.0", "-2^31 <= n <= 2^31-1"] },
    hints: ["Use fast exponentiation (binary exponentiation) to solve it in O(log n).", "Be careful with negative n."],
    inputs: [ [2.00000, 10], [2.10000, 3], [2.00000, -2], [1.00000, 2147483647] ],
    refFn: (x, n) => {
      if(n===0) return 1;
      let N = Math.abs(n);
      let res = 1;
      while(N>0) {
        if(N%2===1) res *= x;
        x *= x;
        N = Math.floor(N/2);
      }
      // Fix tiny JS float issues manually for the reference output
      return parseFloat((n < 0 ? 1/res : res).toFixed(5));
    },
    starter: {
      Python: "class Solution:\n    def solve(self, x, n):\n        pass",
      Java: "class Solution {\n    public double solve(double x, int n) {\n        return 0.0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    double solve(double x, int n) {\n        return 0.0;\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Basic Calculator", difficulty: "Hard",
    desc: "Given a string `s` representing a valid expression, implement a basic calculator to evaluate it, and return the result of the evaluation. Note: You are not allowed to use any built-in function which evaluates strings as mathematical expressions, such as `eval()`. The string may contain digits, '+', '-', '(', ')', and ' '.",
    meta: { input_format: "String `s`", output_format: "Integer", constraints: ["1 <= s.length <= 3 * 10^5"] },
    hints: ["Use a stack to keep track of the current result and the sign before a parenthesis."],
    inputs: [ ["1 + 1"], [" 2-1 + 2 "], ["(1+(4+5+2)-3)+(6+8)"], ["- (3 + (4 - 5))"] ],
    refFn: (s) => {
      let res = 0, sign = 1, i = 0;
      let stack = [];
      while (i < s.length) {
        let c = s[i];
        if (c >= '0' && c <= '9') {
          let num = 0;
          while (i < s.length && s[i] >= '0' && s[i] <= '9') { num = num*10 + parseInt(s[i]); i++; }
          res += sign * num; i--;
        } else if (c === '+') { sign = 1; }
        else if (c === '-') { sign = -1; }
        else if (c === '(') { stack.push(res); stack.push(sign); res = 0; sign = 1; }
        else if (c === ')') { res = res * stack.pop() + stack.pop(); }
        i++;
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public int solve(String s) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string s) {\n        return 0;\n    }\n}"
    }
  },

  // --- GREEDY (5) ---
  {
    topic: "Greedy", title: "Assign Cookies", difficulty: "Easy",
    desc: "Assume you are an awesome parent and want to give your children some cookies. But, you should give each child at most one cookie. Each child `i` has a greed factor `g[i]`, which is the minimum size of a cookie that the child will be content with. Each cookie `j` has a size `s[j]`. If `s[j] >= g[i]`, we can assign the cookie `j` to the child `i`, and the child will be content. Maximize the number of content children and return the maximum number.",
    meta: { input_format: "Arrays of integers `g` and `s`", output_format: "Integer", constraints: ["1 <= g.length, s.length <= 3 * 10^4"] },
    hints: ["Sort both arrays.", "Use a greedy approach: try to satisfy the least greedy children with the smallest cookies available."],
    inputs: [ [[1,2,3], [1,1]], [[1,2], [1,2,3]], [[10,9,8,7], [5,6,7,8]], [[1,2,3,4,5], [1,2,3,4,5]] ],
    refFn: (g, s) => {
      g.sort((a,b)=>a-b); s.sort((a,b)=>a-b);
      let count = 0, i = 0, j = 0;
      while (i < g.length && j < s.length) {
        if (s[j] >= g[i]) { count++; i++; }
        j++;
      }
      return count;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, g, s):\n        pass",
      Java: "class Solution {\n    public int solve(int[] g, int[] s) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> g, vector<int> s) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Greedy", title: "Jump Game", difficulty: "Medium",
    desc: "You are given an integer array `nums`. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position. Return `true` if you can reach the last index, or `false` otherwise.",
    meta: { input_format: "Array of integers", output_format: "Boolean", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Keep track of the furthest index you can reach.", "If at any point your current index is greater than the furthest reachable index, return false."],
    inputs: [ [[2,3,1,1,4]], [[3,2,1,0,4]], [[0]], [[2,0,0]] ],
    refFn: (nums) => {
      let maxReach = 0;
      for (let i=0; i<nums.length; i++) {
        if (i > maxReach) return false;
        maxReach = Math.max(maxReach, i + nums[i]);
      }
      return true;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[] nums) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> nums) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Greedy", title: "Gas Station", difficulty: "Medium",
    desc: "There are `n` gas stations along a circular route, where the amount of gas at the `ith` station is `gas[i]`. You have a car with an unlimited gas tank and it costs `cost[i]` of gas to travel from the `ith` station to its next `(i + 1)th` station. You begin the journey with an empty tank at one of the gas stations. Given two integer arrays `gas` and `cost`, return the starting gas station's index if you can travel around the circuit once in the clockwise direction, otherwise return -1.",
    meta: { input_format: "Arrays of integers `gas` and `cost`", output_format: "Integer", constraints: ["n == gas.length == cost.length", "1 <= n <= 10^5"] },
    hints: ["If the total gas is less than the total cost, it's impossible.", "Keep track of the current tank. If it drops below 0, the starting station must be after the current station."],
    inputs: [ [[1,2,3,4,5], [3,4,5,1,2]], [[2,3,4], [3,4,3]], [[1,2], [2,1]], [[5,1,2,3,4], [4,4,1,5,1]] ],
    refFn: (gas, cost) => {
      let total = 0, curr = 0, start = 0;
      for (let i=0; i<gas.length; i++) {
        total += gas[i] - cost[i];
        curr += gas[i] - cost[i];
        if (curr < 0) { start = i + 1; curr = 0; }
      }
      return total < 0 ? -1 : start;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, gas, cost):\n        pass",
      Java: "class Solution {\n    public int solve(int[] gas, int[] cost) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> gas, vector<int> cost) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Greedy", title: "Non-overlapping Intervals", difficulty: "Medium",
    desc: "Given an array of intervals `intervals` where `intervals[i] = [starti, endi]`, return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.",
    meta: { input_format: "2D Array of integers", output_format: "Integer", constraints: ["1 <= intervals.length <= 10^5"] },
    hints: ["Sort intervals by their end times.", "Iterate and keep the one with the earliest end time, discarding any that overlap."],
    inputs: [ [[[1,2],[2,3],[3,4],[1,3]]], [[[1,2],[1,2],[1,2]]], [[[1,2],[2,3]]], [[[1,100],[11,22],[1,11],[2,12]]] ],
    refFn: (intervals) => {
      intervals.sort((a,b)=>a[1]-b[1]);
      let count = 0, end = -Infinity;
      for (let [s, e] of intervals) {
        if (s >= end) { end = e; }
        else { count++; }
      }
      return count;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, intervals):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] intervals) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> intervals) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Greedy", title: "Jump Game II", difficulty: "Hard",
    desc: "You are given a 0-indexed array of integers `nums` of length `n`. You are initially positioned at `nums[0]`. Each element `nums[i]` represents the maximum length of a forward jump from index `i`. Return the minimum number of jumps to reach `nums[n - 1]`. The test cases are generated such that you can reach `nums[n - 1]`.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Use a greedy BFS approach. Keep track of the furthest you can reach with the current jump count."],
    inputs: [ [[2,3,1,1,4]], [[2,3,0,1,4]], [[1]], [[2,1,1,1,1]] ],
    refFn: (nums) => {
      let jumps = 0, curEnd = 0, curFarthest = 0;
      for (let i=0; i<nums.length-1; i++) {
        curFarthest = Math.max(curFarthest, i + nums[i]);
        if (i === curEnd) { jumps++; curEnd = curFarthest; }
      }
      return jumps;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },

  // --- SORTING (5) ---
  {
    topic: "Sorting", title: "Majority Element", difficulty: "Easy",
    desc: "Given an array `nums` of size `n`, return the majority element. The majority element is the element that appears more than `n / 2` times. You may assume that the majority element always exists in the array.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= n <= 5 * 10^4"] },
    hints: ["Use sorting (the middle element is the majority) or Boyer-Moore Voting Algorithm."],
    inputs: [ [[3,2,3]], [[2,2,1,1,1,2,2]], [[1]], [[1,1,2,2,2]] ],
    refFn: (nums) => {
      let count = 0, cand = null;
      for (let n of nums) {
        if (count === 0) cand = n;
        count += (n === cand) ? 1 : -1;
      }
      return cand;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Sorting", title: "Intersection of Two Arrays II", difficulty: "Easy",
    desc: "Given two integer arrays `nums1` and `nums2`, return an array of their intersection. Each element in the result must appear as many times as it shows in both arrays and you may return the result in any order.",
    meta: { input_format: "Arrays of integers `nums1` and `nums2`", output_format: "Array of integers", constraints: ["1 <= nums1.length, nums2.length <= 1000"] },
    hints: ["Sort both arrays and use two pointers, or use a hash map to count frequencies."],
    inputs: [ [[1,2,2,1], [2,2]], [[4,9,5], [9,4,9,8,4]], [[1,2], [3,4]], [[1], [1,1]] ],
    refFn: (n1, n2) => {
      let map = {};
      for (let n of n1) map[n] = (map[n]||0) + 1;
      let res = [];
      for (let n of n2) {
        if (map[n] > 0) { res.push(n); map[n]--; }
      }
      return res.sort((a,b)=>a-b);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums1, int[] nums2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums1, vector<int> nums2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Sorting", title: "Merge Intervals", difficulty: "Medium",
    desc: "Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    meta: { input_format: "2D Array of integers", output_format: "2D Array of integers", constraints: ["1 <= intervals.length <= 10^4"] },
    hints: ["Sort the intervals based on start time.", "Iterate through intervals and merge if current start is <= previous end."],
    inputs: [ [[[1,3],[2,6],[8,10],[15,18]]], [[[1,4],[4,5]]], [[[1,4]]], [[[1,4],[0,4]]] ],
    refFn: (intervals) => {
      intervals.sort((a,b)=>a[0]-b[0]);
      let res = [intervals[0]];
      for (let i=1; i<intervals.length; i++) {
        let last = res[res.length-1];
        if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1]);
        else res.push(intervals[i]);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, intervals):\n        pass",
      Java: "class Solution {\n    public int[][] solve(int[][] intervals) {\n        return new int[][]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<vector<int>> intervals) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Sorting", title: "Insert Interval", difficulty: "Medium",
    desc: "You are given an array of non-overlapping intervals `intervals` where `intervals[i] = [starti, endi]` represent the start and the end of the `ith` interval and `intervals` is sorted in ascending order by `starti`. You are also given an interval `newInterval`. Insert `newInterval` into `intervals` such that `intervals` is still sorted in ascending order by `starti` and `intervals` still does not have any overlapping intervals (merge overlapping intervals if necessary).",
    meta: { input_format: "2D Array `intervals`, Array `newInterval`", output_format: "2D Array of integers", constraints: ["0 <= intervals.length <= 10^4"] },
    hints: ["Add all intervals before newInterval, merge newInterval, then add all intervals after."],
    inputs: [ [[[1,3],[6,9]], [2,5]], [[[1,2],[3,5],[6,7],[8,10],[12,16]], [4,8]], [[], [5,7]], [[[1,5]], [2,3]] ],
    refFn: (intervals, newInt) => {
      let res = [], i = 0;
      while (i < intervals.length && intervals[i][1] < newInt[0]) { res.push(intervals[i]); i++; }
      while (i < intervals.length && intervals[i][0] <= newInt[1]) {
        newInt[0] = Math.min(newInt[0], intervals[i][0]);
        newInt[1] = Math.max(newInt[1], intervals[i][1]);
        i++;
      }
      res.push(newInt);
      while (i < intervals.length) { res.push(intervals[i]); i++; }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, intervals, newInterval):\n        pass",
      Java: "class Solution {\n    public int[][] solve(int[][] intervals, int[] newInterval) {\n        return new int[][]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<vector<int>> intervals, vector<int> newInterval) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Sorting", title: "Maximum Gap", difficulty: "Hard",
    desc: "Given an integer array `nums`, return the maximum difference between two successive elements in its sorted form. If the array contains less than two elements, return 0. You must write an algorithm that runs in linear time and uses linear extra space.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 10^5", "0 <= nums[i] <= 10^9"] },
    hints: ["Use Bucket Sort or Radix Sort for O(N) complexity."],
    inputs: [ [[3,6,9,1]], [[10]], [[1,1,1,1]], [[1,10000000]] ],
    refFn: (nums) => {
      if (nums.length < 2) return 0;
      // Using standard JS sort for deterministic reference, although it's O(N log N)
      nums.sort((a,b)=>a-b);
      let maxGap = 0;
      for (let i=1; i<nums.length; i++) maxGap = Math.max(maxGap, nums[i] - nums[i-1]);
      return maxGap;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b6-${idCounter++}`,
    topic: raw.topic, title: raw.title, difficulty: raw.difficulty, description: raw.desc,
    input_format: raw.meta.input_format, output_format: raw.meta.output_format,
    constraints: raw.meta.constraints, hints: raw.hints, test_cases: [],
    metadata: { isClass: true, className: "Solution", methodName: "solve" },
    starter_code: raw.starter
  };
  for (let i = 0; i < raw.inputs.length; i++) {
    const args = raw.inputs[i];
    const rawExpected = raw.refFn(...args);
    let expStr = JSON.stringify(rawExpected);
    let inpStr = args.length === 1 ? JSON.stringify(args[0]) : JSON.stringify(args);
    p.test_cases.push({ input: inpStr, expected_output: expStr, is_hidden: i >= 2 });
  }
  outProblems.push(p);
}

async function seedBatch6() {
  let totalSeeded = 0, conflicts = 0, testCasesCount = 0;
  
  const beforeCount = await db.query('SELECT COUNT(*) FROM coding_problems');
  console.log("Before rerunning, DB has problems:", beforeCount.rows[0].count);

  for (const p of outProblems) {
    try {
      const existingProb = await db.query('SELECT * FROM coding_problems WHERE title = $1', [p.title]);
      let pid = p.id;
      if (existingProb.rows.length > 0) {
        const ep = existingProb.rows[0];
        if (ep.description !== p.description) {
          console.warn(`[CONFLICT] Problem ${p.title} exists but content differs! Skipping.`);
          conflicts++;
          continue;
        } else {
          pid = ep.id;
        }
      } else {
        await db.query(
          `INSERT INTO coding_problems (id, title, topic, difficulty, description, input_format, output_format, constraints, hints, starter_code, wrapper_metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [pid, p.title, p.topic, p.difficulty, p.description, p.input_format, p.output_format, 
           JSON.stringify(p.constraints), JSON.stringify(p.hints), JSON.stringify(p.starter_code), JSON.stringify(p.metadata)]
        );
        totalSeeded++;
      }

      for (const tc of p.test_cases) {
        const existingTc = await db.query(
          'SELECT id FROM coding_test_cases WHERE problem_id = $1 AND input = $2 AND expected_output = $3 AND is_hidden = $4',
          [pid, tc.input, tc.expected_output, tc.is_hidden]
        );
        if (existingTc.rows.length === 0) {
          await db.query(
            `INSERT INTO coding_test_cases (problem_id, input, expected_output, is_hidden)
             VALUES ($1, $2, $3, $4)`,
            [pid, tc.input, tc.expected_output, tc.is_hidden]
          );
          testCasesCount++;
        }
      }
    } catch (err) {
      console.error(`Failed to process problem ${p.title}: `, err.message);
    }
  }

  const afterCount = await db.query('SELECT COUNT(*) FROM coding_problems');
  console.log("After rerunning, DB has problems:", afterCount.rows[0].count);
  console.log(`Total new problems inserted in this run: ${totalSeeded}`);
  console.log(`Total new test cases inserted in this run: ${testCasesCount}`);
  console.log(`Total content conflicts detected: ${conflicts}`);
  
  process.exit(0);
}

seedBatch6();
