import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- HEAP (3) ---
  {
    topic: "Heap", title: "Sort Characters By Frequency", difficulty: "Medium",
    desc: "Given a string `s`, sort it in decreasing order based on the frequency of the characters. The frequency of a character is the number of times it appears in the string. Return the sorted string. If there are multiple answers, return any of them.",
    meta: { input_format: "String `s`", output_format: "String", constraints: ["1 <= s.length <= 5 * 10^5"] },
    hints: ["Use a Hash Map to count frequencies, then a Max Heap or sorting to build the string."],
    inputs: [ ["tree"], ["cccaaa"], ["Aabb"], ["a"] ],
    refFn: (s) => {
      let map = {};
      for (let c of s) map[c] = (map[c] || 0) + 1;
      let sorted = Object.keys(map).sort((a,b) => map[b] - map[a]);
      let res = "";
      for (let c of sorted) res += c.repeat(map[c]);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public String solve(String s) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Kth Smallest Element in a Sorted Matrix", difficulty: "Medium",
    desc: "Given an `n x n` `matrix` where each of the rows and columns is sorted in ascending order, return the `kth` smallest element in the matrix. Note that it is the `kth` smallest element in the sorted order, not the `kth` distinct element.",
    meta: { input_format: "2D Array `matrix`, Integer `k`", output_format: "Integer", constraints: ["n == matrix.length == matrix[i].length", "1 <= n <= 300"] },
    hints: ["Use a Min Heap of size k, or Binary Search on the range of values in the matrix."],
    inputs: [ [[[1,5,9],[10,11,13],[12,13,15]], 8], [[[-5]], 1], [[[1,2],[1,3]], 2], [[[1,2],[3,3]], 3] ],
    refFn: (matrix, k) => {
      let arr = [];
      for (let row of matrix) arr.push(...row);
      arr.sort((a,b) => a-b);
      return arr[k-1];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, matrix, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] matrix, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> matrix, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Find K Pairs with Smallest Sums", difficulty: "Medium",
    desc: "You are given two integer arrays `nums1` and `nums2` sorted in non-decreasing order and an integer `k`. Define a pair `(u, v)` which consists of one element from the first array and one element from the second array. Return the `k` pairs `(u1, v1), (u2, v2), ..., (uk, vk)` with the smallest sums.",
    meta: { input_format: "Array `nums1`, Array `nums2`, Integer `k`", output_format: "2D Array of integers", constraints: ["1 <= nums1.length, nums2.length <= 10^5"] },
    hints: ["Use a Min Heap to keep track of the smallest sums. Push (nums1[0], nums2[0]) first, then explore neighbors."],
    inputs: [ [[1,7,11], [2,4,6], 3], [[1,1,2], [1,2,3], 2], [[1,2], [3], 3], [[1], [1], 1] ],
    refFn: (nums1, nums2, k) => {
      let pairs = [];
      for (let i = 0; i < Math.min(nums1.length, k); i++) {
        for (let j = 0; j < Math.min(nums2.length, k); j++) {
          pairs.push([nums1[i], nums2[j]]);
        }
      }
      pairs.sort((a,b) => (a[0]+a[1]) - (b[0]+b[1]));
      return pairs.slice(0, k);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2, k):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] nums1, int[] nums2, int k) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> nums1, vector<int> nums2, int k) {\n        return {};\n    }\n}"
    }
  },

  // --- STACK (3) ---
  {
    topic: "Stack", title: "Decode String", difficulty: "Medium",
    desc: "Given an encoded string, return its decoded string. The encoding rule is: `k[encoded_string]`, where the `encoded_string` inside the square brackets is being repeated exactly `k` times. Note that `k` is guaranteed to be a positive integer.",
    meta: { input_format: "String `s`", output_format: "String", constraints: ["1 <= s.length <= 30"] },
    hints: ["Use a stack to keep track of the multiplier and the partially built strings."],
    inputs: [ ["3[a]2[bc]"], ["3[a2[c]]"], ["2[abc]3[cd]ef"], ["abc3[cd]xyz"] ],
    refFn: (s) => {
      let stack = [];
      for (let char of s) {
        if (char !== ']') {
          stack.push(char);
        } else {
          let str = "";
          while (stack.length > 0 && stack[stack.length-1] !== '[') {
            str = stack.pop() + str;
          }
          stack.pop(); // remove '['
          let k = "";
          while (stack.length > 0 && !isNaN(stack[stack.length-1])) {
            k = stack.pop() + k;
          }
          stack.push(str.repeat(Number(k)));
        }
      }
      return stack.join("");
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public String solve(String s) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Asteroid Collision", difficulty: "Medium",
    desc: "We are given an array `asteroids` of integers representing asteroids in a row. For each asteroid, the absolute value represents its size, and the sign represents its direction (positive meaning right, negative meaning left). Find out the state of the asteroids after all collisions. If two asteroids meet, the smaller one will explode. If both are the same size, both will explode.",
    meta: { input_format: "Array `asteroids`", output_format: "Array of integers", constraints: ["2 <= asteroids.length <= 10^4"] },
    hints: ["Use a stack. Collisions only happen when a right-moving asteroid (+) is followed by a left-moving asteroid (-)."],
    inputs: [ [[5,10,-5]], [[8,-8]], [[10,2,-5]], [[-2,-1,1,2]] ],
    refFn: (asteroids) => {
      let stack = [];
      for (let a of asteroids) {
        let alive = true;
        while (alive && a < 0 && stack.length > 0 && stack[stack.length-1] > 0) {
          if (stack[stack.length-1] < -a) {
            stack.pop();
            continue;
          } else if (stack[stack.length-1] === -a) {
            stack.pop();
          }
          alive = false;
        }
        if (alive) stack.push(a);
      }
      return stack;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, asteroids):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] asteroids) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> asteroids) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Evaluate Reverse Polish Notation", difficulty: "Medium",
    desc: "You are given an array of strings `tokens` that represents an arithmetic expression in a Reverse Polish Notation. Evaluate the expression. Return an integer that represents the value of the expression.",
    meta: { input_format: "Array of strings `tokens`", output_format: "Integer", constraints: ["1 <= tokens.length <= 10^4"] },
    hints: ["Use a stack. Push numbers, and when you see an operator, pop two numbers, apply the operator, and push the result."],
    inputs: [ [["2","1","+","3","*"]], [["4","13","5","/","+"]], [["10","6","9","3","+","-11","*","/","*","17","+","5","+"]], [["18"]] ],
    refFn: (tokens) => {
      let stack = [];
      for (let t of tokens) {
        if (!isNaN(t)) stack.push(Number(t));
        else {
          let b = stack.pop();
          let a = stack.pop();
          if (t === '+') stack.push(a + b);
          if (t === '-') stack.push(a - b);
          if (t === '*') stack.push(a * b);
          if (t === '/') stack.push(Math.trunc(a / b));
        }
      }
      return stack[0];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, tokens):\n        pass",
      Java: "class Solution {\n    public int solve(String[] tokens) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<string> tokens) {\n        return 0;\n    }\n}"
    }
  },

  // --- ARRAYS (6) ---
  {
    topic: "Arrays", title: "Rotate Array", difficulty: "Medium",
    desc: "Given an integer array `nums`, rotate the array to the right by `k` steps, where `k` is non-negative.",
    meta: { input_format: "Array `nums`, Integer `k`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["You can reverse the whole array, then reverse the first k elements, then reverse the rest."],
    inputs: [ [[1,2,3,4,5,6,7], 3], [[-1,-100,3,99], 2], [[1], 0], [[1,2], 3] ],
    refFn: (n, k) => {
      let nums = [...n];
      k = k % nums.length;
      let end = nums.splice(nums.length - k);
      return end.concat(nums);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums, int k) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Subarray Sum Equals K", difficulty: "Medium",
    desc: "Given an array of integers `nums` and an integer `k`, return the total number of subarrays whose sum equals to `k`. A subarray is a contiguous non-empty sequence of elements within an array.",
    meta: { input_format: "Array `nums`, Integer `k`", output_format: "Integer", constraints: ["1 <= nums.length <= 2 * 10^4"] },
    hints: ["Use a Hash Map to store the cumulative sum frequencies."],
    inputs: [ [[1,1,1], 2], [[1,2,3], 3], [[1,-1,0], 0], [[1], 0] ],
    refFn: (nums, k) => {
      let map = { 0: 1 }, sum = 0, count = 0;
      for (let n of nums) {
        sum += n;
        if (map[sum - k]) count += map[sum - k];
        map[sum] = (map[sum] || 0) + 1;
      }
      return count;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Find the Duplicate Number", difficulty: "Medium",
    desc: "Given an array of integers `nums` containing `n + 1` integers where each integer is in the range `[1, n]` inclusive. There is only one repeated number in `nums`, return this repeated number. You must solve the problem without modifying the array `nums` and uses only constant extra space.",
    meta: { input_format: "Array `nums`", output_format: "Integer", constraints: ["1 <= n <= 10^5", "nums.length == n + 1"] },
    hints: ["Treat the array values as pointers to indices and use Floyd's Tortoise and Hare cycle detection algorithm."],
    inputs: [ [[1,3,4,2,2]], [[3,1,3,4,2]], [[3,3,3,3,3]], [[1,1]] ],
    refFn: (nums) => {
      let slow = nums[0], fast = nums[nums[0]];
      while (slow !== fast) { slow = nums[slow]; fast = nums[nums[fast]]; }
      fast = 0;
      while (slow !== fast) { slow = nums[slow]; fast = nums[fast]; }
      return slow;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Jump Game", difficulty: "Medium",
    desc: "You are given an integer array `nums`. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position. Return `true` if you can reach the last index, or `false` otherwise.",
    meta: { input_format: "Array `nums`", output_format: "Boolean", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Keep track of the maximum reachable index. If you reach an index beyond the max reachable index, you can't reach the end."],
    inputs: [ [[2,3,1,1,4]], [[3,2,1,0,4]], [[0]], [[2,0,0]] ],
    refFn: (nums) => {
      let maxReach = 0;
      for (let i = 0; i < nums.length; i++) {
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
    topic: "Arrays", title: "3Sum Closest", difficulty: "Medium",
    desc: "Given an integer array `nums` of length `n` and an integer `target`, find three integers in `nums` such that the sum is closest to `target`. Return the sum of the three integers.",
    meta: { input_format: "Array `nums`, Integer `target`", output_format: "Integer", constraints: ["3 <= nums.length <= 500"] },
    hints: ["Sort the array and use the two-pointer approach for each element to find the closest sum."],
    inputs: [ [[-1,2,1,-4], 1], [[0,0,0], 1], [[1,1,1,1], 0], [[-1,2,1,-4], -2] ],
    refFn: (nums, target) => {
      nums.sort((a,b) => a-b);
      let closest = Infinity;
      for (let i = 0; i < nums.length - 2; i++) {
        let l = i + 1, r = nums.length - 1;
        while (l < r) {
          let sum = nums[i] + nums[l] + nums[r];
          if (Math.abs(target - sum) < Math.abs(target - closest)) closest = sum;
          if (sum < target) l++;
          else r--;
        }
      }
      return closest;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, target):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int target) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int target) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Maximum Product Subarray", difficulty: "Medium",
    desc: "Given an integer array `nums`, find a subarray that has the largest product, and return the product.",
    meta: { input_format: "Array `nums`", output_format: "Integer", constraints: ["1 <= nums.length <= 2 * 10^4"] },
    hints: ["Keep track of both the maximum and minimum products up to the current index, since a negative number can flip the minimum to the maximum."],
    inputs: [ [[2,3,-2,4]], [[-2,0,-1]], [[0,2]], [[-2,3,-4]] ],
    refFn: (nums) => {
      let maxProd = nums[0], minProd = nums[0], res = nums[0];
      for (let i = 1; i < nums.length; i++) {
        let curr = nums[i];
        let tempMax = Math.max(curr, maxProd * curr, minProd * curr);
        minProd = Math.min(curr, maxProd * curr, minProd * curr);
        maxProd = tempMax;
        res = Math.max(res, maxProd);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },

  // --- HASH TABLE (4) ---
  {
    topic: "Hash Table", title: "Group Anagrams", difficulty: "Medium",
    desc: "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.",
    meta: { input_format: "Array of strings `strs`", output_format: "2D Array of strings", constraints: ["1 <= strs.length <= 10^4"] },
    hints: ["Use a Hash Map where the key is the sorted string and the value is a list of anagrams."],
    inputs: [ [["eat","tea","tan","ate","nat","bat"]], [[""]], [["a"]], [["cab","tin","pew","duh","may","ill","buy","bar","max","doc"]] ],
    refFn: (strs) => {
      let map = {};
      for (let s of strs) {
        let key = s.split('').sort().join('');
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
      return Object.values(map);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, strs):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<String>> solve(String[] strs) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<string>> solve(vector<string> strs) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Longest Consecutive Sequence", difficulty: "Medium",
    desc: "Given an unsorted array of integers `nums`, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.",
    meta: { input_format: "Array `nums`", output_format: "Integer", constraints: ["0 <= nums.length <= 10^5"] },
    hints: ["Add all numbers to a Set. For each number, check if it's the start of a sequence (i.e., num - 1 is not in the set)."],
    inputs: [ [[100,4,200,1,3,2]], [[0,3,7,2,5,8,4,6,0,1]], [[1]], [[]] ],
    refFn: (nums) => {
      let set = new Set(nums), maxLen = 0;
      for (let n of set) {
        if (!set.has(n - 1)) {
          let curr = n, len = 1;
          while (set.has(curr + 1)) { curr++; len++; }
          maxLen = Math.max(maxLen, len);
        }
      }
      return maxLen;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Bulls and Cows", difficulty: "Medium",
    desc: "You are playing the Bulls and Cows game with your friend. You write down a secret number and ask your friend to guess what the number is. When your friend makes a guess, you provide a hint with the following info: The number of 'bulls', which are digits in the guess that are in the correct position. The number of 'cows', which are digits in the guess that are in your secret number but are located in the wrong position. Return the hint in the format 'xAyB'.",
    meta: { input_format: "String `secret`, String `guess`", output_format: "String", constraints: ["1 <= secret.length, guess.length <= 1000"] },
    hints: ["Count bulls by matching characters at the same index. Use an array to count the frequencies of unmatched characters for cows."],
    inputs: [ ["1807", "7810"], ["1123", "0111"], ["1", "0"], ["1", "1"] ],
    refFn: (secret, guess) => {
      let bulls = 0, cows = 0;
      let sCounts = Array(10).fill(0);
      let gCounts = Array(10).fill(0);
      for (let i = 0; i < secret.length; i++) {
        if (secret[i] === guess[i]) bulls++;
        else {
          sCounts[Number(secret[i])]++;
          gCounts[Number(guess[i])]++;
        }
      }
      for (let i = 0; i < 10; i++) cows += Math.min(sCounts[i], gCounts[i]);
      return `\${bulls}A\${cows}B`;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, secret, guess):\n        pass",
      Java: "class Solution {\n    public String solve(String secret, String guess) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string secret, string guess) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "4Sum", difficulty: "Medium",
    desc: "Given an array `nums` of `n` integers, return an array of all the unique quadruplets `[nums[a], nums[b], nums[c], nums[d]]` such that `a`, `b`, `c`, and `d` are distinct, and their sum equals `target`.",
    meta: { input_format: "Array `nums`, Integer `target`", output_format: "2D Array of integers", constraints: ["1 <= nums.length <= 200"] },
    hints: ["Sort the array. Use two nested loops to fix two elements, then use the two-pointer approach for the remaining two elements."],
    inputs: [ [[1,0,-1,0,-2,2], 0], [[2,2,2,2,2], 8], [[0,0,0,0], 0], [[-2,-1,-1,1,1,2,2], 0] ],
    refFn: (nums, target) => {
      nums.sort((a,b) => a-b);
      let res = [];
      for (let i = 0; i < nums.length - 3; i++) {
        if (i > 0 && nums[i] === nums[i-1]) continue;
        for (let j = i + 1; j < nums.length - 2; j++) {
          if (j > i + 1 && nums[j] === nums[j-1]) continue;
          let l = j + 1, r = nums.length - 1;
          while (l < r) {
            let sum = nums[i] + nums[j] + nums[l] + nums[r];
            if (sum === target) {
              res.push([nums[i], nums[j], nums[l], nums[r]]);
              l++; r--;
              while (l < r && nums[l] === nums[l-1]) l++;
              while (l < r && nums[r] === nums[r+1]) r--;
            } else if (sum < target) {
              l++;
            } else {
              r--;
            }
          }
        }
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, target):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] nums, int target) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> nums, int target) {\n        return {};\n    }\n}"
    }
  },

  // --- RECURSION (2) ---
  {
    topic: "Recursion", title: "Pow(x, n)", difficulty: "Medium",
    desc: "Implement `pow(x, n)`, which calculates `x` raised to the power `n` (i.e., `x^n`).",
    meta: { input_format: "Float `x`, Integer `n`", output_format: "Float", constraints: ["-100.0 < x < 100.0", "-2^31 <= n <= 2^31-1"] },
    hints: ["Use fast exponentiation. x^n = (x*x)^(n/2) for even n, and x * (x*x)^(n//2) for odd n."],
    inputs: [ [2.00000, 10], [2.10000, 3], [2.00000, -2], [1.00000, 2147483647] ],
    refFn: (x, n) => {
      if (n === 0) return 1;
      if (n < 0) { x = 1 / x; n = -n; }
      const fastPow = (x, n) => {
        if (n === 0) return 1;
        let half = fastPow(x, Math.floor(n / 2));
        if (n % 2 === 0) return half * half;
        else return half * half * x;
      };
      return parseFloat(fastPow(x, n).toFixed(5));
    },
    starter: {
      Python: "class Solution:\n    def solve(self, x, n):\n        pass",
      Java: "class Solution {\n    public double solve(double x, int n) {\n        return 0.0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    double solve(double x, int n) {\n        return 0.0;\n    }\n}"
    }
  },
  {
    topic: "Recursion", title: "Different Ways to Add Parentheses", difficulty: "Medium",
    desc: "Given a string `expression` of numbers and operators, return all possible results from computing all the different possible ways to group numbers and operators. You may return the answer in any order.",
    meta: { input_format: "String `expression`", output_format: "Array of integers", constraints: ["1 <= expression.length <= 20"] },
    hints: ["Use recursion. For every operator in the string, split the string into left and right parts, recursively compute their results, and combine them."],
    inputs: [ ["2-1-1"], ["2*3-4*5"], ["3"], ["11+2"] ],
    refFn: (expression) => {
      const isOp = c => c==='+' || c==='-' || c==='*';
      const compute = (a, b, op) => op === '+' ? a + b : op === '-' ? a - b : a * b;
      let memo = new Map();
      const dfs = (str) => {
        if (memo.has(str)) return memo.get(str);
        let res = [];
        for (let i = 0; i < str.length; i++) {
          if (isOp(str[i])) {
            let left = dfs(str.substring(0, i));
            let right = dfs(str.substring(i + 1));
            for (let l of left) {
              for (let r of right) {
                res.push(compute(l, r, str[i]));
              }
            }
          }
        }
        if (res.length === 0) res.push(Number(str));
        memo.set(str, res);
        return res;
      };
      return dfs(expression).sort((a,b)=>a-b);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, expression):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<Integer> solve(String expression) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(string expression) {\n        return {};\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b10-${idCounter++}`,
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

async function seedBatch10() {
  let totalSeeded = 0, conflicts = 0, exactMatches = 0, testCasesCount = 0;
  
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
          console.log(`[EXACT MATCH] Problem ${p.title} already exists with identical content. Skipping insert.`);
          exactMatches++;
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
  console.log(`Total exact matches detected: ${exactMatches}`);
  
  process.exit(0);
}

seedBatch10();
