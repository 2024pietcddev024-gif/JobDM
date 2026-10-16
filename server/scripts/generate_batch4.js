import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- BINARY SEARCH (10) ---
  {
    topic: "Binary Search", title: "Binary Search", difficulty: "Easy",
    desc: "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.",
    meta: { input_format: "Array of integers `nums`, Integer `target`", output_format: "Integer", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Use two pointers left and right to represent the search space.", "Find the middle and narrow the search space."],
    inputs: [ [[-1,0,3,5,9,12], 9], [[-1,0,3,5,9,12], 2], [[5], 5], [[5], 2] ],
    refFn: (nums, t) => {
      let l=0, r=nums.length-1;
      while(l<=r) {
        let m = l + Math.floor((r-l)/2);
        if(nums[m]===t) return m;
        if(nums[m]<t) l=m+1; else r=m-1;
      }
      return -1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, target):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int target) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int target) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Search Insert Position", difficulty: "Easy",
    desc: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order. You must write an algorithm with O(log n) runtime complexity.",
    meta: { input_format: "Array of integers `nums`, Integer `target`", output_format: "Integer", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Similar to standard binary search, return the left pointer if not found."],
    inputs: [ [[1,3,5,6], 5], [[1,3,5,6], 2], [[1,3,5,6], 7], [[1], 0] ],
    refFn: (nums, t) => {
      let l=0, r=nums.length-1;
      while(l<=r) {
        let m = l + Math.floor((r-l)/2);
        if(nums[m]===t) return m;
        if(nums[m]<t) l=m+1; else r=m-1;
      }
      return l;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, target):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int target) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int target) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "First Bad Version", difficulty: "Easy",
    desc: "Suppose you have `n` versions `[1, 2, ..., n]` and you want to find out the first bad one. You are given an API `bool isBadVersion(version)` which returns whether `version` is bad. (For this problem, input is `[n, bad]`).",
    meta: { input_format: "Integer `n`, Integer `bad`", output_format: "Integer", constraints: ["1 <= bad <= n <= 2^31 - 1"] },
    hints: ["Use binary search. If mid is bad, check left. If mid is good, check right."],
    inputs: [ [5, 4], [1, 1], [10, 7], [100, 50] ],
    refFn: (n, bad) => {
      let l=1, r=n;
      while(l<r) {
        let m = l + Math.floor((r-l)/2);
        if(m>=bad) r=m; else l=m+1;
      }
      return l;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n, bad):\n        pass",
      Java: "class Solution {\n    public int solve(int n, int bad) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int n, int bad) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Sqrt(x)", difficulty: "Easy",
    desc: "Given a non-negative integer `x`, return the square root of `x` rounded down to the nearest integer. You must not use any built-in exponent function or operator.",
    meta: { input_format: "Integer `x`", output_format: "Integer", constraints: ["0 <= x <= 2^31 - 1"] },
    hints: ["Use binary search from 0 to x.", "Be careful with integer overflow when computing mid * mid."],
    inputs: [ [4], [8], [0], [1] ],
    refFn: (x) => {
      let l=0, r=x, ans=0;
      while(l<=r) {
        let m = l + Math.floor((r-l)/2);
        if(m*m<=x) { ans=m; l=m+1; } else r=m-1;
      }
      return ans;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, x):\n        pass",
      Java: "class Solution {\n    public int solve(int x) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int x) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Valid Perfect Square", difficulty: "Easy",
    desc: "Given a positive integer `num`, return `true` if `num` is a perfect square or `false` otherwise. You must not use any built-in library function.",
    meta: { input_format: "Integer `num`", output_format: "Boolean", constraints: ["1 <= num <= 2^31 - 1"] },
    hints: ["Binary search from 1 to num.", "Check if mid * mid == num."],
    inputs: [ [16], [14], [1], [25] ],
    refFn: (num) => {
      let l=1, r=num;
      while(l<=r) {
        let m = l + Math.floor((r-l)/2);
        let sq = m*m;
        if(sq===num) return true;
        if(sq<num) l=m+1; else r=m-1;
      }
      return false;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, num):\n        pass",
      Java: "class Solution {\n    public boolean solve(int num) {\n        return false;\n    }\n}",
      "C++": "class Solution {\npublic:\n    bool solve(int num) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Find Minimum in Rotated Sorted Array", difficulty: "Medium",
    desc: "Suppose an array of length `n` sorted in ascending order is rotated between 1 and `n` times. Given the sorted rotated array `nums` of unique elements, return the minimum element of this array.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 5000", "All integers are unique."] },
    hints: ["If nums[mid] > nums[right], minimum is in right half.", "Else minimum is in left half (including mid)."],
    inputs: [ [[3,4,5,1,2]], [[4,5,6,7,0,1,2]], [[11,13,15,17]], [[1]] ],
    refFn: (nums) => {
      let l=0, r=nums.length-1;
      while(l<r) {
        let m = l + Math.floor((r-l)/2);
        if(nums[m]>nums[r]) l=m+1; else r=m;
      }
      return nums[l];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Search in Rotated Sorted Array", difficulty: "Medium",
    desc: "There is an integer array `nums` sorted in ascending order (with distinct values), rotated at an unknown pivot index. Given the array `nums` and an integer `target`, return the index of `target` if it is in `nums`, or -1 if it is not in `nums`.",
    meta: { input_format: "Array of integers `nums`, Integer `target`", output_format: "Integer", constraints: ["1 <= nums.length <= 5000", "All values are unique."] },
    hints: ["Identify which half of the array is strictly sorted.", "Check if target falls within the sorted half."],
    inputs: [ [[4,5,6,7,0,1,2], 0], [[4,5,6,7,0,1,2], 3], [[1], 0], [[1,3], 3] ],
    refFn: (nums, t) => {
      let l=0, r=nums.length-1;
      while(l<=r) {
        let m = l + Math.floor((r-l)/2);
        if(nums[m]===t) return m;
        if(nums[l]<=nums[m]) {
          if(t>=nums[l] && t<nums[m]) r=m-1; else l=m+1;
        } else {
          if(t>nums[m] && t<=nums[r]) l=m+1; else r=m-1;
        }
      }
      return -1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, target):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int target) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int target) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Find First and Last Position of Element", difficulty: "Medium",
    desc: "Given an array of integers `nums` sorted in non-decreasing order, find the starting and ending position of a given `target` value. If `target` is not found, return `[-1, -1]`.",
    meta: { input_format: "Array of integers `nums`, Integer `target`", output_format: "Array of integers", constraints: ["0 <= nums.length <= 10^5"] },
    hints: ["Use binary search twice.", "First to find the leftmost index, then to find the rightmost index."],
    inputs: [ [[5,7,7,8,8,10], 8], [[5,7,7,8,8,10], 6], [[], 0], [[1,1,1,1], 1] ],
    refFn: (nums, t) => {
      const search = (isLeft) => {
        let l=0, r=nums.length-1, ans=-1;
        while(l<=r) {
          let m = l + Math.floor((r-l)/2);
          if(nums[m]===t) { ans=m; if(isLeft) r=m-1; else l=m+1; }
          else if(nums[m]<t) l=m+1; else r=m-1;
        }
        return ans;
      };
      return [search(true), search(false)];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, target):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums, int target) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums, int target) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Search a 2D Matrix", difficulty: "Medium",
    desc: "You are given an `m x n` integer matrix `matrix` with the following two properties: Each row is sorted in non-decreasing order. The first integer of each row is greater than the last integer of the previous row. Given an integer `target`, return `true` if `target` is in `matrix` or `false` otherwise.",
    meta: { input_format: "2D Array of integers `matrix`, Integer `target`", output_format: "Boolean", constraints: ["m == matrix.length", "n == matrix[i].length"] },
    hints: ["Treat the 2D matrix as a 1D sorted array of length m * n.", "Row = index / n, Col = index % n."],
    inputs: [ [[[1,3,5,7],[10,11,16,20],[23,30,34,60]], 3], [[[1,3,5,7],[10,11,16,20],[23,30,34,60]], 13], [[[1]], 1], [[[1,1]], 2] ],
    refFn: (matrix, t) => {
      let m=matrix.length, n=matrix[0].length;
      let l=0, r=m*n-1;
      while(l<=r) {
        let mid = l + Math.floor((r-l)/2);
        let val = matrix[Math.floor(mid/n)][mid%n];
        if(val===t) return true;
        if(val<t) l=mid+1; else r=mid-1;
      }
      return false;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, matrix, target):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[][] matrix, int target) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<vector<int>> matrix, int target) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Binary Search", title: "Koko Eating Bananas", difficulty: "Medium",
    desc: "Koko loves to eat bananas. There are `n` piles of bananas, the ith pile has `piles[i]` bananas. The guards have gone and will come back in `h` hours. Koko can decide her bananas-per-hour eating speed of `k`. Each hour, she chooses some pile and eats `k` bananas from it. Find the minimum integer `k` such that she can eat all bananas within `h` hours.",
    meta: { input_format: "Array of integers `piles`, Integer `h`", output_format: "Integer", constraints: ["1 <= piles.length <= 10^4", "piles.length <= h <= 10^9"] },
    hints: ["Binary search the eating speed between 1 and max(piles).", "For a given speed k, check if total hours needed <= h."],
    inputs: [ [[3,6,7,11], 8], [[30,11,23,4,20], 5], [[30,11,23,4,20], 6], [[10], 2] ],
    refFn: (piles, h) => {
      let l=1, r=Math.max(...piles), ans=r;
      while(l<=r) {
        let m = l + Math.floor((r-l)/2);
        let hours = 0;
        for(let p of piles) hours += Math.ceil(p/m);
        if(hours<=h) { ans=m; r=m-1; } else l=m+1;
      }
      return ans;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, piles, h):\n        pass",
      Java: "class Solution {\n    public int solve(int[] piles, int h) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> piles, int h) {\n        return 0;\n    }\n}"
    }
  },

  // --- STACK (8) ---
  {
    topic: "Stack", title: "Valid Parentheses", difficulty: "Easy",
    desc: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Open brackets must be closed by the same type of brackets in the correct order.",
    meta: { input_format: "String", output_format: "Boolean", constraints: ["1 <= s.length <= 10^4"] },
    hints: ["Use a stack. Push open brackets.", "For close brackets, pop from stack and check if it matches."],
    inputs: [ ["()"], ["()[]{}"], ["(]"], ["([)]"] ],
    refFn: (s) => {
      let stack = [];
      let map = {')':'(', '}':'{', ']':'['};
      for(let c of s) {
        if(!map[c]) stack.push(c);
        else if(stack.pop() !== map[c]) return false;
      }
      return stack.length === 0;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public boolean solve(String s) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Backspace String Compare", difficulty: "Easy",
    desc: "Given two strings `s` and `t`, return `true` if they are equal when both are typed into empty text editors. '#' means a backspace character. Note that after backspacing an empty text, the text will continue empty.",
    meta: { input_format: "Strings `s` and `t`", output_format: "Boolean", constraints: ["1 <= s.length, t.length <= 200"] },
    hints: ["Use a stack to build the final string by popping on '#'."],
    inputs: [ ["ab#c", "ad#c"], ["ab##", "c#d#"], ["a#c", "b"], ["a##c", "#a#c"] ],
    refFn: (s, t) => {
      const build = (str) => {
        let stack = [];
        for(let c of str) { if(c==='#') stack.pop(); else stack.push(c); }
        return stack.join('');
      };
      return build(s) === build(t);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, t):\n        pass",
      Java: "class Solution {\n    public boolean solve(String s, String t) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s, string t) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Next Greater Element I", difficulty: "Easy",
    desc: "The next greater element of some element `x` in an array is the first greater element that is to the right of `x` in the same array. Given two distinct arrays `nums1` and `nums2`, where `nums1` is a subset of `nums2`, find the next greater element for each element in `nums1` from `nums2`.",
    meta: { input_format: "Arrays `nums1` and `nums2`", output_format: "Array of integers", constraints: ["1 <= nums1.length <= nums2.length <= 1000"] },
    hints: ["Use a monotonic decreasing stack on nums2 to map each element to its next greater."],
    inputs: [ [[4,1,2], [1,3,4,2]], [[2,4], [1,2,3,4]], [[1], [2,1,3]], [[1,2], [2,1]] ],
    refFn: (n1, n2) => {
      let map = new Map(), stack = [];
      for(let n of n2) {
        while(stack.length && stack[stack.length-1]<n) map.set(stack.pop(), n);
        stack.push(n);
      }
      return n1.map(x => map.has(x) ? map.get(x) : -1);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums1, int[] nums2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums1, vector<int> nums2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Evaluate Reverse Polish Notation", difficulty: "Medium",
    desc: "Evaluate the value of an arithmetic expression in Reverse Polish Notation. Valid operators are +, -, *, and /. Each operand may be an integer or another expression. Division truncates toward zero.",
    meta: { input_format: "Array of strings", output_format: "Integer", constraints: ["1 <= tokens.length <= 10^4"] },
    hints: ["Use a stack. If it's a number, push it. If it's an operator, pop two numbers, evaluate, and push the result."],
    inputs: [ [["2","1","+","3","*"]], [["4","13","5","/","+"]], [["10","6","9","3","+","-11","*","/","*","17","+","5","+"]], [["18"]] ],
    refFn: (tokens) => {
      let stack = [];
      for(let t of tokens) {
        if(t==='+'||t==='-'||t==='*'||t==='/') {
          let b = stack.pop(), a = stack.pop();
          if(t==='+') stack.push(a+b);
          if(t==='-') stack.push(a-b);
          if(t==='*') stack.push(a*b);
          if(t==='/') stack.push(Math.trunc(a/b));
        } else {
          stack.push(parseInt(t));
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
  {
    topic: "Stack", title: "Daily Temperatures", difficulty: "Medium",
    desc: "Given an array of integers `temperatures` represents the daily temperatures, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `ith` day to get a warmer temperature. If there is no future day for which this is possible, keep `answer[i] == 0`.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["1 <= temperatures.length <= 10^5"] },
    hints: ["Use a monotonically decreasing stack that stores indices of temperatures."],
    inputs: [ [[73,74,75,71,69,72,76,73]], [[30,40,50,60]], [[30,60,90]], [[90,60,30]] ],
    refFn: (T) => {
      let res = Array(T.length).fill(0), stack = [];
      for(let i=0; i<T.length; i++) {
        while(stack.length && T[stack[stack.length-1]] < T[i]) {
          let idx = stack.pop();
          res[idx] = i - idx;
        }
        stack.push(i);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, temperatures):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] temperatures) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> temperatures) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Generate Parentheses", difficulty: "Medium",
    desc: "Given `n` pairs of parentheses, write a function to generate all combinations of well-formed parentheses.",
    meta: { input_format: "Integer `n`", output_format: "Array of strings", constraints: ["1 <= n <= 8"] },
    hints: ["Use backtracking or a stack to keep track of the current string, open count, and close count."],
    inputs: [ [3], [1], [2], [4] ],
    refFn: (n) => {
      let res = [];
      const dfs = (str, open, close) => {
        if(str.length===2*n) { res.push(str); return; }
        if(open<n) dfs(str+'(', open+1, close);
        if(close<open) dfs(str+')', open, close+1);
      };
      dfs('', 0, 0);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(int n) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(int n) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Asteroid Collision", difficulty: "Medium",
    desc: "We are given an array `asteroids` of integers representing asteroids in a row. For each asteroid, the absolute value represents its size, and the sign represents its direction (positive meaning right, negative meaning left). Find out the state of the asteroids after all collisions.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["2 <= asteroids.length <= 10^4"] },
    hints: ["Use a stack. Collisions only happen when the stack top is positive and the current asteroid is negative."],
    inputs: [ [[5,10,-5]], [[8,-8]], [[10,2,-5]], [[-2,-1,1,2]] ],
    refFn: (asteroids) => {
      let stack = [];
      for(let a of asteroids) {
        let destroyed = false;
        while(stack.length && stack[stack.length-1]>0 && a<0) {
          if(stack[stack.length-1] < -a) { stack.pop(); continue; }
          else if(stack[stack.length-1] === -a) { stack.pop(); destroyed = true; break; }
          else { destroyed = true; break; }
        }
        if(!destroyed) stack.push(a);
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
    topic: "Stack", title: "Largest Rectangle in Histogram", difficulty: "Hard",
    desc: "Given an array of integers `heights` representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= heights.length <= 10^5"] },
    hints: ["Use a monotonic increasing stack to store indices.", "When a smaller bar is encountered, calculate the area for bars in the stack."],
    inputs: [ [[2,1,5,6,2,3]], [[2,4]], [[1]], [[2,1,2]] ],
    refFn: (h) => {
      let max = 0, stack = [];
      let heights = [...h, 0];
      for(let i=0; i<heights.length; i++) {
        while(stack.length && heights[stack[stack.length-1]] >= heights[i]) {
          let height = heights[stack.pop()];
          let width = stack.length===0 ? i : i - stack[stack.length-1] - 1;
          max = Math.max(max, height * width);
        }
        stack.push(i);
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, heights):\n        pass",
      Java: "class Solution {\n    public int solve(int[] heights) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> heights) {\n        return 0;\n    }\n}"
    }
  },

  // --- HEAP / QUEUES (7) ---
  {
    topic: "Heap", title: "Last Stone Weight", difficulty: "Easy",
    desc: "You are given an array of integers `stones` where `stones[i]` is the weight of the `ith` stone. Choose the two heaviest stones and smash them together. If x == y, both destroyed. If x != y, stone of weight x is destroyed, and y has new weight y-x. Return the weight of the last remaining stone.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= stones.length <= 30"] },
    hints: ["Use a Max-Heap or sort the array continuously."],
    inputs: [ [[2,7,4,1,8,1]], [[1]], [[2,2]], [[1,3]] ],
    refFn: (stones) => {
      let q = [...stones];
      while(q.length>1) {
        q.sort((a,b)=>a-b);
        let y = q.pop(), x = q.pop();
        if(x!==y) q.push(y-x);
      }
      return q.length===1 ? q[0] : 0;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, stones):\n        pass",
      Java: "class Solution {\n    public int solve(int[] stones) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> stones) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Relative Ranks", difficulty: "Easy",
    desc: "Given an integer array `score` of size n, where `score[i]` is the score of the ith athlete. All the scores are guaranteed to be unique. Return an array `answer` of size n where `answer[i]` is the rank of the ith athlete. (Gold Medal, Silver Medal, Bronze Medal, '4', '5', ...).",
    meta: { input_format: "Array of integers", output_format: "Array of strings", constraints: ["1 <= score.length <= 10^4"] },
    hints: ["Sort the scores or use a Priority Queue to assign ranks."],
    inputs: [ [[5,4,3,2,1]], [[10,3,8,9,4]], [[1]], [[2,1]] ],
    refFn: (score) => {
      let sorted = [...score].sort((a,b)=>b-a);
      let map = new Map();
      for(let i=0; i<sorted.length; i++) {
        if(i===0) map.set(sorted[i], "Gold Medal");
        else if(i===1) map.set(sorted[i], "Silver Medal");
        else if(i===2) map.set(sorted[i], "Bronze Medal");
        else map.set(sorted[i], (i+1).toString());
      }
      return score.map(x => map.get(x));
    },
    starter: {
      Python: "class Solution:\n    def solve(self, score):\n        pass",
      Java: "class Solution {\n    public String[] solve(int[] score) {\n        return new String[]{};\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(vector<int> score) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Kth Largest Element in an Array", difficulty: "Medium",
    desc: "Given an integer array `nums` and an integer `k`, return the `kth` largest element in the array. Note that it is the `kth` largest element in the sorted order, not the `kth` distinct element.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Integer", constraints: ["1 <= k <= nums.length <= 10^5"] },
    hints: ["Use a Min-Heap of size k, or Quickselect algorithm."],
    inputs: [ [[3,2,1,5,6,4], 2], [[3,2,3,1,2,4,5,5,6], 4], [[1], 1], [[-1,2,0], 2] ],
    refFn: (nums, k) => {
      let sorted = [...nums].sort((a,b)=>b-a);
      return sorted[k-1];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Top K Frequent Words", difficulty: "Medium",
    desc: "Given an array of strings `words` and an integer `k`, return the `k` most frequent strings. Return the answer sorted by the frequency from highest to lowest. Sort the words with the same frequency by their lexicographical order.",
    meta: { input_format: "Array of strings `words`, Integer `k`", output_format: "Array of strings", constraints: ["1 <= words.length <= 500", "1 <= k <= words.length"] },
    hints: ["Count frequencies with a hash map.", "Sort the unique words by frequency, then alphabetically."],
    inputs: [ [["i","love","leetcode","i","love","coding"], 2], [["the","day","is","sunny","the","the","the","sunny","is","is"], 4], [["a","a","a"], 1], [["a","b","c","a"], 2] ],
    refFn: (words, k) => {
      let map = {};
      for(let w of words) map[w] = (map[w]||0)+1;
      let uniq = Object.keys(map);
      uniq.sort((a,b) => {
        if(map[a] !== map[b]) return map[b] - map[a];
        return a.localeCompare(b);
      });
      return uniq.slice(0, k);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, words, k):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(String[] words, int k) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(vector<string> words, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "K Closest Points to Origin", difficulty: "Medium",
    desc: "Given an array of `points` where `points[i] = [xi, yi]` represents a point on the X-Y plane and an integer `k`, return the `k` closest points to the origin (0, 0). (Distance is Euclidean).",
    meta: { input_format: "2D Array of integers `points`, Integer `k`", output_format: "2D Array of integers", constraints: ["1 <= k <= points.length <= 10^4"] },
    hints: ["Calculate distance squared for each point.", "Use a Min-Heap or Sort the array based on distances."],
    inputs: [ [[[1,3],[-2,2]], 1], [[[3,3],[5,-1],[-2,4]], 2], [[[0,1],[1,0]], 2], [[[0,0]], 1] ],
    refFn: (points, k) => {
      return [...points].sort((a,b) => (a[0]*a[0] + a[1]*a[1]) - (b[0]*b[0] + b[1]*b[1])).slice(0, k);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, points, k):\n        pass",
      Java: "class Solution {\n    public int[][] solve(int[][] points, int k) {\n        return new int[][]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<vector<int>> points, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Task Scheduler", difficulty: "Medium",
    desc: "Given a characters array `tasks`, representing the tasks a CPU needs to do, and a non-negative integer `n` that represents the cooling period between two same tasks. Return the least number of units of times that the CPU will take to finish all the given tasks.",
    meta: { input_format: "Array of characters `tasks`, Integer `n`", output_format: "Integer", constraints: ["1 <= tasks.length <= 10^4"] },
    hints: ["Find the maximum frequency of any task.", "The math formula is: (max_freq - 1) * (n + 1) + count of tasks with max_freq. Compare this with tasks.length."],
    inputs: [ [["A","A","A","B","B","B"], 2], [["A","A","A","B","B","B"], 0], [["A","A","A","A","A","A","B","C","D","E","F","G"], 2], [["A"], 1] ],
    refFn: (tasks, n) => {
      let map = {};
      let maxFreq = 0;
      for(let t of tasks) { map[t]=(map[t]||0)+1; maxFreq = Math.max(maxFreq, map[t]); }
      let maxCount = 0;
      for(let k in map) { if(map[k]===maxFreq) maxCount++; }
      return Math.max(tasks.length, (maxFreq-1)*(n+1) + maxCount);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, tasks, n):\n        pass",
      Java: "class Solution {\n    public int solve(char[] tasks, int n) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<char> tasks, int n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "IPO", difficulty: "Hard",
    desc: "Suppose LeetCode will start its IPO soon. In order to sell a good price of its shares to Venture Capital, LeetCode would like to work on some projects to increase its capital before the IPO. You are given `k` projects, `w` initial capital, and arrays `profits` and `capital`. Find the maximum maximized capital.",
    meta: { input_format: "Integer `k`, Integer `w`, Arrays `profits` and `capital`", output_format: "Integer", constraints: ["1 <= k <= 10^5"] },
    hints: ["Sort projects by capital required.", "Use a Max-Heap to track the profits of available projects we can afford."],
    inputs: [ [2, 0, [1,2,3], [0,1,1]], [3, 0, [1,2,3], [0,1,2]], [1, 2, [1,2,3], [1,1,2]], [1, 0, [1], [1]] ],
    refFn: (k, w, profits, capital) => {
      let projects = [];
      for(let i=0; i<profits.length; i++) projects.push({p: profits[i], c: capital[i]});
      projects.sort((a,b)=>a.c-b.c);
      let cap = w;
      let ptr = 0;
      // using simple array sort to simulate max heap (slow but works for reference in JS)
      let available = []; 
      for(let i=0; i<k; i++) {
        while(ptr<projects.length && projects[ptr].c <= cap) {
          available.push(projects[ptr].p);
          ptr++;
        }
        if(available.length===0) break;
        available.sort((a,b)=>b-a); // max at 0
        cap += available.shift();
      }
      return cap;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, k, w, profits, capital):\n        pass",
      Java: "class Solution {\n    public int solve(int k, int w, int[] profits, int[] capital) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(int k, int w, vector<int> profits, vector<int> capital) {\n        return 0;\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b4-${idCounter++}`,
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

async function seedBatch4() {
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

seedBatch4();
