import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- ARRAYS (5) ---
  {
    topic: "Arrays", title: "Move Zeroes", difficulty: "Easy",
    desc: "Given an integer array `nums`, move all 0's to the end of it while maintaining the relative order of the non-zero elements. Note that you must do this in-place without making a copy of the array.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Use a two-pointer approach to swap non-zero elements to the front."],
    inputs: [ [[0,1,0,3,12]], [[0]], [[1,2,3]], [[0,0,1]] ],
    refFn: (n) => {
      let nums = [...n];
      let l = 0;
      for (let r=0; r<nums.length; r++) {
        if (nums[r] !== 0) {
          let temp = nums[l]; nums[l] = nums[r]; nums[r] = temp;
          l++;
        }
      }
      return nums;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Best Time to Buy and Sell Stock", difficulty: "Easy",
    desc: "You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= prices.length <= 10^5"] },
    hints: ["Keep track of the minimum price seen so far and update the max profit."],
    inputs: [ [[7,1,5,3,6,4]], [[7,6,4,3,1]], [[1,2]], [[2,4,1]] ],
    refFn: (prices) => {
      let min = Infinity, maxP = 0;
      for (let p of prices) {
        if (p < min) min = p;
        else maxP = Math.max(maxP, p - min);
      }
      return maxP;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, prices):\n        pass",
      Java: "class Solution {\n    public int solve(int[] prices) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> prices) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Plus One", difficulty: "Easy",
    desc: "You are given a large integer represented as an integer array `digits`, where each `digits[i]` is the `ith` digit of the integer. The digits are ordered from most significant to least significant in left-to-right order. The large integer does not contain any leading 0's. Increment the large integer by one and return the resulting array of digits.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["1 <= digits.length <= 100", "0 <= digits[i] <= 9"] },
    hints: ["Iterate backwards from the last digit. If it is 9, make it 0 and carry over the 1."],
    inputs: [ [[1,2,3]], [[4,3,2,1]], [[9]], [[9,9,9]] ],
    refFn: (d) => {
      let digits = [...d];
      for (let i = digits.length - 1; i >= 0; i--) {
        if (digits[i] < 9) { digits[i]++; return digits; }
        digits[i] = 0;
      }
      digits.unshift(1);
      return digits;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, digits):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] digits) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> digits) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Product of Array Except Self", difficulty: "Medium",
    desc: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["2 <= nums.length <= 10^5"] },
    hints: ["Compute prefix products from left to right, then suffix products from right to left.", "Multiply the prefix and suffix products for each index."],
    inputs: [ [[1,2,3,4]], [[-1,1,0,-3,3]], [[1,1]], [[0,0]] ],
    refFn: (nums) => {
      let n = nums.length;
      let res = Array(n).fill(1);
      let left = 1;
      for(let i=0; i<n; i++) { res[i] = left; left *= nums[i]; }
      let right = 1;
      for(let i=n-1; i>=0; i--) { res[i] *= right; right *= nums[i]; }
      // Convert -0 to 0 for strict equality matching in test cases
      for(let i=0; i<n; i++) if (res[i] === -0) res[i] = 0;
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "First Missing Positive", difficulty: "Hard",
    desc: "Given an unsorted integer array `nums`, return the smallest missing positive integer. You must implement an algorithm that runs in O(n) time and uses O(1) auxiliary space.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Place each positive integer i at index i-1 by swapping.", "Then find the first index that doesn't have the correct value."],
    inputs: [ [[1,2,0]], [[3,4,-1,1]], [[7,8,9,11,12]], [[1,1]] ],
    refFn: (n) => {
      let nums = [...n];
      for (let i = 0; i < nums.length; i++) {
        while (nums[i] > 0 && nums[i] <= nums.length && nums[nums[i]-1] !== nums[i]) {
          let temp = nums[nums[i]-1];
          nums[nums[i]-1] = nums[i];
          nums[i] = temp;
        }
      }
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== i + 1) return i + 1;
      }
      return nums.length + 1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },

  // --- SLIDING WINDOW (5) ---
  {
    topic: "Sliding Window", title: "Substrings of Size Three with Distinct Characters", difficulty: "Easy",
    desc: "A string is good if there are no repeated characters. Given a string `s`, return the number of good substrings of length three. Note that if there are multiple occurrences of the same substring, every occurrence should be counted.",
    meta: { input_format: "String", output_format: "Integer", constraints: ["1 <= s.length <= 100"] },
    hints: ["Iterate through the string and check every window of size 3 for unique characters."],
    inputs: [ ["xyzzaz"], ["aababcabc"], ["a"], ["abcdef"] ],
    refFn: (s) => {
      let count = 0;
      for (let i = 0; i < s.length - 2; i++) {
        if (s[i] !== s[i+1] && s[i] !== s[i+2] && s[i+1] !== s[i+2]) count++;
      }
      return count;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public int solve(String s) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string s) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Minimum Size Subarray Sum", difficulty: "Medium",
    desc: "Given an array of positive integers `nums` and a positive integer `target`, return the minimal length of a subarray whose sum is greater than or equal to `target`. If there is no such subarray, return 0 instead.",
    meta: { input_format: "Integer `target`, Array of integers `nums`", output_format: "Integer", constraints: ["1 <= target <= 10^9", "1 <= nums.length <= 10^5"] },
    hints: ["Use a sliding window. Expand the window to the right until the sum >= target, then shrink from the left to find the minimal length."],
    inputs: [ [7, [2,3,1,2,4,3]], [4, [1,4,4]], [11, [1,1,1,1,1,1,1,1]], [15, [1,2,3,4,5]] ],
    refFn: (t, nums) => {
      let minLen = Infinity, sum = 0, l = 0;
      for (let r = 0; r < nums.length; r++) {
        sum += nums[r];
        while (sum >= t) {
          minLen = Math.min(minLen, r - l + 1);
          sum -= nums[l];
          l++;
        }
      }
      return minLen === Infinity ? 0 : minLen;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, target, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int target, int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(int target, vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Maximum Points You Can Obtain from Cards", difficulty: "Medium",
    desc: "There are several cards arranged in a row, and each card has an associated number of points. You can take one card from the beginning or from the end of the row. You must take exactly `k` cards. Your score is the sum of the points of the cards you have taken. Return the maximum score you can obtain.",
    meta: { input_format: "Array of integers `cardPoints`, Integer `k`", output_format: "Integer", constraints: ["1 <= cardPoints.length <= 10^5", "1 <= k <= cardPoints.length"] },
    hints: ["Taking k cards from the ends is equivalent to leaving a subarray of length n-k with minimum sum."],
    inputs: [ [[1,2,3,4,5,6,1], 3], [[2,2,2], 2], [[9,7,7,9,7,7,9], 7], [[1,1000,1], 1] ],
    refFn: (cardPoints, k) => {
      let n = cardPoints.length;
      let total = cardPoints.reduce((a,b)=>a+b, 0);
      if (k === n) return total;
      let windowSize = n - k;
      let currentSum = 0;
      for (let i=0; i<windowSize; i++) currentSum += cardPoints[i];
      let minSum = currentSum;
      for (let i=windowSize; i<n; i++) {
        currentSum += cardPoints[i] - cardPoints[i - windowSize];
        minSum = Math.min(minSum, currentSum);
      }
      return total - minSum;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, cardPoints, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] cardPoints, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> cardPoints, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Minimum Window Substring", difficulty: "Hard",
    desc: "Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return the empty string ''.",
    meta: { input_format: "Strings `s` and `t`", output_format: "String", constraints: ["1 <= m, n <= 10^5"] },
    hints: ["Use a sliding window. Count characters in t, and expand the window until all characters are found. Then shrink from the left to find the minimum window."],
    inputs: [ ["ADOBECODEBANC", "ABC"], ["a", "a"], ["a", "aa"], ["a", "b"] ],
    refFn: (s, t) => {
      if (!s || !t || s.length < t.length) return "";
      let map = {};
      for (let c of t) map[c] = (map[c] || 0) + 1;
      let required = Object.keys(map).length, formed = 0;
      let windowCounts = {};
      let l = 0, r = 0, minLen = Infinity, minStart = 0;
      while (r < s.length) {
        let c = s[r];
        windowCounts[c] = (windowCounts[c] || 0) + 1;
        if (map[c] && windowCounts[c] === map[c]) formed++;
        while (l <= r && formed === required) {
          if (r - l + 1 < minLen) { minLen = r - l + 1; minStart = l; }
          let leftChar = s[l];
          windowCounts[leftChar]--;
          if (map[leftChar] && windowCounts[leftChar] < map[leftChar]) formed--;
          l++;
        }
        r++;
      }
      return minLen === Infinity ? "" : s.substring(minStart, minStart + minLen);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, t):\n        pass",
      Java: "class Solution {\n    public String solve(String s, String t) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s, string t) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Subarrays with K Different Integers", difficulty: "Hard",
    desc: "Given an integer array `nums` and an integer `k`, return the number of good subarrays of `nums`. A good array is an array where the number of different integers in that array is exactly `k`.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Integer", constraints: ["1 <= nums.length <= 2 * 10^4"] },
    hints: ["The number of subarrays with exactly K distinct integers is exactly: (subarrays with at most K) - (subarrays with at most K-1)."],
    inputs: [ [[1,2,1,2,3], 2], [[1,2,1,3,4], 3], [[1], 1], [[1,2], 1] ],
    refFn: (nums, k) => {
      const atMostK = (k) => {
        let l = 0, res = 0, map = {};
        for (let r = 0; r < nums.length; r++) {
          if (!map[nums[r]]) map[nums[r]] = 0;
          if (map[nums[r]] === 0) k--;
          map[nums[r]]++;
          while (k < 0) {
            map[nums[l]]--;
            if (map[nums[l]] === 0) k++;
            l++;
          }
          res += r - l + 1;
        }
        return res;
      };
      return atMostK(k) - atMostK(k - 1);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int k) {\n        return 0;\n    }\n}"
    }
  },

  // --- RECURSION / BACKTRACKING (5) ---
  {
    topic: "Recursion", title: "Fibonacci Number", difficulty: "Easy",
    desc: "The Fibonacci numbers, commonly denoted `F(n)` form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is, `F(0) = 0, F(1) = 1` and `F(n) = F(n - 1) + F(n - 2)`. Given `n`, calculate `F(n)`.",
    meta: { input_format: "Integer `n`", output_format: "Integer", constraints: ["0 <= n <= 30"] },
    hints: ["Use recursion with memoization or iterative approach to compute the nth number."],
    inputs: [ [2], [3], [4], [10] ],
    refFn: (n) => {
      let memo = [0, 1];
      for (let i = 2; i <= n; i++) memo[i] = memo[i-1] + memo[i-2];
      return memo[n];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public int solve(int n) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Recursion", title: "Power of Three", difficulty: "Easy",
    desc: "Given an integer `n`, return `true` if it is a power of three. Otherwise, return `false`. An integer `n` is a power of three, if there exists an integer `x` such that `n == 3^x`.",
    meta: { input_format: "Integer `n`", output_format: "Boolean", constraints: ["-2^31 <= n <= 2^31 - 1"] },
    hints: ["Keep dividing the number by 3, or use math (max power of 3 possible for 32 bit int)."],
    inputs: [ [27], [0], [-1], [45] ],
    refFn: (n) => {
      if (n <= 0) return false;
      while (n % 3 === 0) n /= 3;
      return n === 1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public boolean solve(int n) {\n        return false;\n    }\n}",
      "C++": "class Solution {\npublic:\n    bool solve(int n) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Recursion", title: "Word Search", difficulty: "Medium",
    desc: "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.",
    meta: { input_format: "2D Array of characters `board`, String `word`", output_format: "Boolean", constraints: ["1 <= m, n <= 6", "1 <= word.length <= 15"] },
    hints: ["Use backtracking (DFS). For each cell that matches the first letter, search its neighbors."],
    inputs: [ [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCCED"], [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "SEE"], [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCB"], [[["a"]], "a"] ],
    refFn: (board, word) => {
      let b = board.map(row => [...row]);
      const dfs = (r, c, i) => {
        if (i === word.length) return true;
        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] !== word[i]) return false;
        let temp = b[r][c];
        b[r][c] = '#';
        let found = dfs(r+1,c,i+1) || dfs(r-1,c,i+1) || dfs(r,c+1,i+1) || dfs(r,c-1,i+1);
        b[r][c] = temp;
        return found;
      };
      for(let r=0; r<b.length; r++) {
        for(let c=0; c<b[0].length; c++) {
          if (dfs(r, c, 0)) return true;
        }
      }
      return false;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, board, word):\n        pass",
      Java: "class Solution {\n    public boolean solve(char[][] board, String word) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<vector<char>> board, string word) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Recursion", title: "Word Search II", difficulty: "Hard",
    desc: "Given an `m x n` `board` of characters and a list of strings `words`, return all words on the board. Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.",
    meta: { input_format: "2D Array of characters `board`, Array of strings `words`", output_format: "Array of strings", constraints: ["1 <= m, n <= 12", "1 <= words.length <= 3 * 10^4"] },
    hints: ["Use a Trie to store the words efficiently, then perform DFS backtracking from each cell."],
    inputs: [ [[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], ["oath","pea","eat","rain"]], [[["a","b"],["c","d"]], ["abcb"]], [[["a"]], ["a"]], [[["a"]], ["b"]] ],
    refFn: (board, words) => {
      let b = board.map(row => [...row]);
      let res = new Set();
      let trie = {};
      for (let w of words) {
        let node = trie;
        for (let c of w) { if (!node[c]) node[c] = {}; node = node[c]; }
        node.word = w;
      }
      const dfs = (r, c, node) => {
        if (r<0||c<0||r>=b.length||c>=b[0].length) return;
        let char = b[r][c];
        if (char === '#' || !node[char]) return;
        node = node[char];
        if (node.word) { res.add(node.word); }
        b[r][c] = '#';
        dfs(r+1,c,node); dfs(r-1,c,node); dfs(r,c+1,node); dfs(r,c-1,node);
        b[r][c] = char;
      };
      for(let r=0; r<b.length; r++) {
        for(let c=0; c<b[0].length; c++) {
          dfs(r, c, trie);
        }
      }
      return Array.from(res).sort();
    },
    starter: {
      Python: "class Solution:\n    def solve(self, board, words):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(char[][] board, String[] words) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(vector<vector<char>> board, vector<string> words) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Recursion", title: "Sudoku Solver", difficulty: "Hard",
    desc: "Write a program to solve a Sudoku puzzle by filling the empty cells. A sudoku solution must satisfy all of the following rules: Each of the digits 1-9 must occur exactly once in each row, column, and the 9x9 sub-boxes of the grid. The '.' character indicates empty cells.",
    meta: { input_format: "2D Array of characters `board`", output_format: "2D Array of characters", constraints: ["board is 9x9"] },
    hints: ["Use backtracking. Find an empty cell, try placing 1-9, validate, and recursively solve the rest."],
    inputs: [ [[["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]], [[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","."]]], [[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1",".","."]]], [[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6",".",".","."]]] ],
    refFn: (board) => {
      let b = board.map(row => [...row]);
      const isValid = (r, c, k) => {
        for (let i = 0; i < 9; i++) {
          if (b[i][c] === k) return false;
          if (b[r][i] === k) return false;
          if (b[3 * Math.floor(r/3) + Math.floor(i/3)][3 * Math.floor(c/3) + i%3] === k) return false;
        }
        return true;
      };
      const solve = () => {
        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 9; j++) {
            if (b[i][j] === '.') {
              for (let k = 1; k <= 9; k++) {
                if (isValid(i, j, String(k))) {
                  b[i][j] = String(k);
                  if (solve()) return true;
                  b[i][j] = '.';
                }
              }
              return false;
            }
          }
        }
        return true;
      };
      solve();
      return b;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, board):\n        pass",
      Java: "class Solution {\n    public char[][] solve(char[][] board) {\n        return new char[][]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<char>> solve(vector<vector<char>> board) {\n        return {};\n    }\n}"
    }
  },

  // --- DYNAMIC PROGRAMMING (5) ---
  {
    topic: "Dynamic Programming", title: "N-th Tribonacci Number", difficulty: "Easy",
    desc: "The Tribonacci sequence Tn is defined as follows: T0 = 0, T1 = 1, T2 = 1, and Tn+3 = Tn + Tn+1 + Tn+2 for n >= 0. Given `n`, return the value of Tn.",
    meta: { input_format: "Integer `n`", output_format: "Integer", constraints: ["0 <= n <= 37"] },
    hints: ["Use dynamic programming or variables to keep track of the last three numbers."],
    inputs: [ [4], [25], [0], [3] ],
    refFn: (n) => {
      let t = [0, 1, 1];
      for (let i = 3; i <= n; i++) t[i] = t[i-1] + t[i-2] + t[i-3];
      return t[n] || 0;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public int solve(int n) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Pascal's Triangle", difficulty: "Easy",
    desc: "Given an integer `numRows`, return the first `numRows` of Pascal's triangle. In Pascal's triangle, each number is the sum of the two numbers directly above it.",
    meta: { input_format: "Integer `numRows`", output_format: "2D Array of integers", constraints: ["1 <= numRows <= 30"] },
    hints: ["Row i has i+1 elements. The first and last elements are 1. Other elements are sum of the two elements above."],
    inputs: [ [5], [1], [2], [4] ],
    refFn: (numRows) => {
      let res = [];
      for (let i = 0; i < numRows; i++) {
        let row = Array(i+1).fill(1);
        for (let j = 1; j < i; j++) row[j] = res[i-1][j-1] + res[i-1][j];
        res.push(row);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, numRows):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int numRows) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(int numRows) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "House Robber", difficulty: "Medium",
    desc: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night. Given an integer array `nums` representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.",
    meta: { input_format: "Array of integers `nums`", output_format: "Integer", constraints: ["1 <= nums.length <= 100"] },
    hints: ["dp[i] = max(dp[i-1], dp[i-2] + nums[i])"],
    inputs: [ [[1,2,3,1]], [[2,7,9,3,1]], [[1]], [[2,1,1,2]] ],
    refFn: (nums) => {
      if (nums.length === 0) return 0;
      if (nums.length === 1) return nums[0];
      let dp = [nums[0], Math.max(nums[0], nums[1])];
      for(let i = 2; i < nums.length; i++) {
        dp[i] = Math.max(dp[i-1], dp[i-2] + nums[i]);
      }
      return dp[nums.length-1];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Decode Ways", difficulty: "Medium",
    desc: "A message containing letters from A-Z can be encoded into numbers using the mapping: 'A' -> '1', 'B' -> '2', ... 'Z' -> '26'. Given a string `s` containing only digits, return the number of ways to decode it. If the entire string cannot be decoded in any valid way, return 0.",
    meta: { input_format: "String `s`", output_format: "Integer", constraints: ["1 <= s.length <= 100"] },
    hints: ["dp[i] represents number of ways to decode s[0..i]. Check single digit and double digit (10-26)."],
    inputs: [ ["12"], ["226"], ["06"], ["10"] ],
    refFn: (s) => {
      if (!s || s[0] === '0') return 0;
      let dp = Array(s.length + 1).fill(0);
      dp[0] = 1; dp[1] = 1;
      for (let i = 2; i <= s.length; i++) {
        let one = parseInt(s.substring(i-1, i));
        let two = parseInt(s.substring(i-2, i));
        if (one >= 1 && one <= 9) dp[i] += dp[i-1];
        if (two >= 10 && two <= 26) dp[i] += dp[i-2];
      }
      return dp[s.length];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public int solve(String s) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string s) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Best Time to Buy and Sell Stock III", difficulty: "Hard",
    desc: "You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day. Find the maximum profit you can achieve. You may complete at most two transactions. Note: You may not engage in multiple transactions simultaneously.",
    meta: { input_format: "Array of integers `prices`", output_format: "Integer", constraints: ["1 <= prices.length <= 10^5"] },
    hints: ["Keep track of four variables: buy1, sell1, buy2, sell2. Maximize the profit iteratively."],
    inputs: [ [[3,3,5,0,0,3,1,4]], [[1,2,3,4,5]], [[7,6,4,3,1]], [[1]] ],
    refFn: (prices) => {
      let b1 = -Infinity, s1 = 0, b2 = -Infinity, s2 = 0;
      for (let p of prices) {
        b1 = Math.max(b1, -p);
        s1 = Math.max(s1, b1 + p);
        b2 = Math.max(b2, s1 - p);
        s2 = Math.max(s2, b2 + p);
      }
      return s2;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, prices):\n        pass",
      Java: "class Solution {\n    public int solve(int[] prices) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> prices) {\n        return 0;\n    }\n}"
    }
  },

  // --- GRAPHS / UNION FIND (5) ---
  {
    topic: "Graphs", title: "Find if Path Exists in Graph", difficulty: "Easy",
    desc: "There is a bi-directional graph with `n` vertices, where each vertex is labeled from 0 to `n - 1` (inclusive). The edges in the graph are represented as a 2D integer array `edges`, where each `edges[i] = [ui, vi]` denotes a bi-directional edge between vertex `ui` and vertex `vi`. Every vertex pair is connected by at most one edge, and no vertex has an edge to itself. You want to determine if there is a valid path that exists from vertex `source` to vertex `destination`.",
    meta: { input_format: "Integer `n`, 2D Array `edges`, Integer `source`, Integer `destination`", output_format: "Boolean", constraints: ["1 <= n <= 2 * 10^5"] },
    hints: ["Use BFS, DFS, or Union Find to see if the two nodes are connected."],
    inputs: [ [3, [[0,1],[1,2],[2,0]], 0, 2], [6, [[0,1],[0,2],[3,5],[5,4],[4,3]], 0, 5], [1, [], 0, 0], [2, [[0,1]], 1, 0] ],
    refFn: (n, edges, source, destination) => {
      let parent = Array.from({length: n}, (_, i) => i);
      const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
      for (let [u, v] of edges) parent[find(u)] = find(v);
      return find(source) === find(destination);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n, edges, source, destination):\n        pass",
      Java: "class Solution {\n    public boolean solve(int n, int[][] edges, int source, int destination) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(int n, vector<vector<int>> edges, int source, int destination) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Find Center of Star Graph", difficulty: "Easy",
    desc: "There is an undirected star graph consisting of `n` nodes labeled from 1 to `n`. A star graph is a graph where there is one center node and exactly `n - 1` edges that connect the center node with every other node. You are given a 2D integer array `edges` where each `edges[i] = [ui, vi]` indicates that there is an edge between the nodes `ui` and `vi`. Return the center of the given star graph.",
    meta: { input_format: "2D Array of integers `edges`", output_format: "Integer", constraints: ["3 <= n <= 10^5"] },
    hints: ["The center node will appear in every edge. Check the first two edges to find the common node."],
    inputs: [ [[[1,2],[2,3],[4,2]]], [[[1,2],[5,1],[1,3],[1,4]]], [[[1,10],[1,11]]], [[[100,1],[1,2]]] ],
    refFn: (edges) => {
      let [u1, v1] = edges[0];
      let [u2, v2] = edges[1];
      if (u1 === u2 || u1 === v2) return u1;
      return v1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, edges):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] edges) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> edges) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Number of Provinces", difficulty: "Medium",
    desc: "There are `n` cities. Some of them are connected, while some are not. If city a is connected directly with city b, and city b is connected directly with city c, then city a is connected indirectly with city c. A province is a group of directly or indirectly connected cities and no other cities outside of the group. You are given an `n x n` matrix `isConnected` where `isConnected[i][j] = 1` if the ith city and the jth city are directly connected, and `isConnected[i][j] = 0` otherwise. Return the total number of provinces.",
    meta: { input_format: "2D Array of integers `isConnected`", output_format: "Integer", constraints: ["1 <= n <= 200"] },
    hints: ["Use DFS, BFS, or Union Find to group connected cities."],
    inputs: [ [[[1,1,0],[1,1,0],[0,0,1]]], [[[1,0,0],[0,1,0],[0,0,1]]], [[[1,0],[0,1]]], [[[1]]] ],
    refFn: (isConnected) => {
      let n = isConnected.length;
      let parent = Array.from({length: n}, (_, i) => i);
      let count = n;
      const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (isConnected[i][j]) {
            let rootI = find(i), rootJ = find(j);
            if (rootI !== rootJ) { parent[rootI] = rootJ; count--; }
          }
        }
      }
      return count;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, isConnected):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] isConnected) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> isConnected) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Redundant Connection", difficulty: "Medium",
    desc: "In this problem, a tree is an undirected graph that is connected and has no cycles. You are given a graph that started as a tree with `n` nodes labeled from 1 to `n`, with one additional edge added. The added edge has two different vertices chosen from 1 to `n`, and was not an edge that already existed. The graph is represented as an array `edges` of length `n`. Return an edge that can be removed so that the resulting graph is a tree of `n` nodes. If there are multiple answers, return the answer that occurs last in the input.",
    meta: { input_format: "2D Array of integers `edges`", output_format: "Array of integers", constraints: ["3 <= n <= 1000"] },
    hints: ["Use Union Find. Process edges one by one. If an edge connects two nodes that are already in the same set, it's the redundant one."],
    inputs: [ [[[1,2],[1,3],[2,3]]], [[[1,2],[2,3],[3,4],[1,4],[1,5]]], [[[1,2],[2,3],[3,1]]], [[[1,4],[3,4],[1,3],[1,2],[4,5]]] ],
    refFn: (edges) => {
      let parent = Array.from({length: edges.length + 1}, (_, i) => i);
      const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
      for (let [u, v] of edges) {
        let rootU = find(u), rootV = find(v);
        if (rootU === rootV) return [u, v];
        parent[rootU] = rootV;
      }
      return [];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, edges):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[][] edges) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<vector<int>> edges) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Making A Large Island", difficulty: "Hard",
    desc: "You are given an `n x n` binary matrix `grid`. You are allowed to change at most one 0 to be 1. Return the size of the largest island in `grid` after applying this operation. An island is a 4-directionally connected group of 1s.",
    meta: { input_format: "2D Array of integers `grid`", output_format: "Integer", constraints: ["1 <= n <= 500"] },
    hints: ["First, use DFS to find and label all existing islands with unique IDs and compute their sizes.", "Then iterate over all 0s, and sum the sizes of neighboring unique islands + 1."],
    inputs: [ [[[1,0],[0,1]]], [[[1,1],[1,0]]], [[[1,1],[1,1]]], [[[0,0],[0,0]]] ],
    refFn: (grid) => {
      let n = grid.length;
      let sizes = new Map();
      let id = 2;
      let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const dfs = (r, c) => {
        if (r<0||c<0||r>=n||c>=n||grid[r][c]!==1) return 0;
        grid[r][c] = id;
        let count = 1;
        for (let [dr, dc] of dirs) count += dfs(r+dr, c+dc);
        return count;
      };
      let max = 0;
      for (let r=0; r<n; r++) {
        for (let c=0; c<n; c++) {
          if (grid[r][c]===1) {
            let size = dfs(r, c);
            sizes.set(id, size);
            max = Math.max(max, size);
            id++;
          }
        }
      }
      for (let r=0; r<n; r++) {
        for (let c=0; c<n; c++) {
          if (grid[r][c]===0) {
            let seen = new Set();
            let sum = 1;
            for (let [dr, dc] of dirs) {
              let nr = r+dr, nc = c+dc;
              if (nr>=0 && nc>=0 && nr<n && nc<n && grid[nr][nc]>1) {
                let islandId = grid[nr][nc];
                if (!seen.has(islandId)) { seen.add(islandId); sum += sizes.get(islandId); }
              }
            }
            max = Math.max(max, sum);
          }
        }
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> grid) {\n        return 0;\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b7-${idCounter++}`,
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

async function seedBatch7() {
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

seedBatch7();
