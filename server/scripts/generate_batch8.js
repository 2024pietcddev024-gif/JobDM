import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- GEOMETRY & MATH (5 Easy) ---
  {
    topic: "Math", title: "Minimum Time Visiting All Points", difficulty: "Easy",
    desc: "On a 2D plane, there are `n` points with integer coordinates `points[i] = [xi, yi]`. Return the minimum time in seconds to visit all the points in the order given by `points`. You can move according to these rules: In 1 second, you can either move vertically by one unit, move horizontally by one unit, or move diagonally by one unit. You have to visit the points in the same order as they appear in the array.",
    meta: { input_format: "2D Array of integers `points`", output_format: "Integer", constraints: ["1 <= points.length <= 100", "points[i].length == 2"] },
    hints: ["The time to move from one point to another is the maximum of the absolute differences in their x and y coordinates."],
    inputs: [ [[[1,1],[3,4],[-1,0]]], [[[3,2],[-2,2]]], [[[0,0],[1,1],[2,2]]], [[[0,0],[0,5]]] ],
    refFn: (points) => {
      let time = 0;
      for(let i=0; i<points.length-1; i++) {
        time += Math.max(Math.abs(points[i+1][0] - points[i][0]), Math.abs(points[i+1][1] - points[i][1]));
      }
      return time;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, points):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] points) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> points) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Largest Perimeter Triangle", difficulty: "Easy",
    desc: "Given an integer array `nums`, return the largest perimeter of a triangle with a non-zero area, formed from three of these lengths. If it is impossible to form any triangle of a non-zero area, return 0.",
    meta: { input_format: "Array of integers `nums`", output_format: "Integer", constraints: ["3 <= nums.length <= 10^4", "1 <= nums[i] <= 10^6"] },
    hints: ["Sort the array in descending order.", "A triangle is valid if the sum of the two smaller sides is strictly greater than the largest side (a + b > c)."],
    inputs: [ [[2,1,2]], [[1,2,1,10]], [[3,2,3,4]], [[3,6,2,3]] ],
    refFn: (nums) => {
      nums.sort((a,b)=>b-a);
      for(let i=0; i<nums.length-2; i++) {
        if(nums[i] < nums[i+1] + nums[i+2]) return nums[i] + nums[i+1] + nums[i+2];
      }
      return 0;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Valid Boomerang", difficulty: "Easy",
    desc: "Given an array `points` where `points[i] = [xi, yi]` represents a point on the X-Y plane, return `true` if these points are a boomerang. A boomerang is a set of three points that are all distinct and not in a straight line.",
    meta: { input_format: "2D Array of integers `points`", output_format: "Boolean", constraints: ["points.length == 3", "points[i].length == 2"] },
    hints: ["Use the cross product of the vectors formed by the points to check for collinearity."],
    inputs: [ [[[1,1],[2,3],[3,2]]], [[[1,1],[2,2],[3,3]]], [[[0,0],[1,1],[2,2]]], [[[0,0],[1,0],[0,1]]] ],
    refFn: (points) => {
      let [p1, p2, p3] = points;
      return (p1[0] - p2[0]) * (p1[1] - p3[1]) !== (p1[0] - p3[0]) * (p1[1] - p2[1]);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, points):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[][] points) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<vector<int>> points) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Projection Area of 3D Shapes", difficulty: "Easy",
    desc: "You are given an `n x n` `grid` where we place some `1 x 1 x 1` cubes that are axis-aligned with the x, y, and z axes. Each value `v = grid[i][j]` represents a tower of `v` cubes placed on top of the cell `(i, j)`. We view the projection of these cubes onto the xy, yz, and zx planes. A projection is like a shadow, that maps our 3-dimensional figure to a 2-dimensional plane. Return the total area of all three projections.",
    meta: { input_format: "2D Array of integers `grid`", output_format: "Integer", constraints: ["n == grid.length == grid[i].length", "1 <= n <= 50"] },
    hints: ["xy projection is the number of non-zero elements.", "xz projection is the sum of the max of each row.", "yz projection is the sum of the max of each column."],
    inputs: [ [[[1,2],[3,4]]], [[[2]]], [[[1,0],[0,2]]], [[[2,2,2],[2,1,2],[2,2,2]]] ],
    refFn: (grid) => {
      let xy = 0, xz = 0, yz = 0;
      let n = grid.length;
      for(let i=0; i<n; i++) {
        let maxR = 0, maxC = 0;
        for(let j=0; j<n; j++) {
          if (grid[i][j] > 0) xy++;
          maxR = Math.max(maxR, grid[i][j]);
          maxC = Math.max(maxC, grid[j][i]);
        }
        xz += maxR;
        yz += maxC;
      }
      return xy + xz + yz;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> grid) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Math", title: "Surface Area of 3D Shapes", difficulty: "Easy",
    desc: "You are given an `n x n` `grid` where you have placed some `1 x 1 x 1` cubes. Each value `v = grid[i][j]` represents a tower of `v` cubes placed on top of cell `(i, j)`. Return the total surface area of the resulting shapes.",
    meta: { input_format: "2D Array of integers `grid`", output_format: "Integer", constraints: ["n == grid.length == grid[i].length", "1 <= n <= 50"] },
    hints: ["Start with 6 * v for each cell, then subtract the hidden faces (top/bottom between stacked cubes, and sides adjacent to neighbors)."],
    inputs: [ [[[1,2],[3,4]]], [[[1,1,1],[1,0,1],[1,1,1]]], [[[2,2,2],[2,1,2],[2,2,2]]], [[[1]]] ],
    refFn: (grid) => {
      let area = 0;
      let n = grid.length;
      for (let i=0; i<n; i++) {
        for (let j=0; j<n; j++) {
          if (grid[i][j] > 0) {
            area += 4 * grid[i][j] + 2;
            if (i > 0) area -= Math.min(grid[i][j], grid[i-1][j]) * 2;
            if (j > 0) area -= Math.min(grid[i][j], grid[i][j-1]) * 2;
          }
        }
      }
      return area;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> grid) {\n        return 0;\n    }\n}"
    }
  },

  // --- ARRAYS / SLIDING WINDOW (5 Easy) ---
  {
    topic: "Arrays", title: "Contains Duplicate", difficulty: "Easy",
    desc: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    meta: { input_format: "Array of integers `nums`", output_format: "Boolean", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Use a Set or sort the array to find duplicates."],
    inputs: [ [[1,2,3,1]], [[1,2,3,4]], [[1,1,1,3,3,4,3,2,4,2]], [[1]] ],
    refFn: (nums) => new Set(nums).size !== nums.length,
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[] nums) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> nums) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Contains Duplicate II", difficulty: "Easy",
    desc: "Given an integer array `nums` and an integer `k`, return `true` if there are two distinct indices `i` and `j` in the array such that `nums[i] == nums[j]` and `abs(i - j) <= k`.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Boolean", constraints: ["1 <= nums.length <= 10^5", "0 <= k <= 10^5"] },
    hints: ["Use a sliding window of size k with a Set, or a hash map storing the last seen index of each element."],
    inputs: [ [[1,2,3,1], 3], [[1,0,1,1], 1], [[1,2,3,1,2,3], 2], [[1], 1] ],
    refFn: (nums, k) => {
      let map = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (map.has(nums[i]) && i - map.get(nums[i]) <= k) return true;
        map.set(nums[i], i);
      }
      return false;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[] nums, int k) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> nums, int k) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Maximum Average Subarray I", difficulty: "Easy",
    desc: "You are given an integer array `nums` consisting of `n` elements, and an integer `k`. Find a contiguous subarray whose length is equal to `k` that has the maximum average value and return this value. Any answer with a calculation error less than 10^-5 will be accepted.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Float", constraints: ["n == nums.length", "1 <= k <= n <= 10^5"] },
    hints: ["Use a sliding window of size k. Keep track of the sum as the window slides."],
    inputs: [ [[1,12,-5,-6,50,3], 4], [[5], 1], [[-1], 1], [[0,4,0,3,2], 1] ],
    refFn: (nums, k) => {
      let sum = 0;
      for (let i = 0; i < k; i++) sum += nums[i];
      let maxSum = sum;
      for (let i = k; i < nums.length; i++) {
        sum += nums[i] - nums[i-k];
        maxSum = Math.max(maxSum, sum);
      }
      return parseFloat((maxSum / k).toFixed(5));
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public double solve(int[] nums, int k) {\n        return 0.0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    double solve(vector<int> nums, int k) {\n        return 0.0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Running Sum of 1d Array", difficulty: "Easy",
    desc: "Given an array `nums`. We define a running sum of an array as `runningSum[i] = sum(nums[0]…nums[i])`. Return the running sum of `nums`.",
    meta: { input_format: "Array of integers `nums`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 1000"] },
    hints: ["Iterate through the array and accumulate the sum. You can modify the array in-place."],
    inputs: [ [[1,2,3,4]], [[1,1,1,1,1]], [[3,1,2,10,1]], [[0]] ],
    refFn: (n) => {
      let nums = [...n];
      for (let i = 1; i < nums.length; i++) nums[i] += nums[i-1];
      return nums;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Build Array from Permutation", difficulty: "Easy",
    desc: "Given a zero-based permutation `nums` (0-indexed), build an array `ans` of the same length where `ans[i] = nums[nums[i]]` for each `0 <= i < nums.length` and return it. A zero-based permutation `nums` is an array of distinct integers from 0 to `nums.length - 1` (inclusive).",
    meta: { input_format: "Array of integers `nums`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 1000"] },
    hints: ["Just simulate the process: ans[i] = nums[nums[i]]."],
    inputs: [ [[0,2,1,5,3,4]], [[5,0,1,2,3,4]], [[0]], [[1,0]] ],
    refFn: (nums) => nums.map(n => nums[n]),
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },

  // --- 2D DYNAMIC PROGRAMMING (2 Medium, 3 Hard) ---
  {
    topic: "Dynamic Programming", title: "Unique Paths", difficulty: "Medium",
    desc: "There is a robot on an `m x n` grid. The robot is initially located at the top-left corner (i.e., `grid[0][0]`). The robot tries to move to the bottom-right corner (i.e., `grid[m - 1][n - 1]`). The robot can only move either down or right at any point in time. Given the two integers `m` and `n`, return the number of possible unique paths that the robot can take to reach the bottom-right corner.",
    meta: { input_format: "Integer `m`, Integer `n`", output_format: "Integer", constraints: ["1 <= m, n <= 100"] },
    hints: ["Use dynamic programming: dp[i][j] = dp[i-1][j] + dp[i][j-1].", "Or use combinatorics: (m+n-2) choose (m-1)."],
    inputs: [ [3, 7], [3, 2], [1, 1], [4, 4] ],
    refFn: (m, n) => {
      let dp = Array(n).fill(1);
      for(let i=1; i<m; i++) {
        for(let j=1; j<n; j++) {
          dp[j] += dp[j-1];
        }
      }
      return dp[n-1];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, m, n):\n        pass",
      Java: "class Solution {\n    public int solve(int m, int n) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int m, int n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Minimum Path Sum", difficulty: "Medium",
    desc: "Given a `m x n` `grid` filled with non-negative numbers, find a path from top left to bottom right, which minimizes the sum of all numbers along its path. Note: You can only move either down or right at any point in time.",
    meta: { input_format: "2D Array of integers `grid`", output_format: "Integer", constraints: ["1 <= m, n <= 200"] },
    hints: ["Use dynamic programming: dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])."],
    inputs: [ [[[1,3,1],[1,5,1],[4,2,1]]], [[[1,2,3],[4,5,6]]], [[[1]]], [[[0,0],[0,0]]] ],
    refFn: (g) => {
      let grid = g.map(r => [...r]);
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[0].length; j++) {
          if (i === 0 && j === 0) continue;
          if (i === 0) grid[i][j] += grid[i][j-1];
          else if (j === 0) grid[i][j] += grid[i-1][j];
          else grid[i][j] += Math.min(grid[i-1][j], grid[i][j-1]);
        }
      }
      return grid[grid.length-1][grid[0].length-1];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> grid) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Edit Distance", difficulty: "Hard",
    desc: "Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`. You have the following three operations permitted on a word: Insert a character, Delete a character, Replace a character.",
    meta: { input_format: "Strings `word1` and `word2`", output_format: "Integer", constraints: ["0 <= word1.length, word2.length <= 500"] },
    hints: ["Use 2D DP. dp[i][j] represents the edit distance between the first i characters of word1 and first j characters of word2."],
    inputs: [ ["horse", "ros"], ["intention", "execution"], ["", ""], ["a", "b"] ],
    refFn: (word1, word2) => {
      let m = word1.length, n = word2.length;
      let dp = Array.from({length: m+1}, () => Array(n+1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (word1[i-1] === word2[j-1]) dp[i][j] = dp[i-1][j-1];
          else dp[i][j] = 1 + Math.min(dp[i-1][j-1], dp[i][j-1], dp[i-1][j]);
        }
      }
      return dp[m][n];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, word1, word2):\n        pass",
      Java: "class Solution {\n    public int solve(String word1, String word2) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string word1, string word2) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Regular Expression Matching", difficulty: "Hard",
    desc: "Given an input string `s` and a pattern `p`, implement regular expression matching with support for '.' and '*' where: '.' Matches any single character. '*' Matches zero or more of the preceding element. The matching should cover the entire input string (not partial).",
    meta: { input_format: "Strings `s` and `p`", output_format: "Boolean", constraints: ["1 <= s.length <= 20", "1 <= p.length <= 20"] },
    hints: ["Use 2D DP or Memoization. Consider whether the next character in p is '*' or not."],
    inputs: [ ["aa", "a"], ["aa", "a*"], ["ab", ".*"], ["aab", "c*a*b"] ],
    refFn: (s, p) => {
      let dp = Array.from({length: s.length + 1}, () => Array(p.length + 1).fill(false));
      dp[0][0] = true;
      for (let j = 1; j <= p.length; j++) {
        if (p[j-1] === '*') dp[0][j] = dp[0][j-2];
      }
      for (let i = 1; i <= s.length; i++) {
        for (let j = 1; j <= p.length; j++) {
          if (p[j-1] === '.' || p[j-1] === s[i-1]) dp[i][j] = dp[i-1][j-1];
          else if (p[j-1] === '*') {
            dp[i][j] = dp[i][j-2];
            if (p[j-2] === '.' || p[j-2] === s[i-1]) dp[i][j] = dp[i][j] || dp[i-1][j];
          }
        }
      }
      return dp[s.length][p.length];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, p):\n        pass",
      Java: "class Solution {\n    public boolean solve(String s, String p) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s, string p) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Wildcard Matching", difficulty: "Hard",
    desc: "Given an input string (`s`) and a pattern (`p`), implement wildcard pattern matching with support for '?' and '*' where: '?' Matches any single character. '*' Matches any sequence of characters (including the empty sequence). The matching should cover the entire input string (not partial).",
    meta: { input_format: "Strings `s` and `p`", output_format: "Boolean", constraints: ["0 <= s.length, p.length <= 2000"] },
    hints: ["2D DP. '*' can match 0 characters (dp[i][j-1]) or multiple characters (dp[i-1][j])."],
    inputs: [ ["aa", "a"], ["aa", "*"], ["cb", "?a"], ["adceb", "*a*b"] ],
    refFn: (s, p) => {
      let dp = Array.from({length: s.length + 1}, () => Array(p.length + 1).fill(false));
      dp[0][0] = true;
      for (let j = 1; j <= p.length; j++) {
        if (p[j-1] === '*') dp[0][j] = dp[0][j-1];
      }
      for (let i = 1; i <= s.length; i++) {
        for (let j = 1; j <= p.length; j++) {
          if (p[j-1] === '?' || p[j-1] === s[i-1]) dp[i][j] = dp[i-1][j-1];
          else if (p[j-1] === '*') dp[i][j] = dp[i][j-1] || dp[i-1][j];
        }
      }
      return dp[s.length][p.length];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, p):\n        pass",
      Java: "class Solution {\n    public boolean solve(String s, String p) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s, string p) {\n        return false;\n    }\n}"
    }
  },

  // --- ADVANCED GRAPHS (4 Medium, 1 Hard) ---
  {
    topic: "Graphs", title: "Course Schedule", difficulty: "Medium",
    desc: "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`. Return `true` if you can finish all courses. Otherwise, return `false`.",
    meta: { input_format: "Integer `numCourses`, 2D Array `prerequisites`", output_format: "Boolean", constraints: ["1 <= numCourses <= 2000"] },
    hints: ["This is a cycle detection problem in a directed graph. Use DFS with visited states (unvisited, visiting, visited) or Kahn's algorithm (Topological Sort)."],
    inputs: [ [2, [[1,0]]], [2, [[1,0],[0,1]]], [3, [[1,0],[2,1]]], [1, []] ],
    refFn: (numCourses, prerequisites) => {
      let adj = Array.from({length: numCourses}, () => []);
      for (let [u, v] of prerequisites) adj[v].push(u);
      let state = Array(numCourses).fill(0); // 0=unvisited, 1=visiting, 2=visited
      const hasCycle = (i) => {
        if (state[i] === 1) return true;
        if (state[i] === 2) return false;
        state[i] = 1;
        for (let next of adj[i]) {
          if (hasCycle(next)) return true;
        }
        state[i] = 2;
        return false;
      };
      for (let i=0; i<numCourses; i++) {
        if (hasCycle(i)) return false;
      }
      return true;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, numCourses, prerequisites):\n        pass",
      Java: "class Solution {\n    public boolean solve(int numCourses, int[][] prerequisites) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(int numCourses, vector<vector<int>> prerequisites) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Course Schedule II", difficulty: "Medium",
    desc: "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`. Return the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses, return an empty array.",
    meta: { input_format: "Integer `numCourses`, 2D Array `prerequisites`", output_format: "Array of integers", constraints: ["1 <= numCourses <= 2000"] },
    hints: ["Use Kahn's algorithm (BFS with in-degrees) or DFS to generate a topological sort."],
    inputs: [ [2, [[1,0]]], [4, [[1,0],[2,0],[3,1],[3,2]]], [1, []], [2, [[0,1],[1,0]]] ],
    refFn: (numCourses, prerequisites) => {
      let adj = Array.from({length: numCourses}, () => []);
      let inDegree = Array(numCourses).fill(0);
      for (let [u, v] of prerequisites) { adj[v].push(u); inDegree[u]++; }
      let q = [];
      for (let i=0; i<numCourses; i++) if (inDegree[i] === 0) q.push(i);
      let order = [];
      while (q.length > 0) {
        let u = q.shift();
        order.push(u);
        for (let v of adj[u]) {
          inDegree[v]--;
          if (inDegree[v] === 0) q.push(v);
        }
      }
      return order.length === numCourses ? order : [];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, numCourses, prerequisites):\n        pass",
      Java: "class Solution {\n    public int[] solve(int numCourses, int[][] prerequisites) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(int numCourses, vector<vector<int>> prerequisites) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Network Delay Time", difficulty: "Medium",
    desc: "You are given a network of `n` nodes, labeled from 1 to `n`. You are also given `times`, a list of travel times as directed edges `times[i] = (ui, vi, wi)`, where `ui` is the source node, `vi` is the target node, and `wi` is the time it takes for a signal to travel from source to target. We will send a signal from a given node `k`. Return the minimum time it takes for all the `n` nodes to receive the signal. If it is impossible for all the `n` nodes to receive the signal, return -1.",
    meta: { input_format: "2D Array `times`, Integer `n`, Integer `k`", output_format: "Integer", constraints: ["1 <= k <= n <= 100", "1 <= times.length <= 6000"] },
    hints: ["Use Dijkstra's algorithm to find the shortest paths from the source node to all other nodes."],
    inputs: [ [[[2,1,1],[2,3,1],[3,4,1]], 4, 2], [[[1,2,1]], 2, 1], [[[1,2,1]], 2, 2], [[[1,2,1],[2,1,3]], 2, 2] ],
    refFn: (times, n, k) => {
      let adj = Array.from({length: n+1}, () => []);
      for (let [u, v, w] of times) adj[u].push([v, w]);
      let dist = Array(n+1).fill(Infinity);
      dist[k] = 0;
      let pq = [[0, k]];
      while (pq.length > 0) {
        pq.sort((a,b) => a[0]-b[0]);
        let [d, u] = pq.shift();
        if (d > dist[u]) continue;
        for (let [v, w] of adj[u]) {
          if (dist[u] + w < dist[v]) {
            dist[v] = dist[u] + w;
            pq.push([dist[v], v]);
          }
        }
      }
      let maxDist = Math.max(...dist.slice(1));
      return maxDist === Infinity ? -1 : maxDist;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, times, n, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] times, int n, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> times, int n, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Cheapest Flights Within K Stops", difficulty: "Medium",
    desc: "There are `n` cities connected by some number of flights. You are given an array `flights` where `flights[i] = [fromi, toi, pricei]` indicates that there is a flight from city `fromi` to city `toi` with cost `pricei`. You are also given three integers `src`, `dst`, and `k`, return the cheapest price from `src` to `dst` with at most `k` stops. If there is no such route, return -1.",
    meta: { input_format: "Integer `n`, 2D Array `flights`, Integer `src`, Integer `dst`, Integer `k`", output_format: "Integer", constraints: ["1 <= n <= 100", "0 <= flights.length <= (n * (n - 1) / 2)"] },
    hints: ["Use Bellman-Ford algorithm with exactly k+1 iterations, or BFS keeping track of the minimum cost at each stop count."],
    inputs: [ [4, [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], 0, 3, 1], [3, [[0,1,100],[1,2,100],[0,2,500]], 0, 2, 1], [3, [[0,1,100],[1,2,100],[0,2,500]], 0, 2, 0], [2, [[0,1,10]], 0, 1, 0] ],
    refFn: (n, flights, src, dst, k) => {
      let dist = Array(n).fill(Infinity);
      dist[src] = 0;
      for (let i = 0; i <= k; i++) {
        let nextDist = [...dist];
        for (let [u, v, w] of flights) {
          if (dist[u] !== Infinity && dist[u] + w < nextDist[v]) {
            nextDist[v] = dist[u] + w;
          }
        }
        dist = nextDist;
      }
      return dist[dst] === Infinity ? -1 : dist[dst];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n, flights, src, dst, k):\n        pass",
      Java: "class Solution {\n    public int solve(int n, int[][] flights, int src, int dst, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(int n, vector<vector<int>> flights, int src, int dst, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Word Ladder", difficulty: "Hard",
    desc: "A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that: Every adjacent pair of words differs by a single letter. Every `si` for `1 <= i <= k` is in `wordList`. `endWord` is in `wordList`. Given two words, `beginWord` and `endWord`, and a dictionary `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, or 0 if no such sequence exists.",
    meta: { input_format: "String `beginWord`, String `endWord`, Array of strings `wordList`", output_format: "Integer", constraints: ["1 <= beginWord.length <= 10", "1 <= wordList.length <= 5000"] },
    hints: ["Use BFS. Instead of building an explicit graph, iterate through all possible 1-character replacements for the current word."],
    inputs: [ ["hit", "cog", ["hot","dot","dog","lot","log","cog"]], ["hit", "cog", ["hot","dot","dog","lot","log"]], ["a", "c", ["a","b","c"]], ["a", "b", ["c"]] ],
    refFn: (beginWord, endWord, wordList) => {
      let wordSet = new Set(wordList);
      if (!wordSet.has(endWord)) return 0;
      let q = [[beginWord, 1]];
      while (q.length > 0) {
        let [word, steps] = q.shift();
        if (word === endWord) return steps;
        for (let i = 0; i < word.length; i++) {
          for (let j = 97; j <= 122; j++) {
            let nextWord = word.substring(0, i) + String.fromCharCode(j) + word.substring(i+1);
            if (wordSet.has(nextWord)) {
              wordSet.delete(nextWord);
              q.push([nextWord, steps + 1]);
            }
          }
        }
      }
      return 0;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, beginWord, endWord, wordList):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public int solve(String beginWord, String endWord, List<String> wordList) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string beginWord, string endWord, vector<string> wordList) {\n        return 0;\n    }\n}"
    }
  },

  // --- TRIES & ADVANCED STRINGS (1 Medium, 4 Hard) ---
  {
    topic: "Strings", title: "Replace Words", difficulty: "Medium",
    desc: "In English, we have a concept called root, which can be followed by some other word to form another longer word - let's call this word derivative. For example, when the root 'help' is followed by the word 'ful', we can form a derivative 'helpful'. Given a dictionary consisting of many roots and a sentence consisting of words separated by spaces, replace all the derivatives in the sentence with the root forming it. If a derivative can be replaced by more than one root, replace it with the root that has the shortest length.",
    meta: { input_format: "Array of strings `dictionary`, String `sentence`", output_format: "String", constraints: ["1 <= dictionary.length <= 1000", "1 <= sentence.length <= 10^5"] },
    hints: ["Build a Trie from the dictionary.", "For each word in the sentence, find the shortest prefix in the Trie."],
    inputs: [ [["cat","bat","rat"], "the cattle was rattled by the battery"], [["a","b","c"], "aadsfasf absbs bbab cadsfafs"], [["a", "aa", "aaa", "aaaa"], "a aa a aaaa aaa aaa aaa aaaaaa bbb baba ababa"], [["catt","cat","bat","rat"], "the cattle was rattled by the battery"] ],
    refFn: (dictionary, sentence) => {
      let trie = {};
      for (let word of dictionary) {
        let node = trie;
        for (let char of word) {
          if (!node[char]) node[char] = {};
          node = node[char];
        }
        node.isWord = true;
      }
      let words = sentence.split(" ");
      let res = [];
      for (let word of words) {
        let node = trie;
        let prefix = "";
        let found = false;
        for (let char of word) {
          if (!node[char]) break;
          prefix += char;
          node = node[char];
          if (node.isWord) { found = true; break; }
        }
        res.push(found ? prefix : word);
      }
      return res.join(" ");
    },
    starter: {
      Python: "class Solution:\n    def solve(self, dictionary, sentence):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public String solve(List<String> dictionary, String sentence) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(vector<string> dictionary, string sentence) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Palindrome Pairs", difficulty: "Hard",
    desc: "You are given a 0-indexed array of unique strings `words`. A palindrome pair is a pair of integers `(i, j)` such that: `0 <= i, j < words.length`, `i != j`, and `words[i] + words[j]` (the concatenation of the two strings) is a palindrome. Return an array of all the palindrome pairs of `words`. You must write an algorithm with O(sum of words[i].length^2) runtime complexity.",
    meta: { input_format: "Array of strings `words`", output_format: "2D Array of integers", constraints: ["1 <= words.length <= 5000", "0 <= words[i].length <= 300"] },
    hints: ["Use a Trie or a Hash Map. For each word, check all possible splits into prefix and suffix. If prefix is palindrome, find reversed suffix. If suffix is palindrome, find reversed prefix."],
    inputs: [ [["abcd","dcba","lls","s","sssll"]], [["bat","tab","cat"]], [["a",""]], [["a","b","c","ab","ac","aa"]] ],
    refFn: (words) => {
      const isPal = (s) => {
        let l = 0, r = s.length - 1;
        while (l < r) { if (s[l] !== s[r]) return false; l++; r--; }
        return true;
      };
      let map = new Map();
      for (let i = 0; i < words.length; i++) map.set(words[i], i);
      let res = [];
      for (let i = 0; i < words.length; i++) {
        let w = words[i];
        if (w === "") {
          for (let j = 0; j < words.length; j++) {
            if (i !== j && isPal(words[j])) { res.push([i, j]); res.push([j, i]); }
          }
          continue;
        }
        let rev = w.split('').reverse().join('');
        if (map.has(rev) && map.get(rev) !== i) res.push([i, map.get(rev)]);
        for (let j = 1; j < w.length; j++) {
          let left = w.substring(0, j);
          let right = w.substring(j);
          if (isPal(left)) {
            let revRight = right.split('').reverse().join('');
            if (map.has(revRight)) res.push([map.get(revRight), i]);
          }
          if (isPal(right)) {
            let revLeft = left.split('').reverse().join('');
            if (map.has(revLeft)) res.push([i, map.get(revLeft)]);
          }
        }
      }
      return res.sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, words):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(String[] words) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<string> words) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Word Break II", difficulty: "Hard",
    desc: "Given a string `s` and a dictionary of strings `wordDict`, add spaces in `s` to construct a sentence where each word is a valid dictionary word. Return all such possible sentences in any order. Note that the same word in the dictionary may be reused multiple times in the segmentation.",
    meta: { input_format: "String `s`, Array of strings `wordDict`", output_format: "Array of strings", constraints: ["1 <= s.length <= 20", "1 <= wordDict.length <= 1000"] },
    hints: ["Use backtracking with memoization. Store the list of valid sentences that can be formed from index i."],
    inputs: [ ["catsanddog", ["cat","cats","and","sand","dog"]], ["pineapplepenapple", ["apple","pen","applepen","pine","pineapple"]], ["catsandog", ["cats","dog","sand","and","cat"]], ["a", ["a"]] ],
    refFn: (s, wordDict) => {
      let set = new Set(wordDict);
      let memo = new Map();
      const dfs = (start) => {
        if (memo.has(start)) return memo.get(start);
        if (start === s.length) return [""];
        let res = [];
        for (let end = start + 1; end <= s.length; end++) {
          let word = s.substring(start, end);
          if (set.has(word)) {
            let sub = dfs(end);
            for (let seq of sub) {
              res.push(word + (seq === "" ? "" : " " + seq));
            }
          }
        }
        memo.set(start, res);
        return res;
      };
      return dfs(0).sort();
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, wordDict):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(String s, List<String> wordDict) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(string s, vector<string> wordDict) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Concatenated Words", difficulty: "Hard",
    desc: "Given an array of strings `words` (without duplicates), return all the concatenated words in the given list of `words`. A concatenated word is defined as a string that is comprised entirely of at least two shorter words in the given array.",
    meta: { input_format: "Array of strings `words`", output_format: "Array of strings", constraints: ["1 <= words.length <= 10^4", "0 <= words[i].length <= 30"] },
    hints: ["Sort the words by length. For each word, use DFS with memoization to check if it can be formed by shorter words already in the set."],
    inputs: [ [["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"]], [["cat","dog","catdog"]], [["a","b","ab","abc"]], [[""]] ],
    refFn: (words) => {
      let set = new Set(words);
      let memo = new Map();
      const dfs = (word) => {
        if (memo.has(word)) return memo.get(word);
        for (let i = 1; i < word.length; i++) {
          let prefix = word.substring(0, i);
          let suffix = word.substring(i);
          if (set.has(prefix) && (set.has(suffix) || dfs(suffix))) {
            memo.set(word, true);
            return true;
          }
        }
        memo.set(word, false);
        return false;
      };
      let res = [];
      for (let w of words) {
        if (w.length > 0 && dfs(w)) res.push(w);
      }
      return res.sort();
    },
    starter: {
      Python: "class Solution:\n    def solve(self, words):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(String[] words) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(vector<string> words) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Shortest Palindrome", difficulty: "Hard",
    desc: "You are given a string `s`. You can convert `s` to a palindrome by adding characters in front of it. Find and return the shortest palindrome you can find by performing this transformation.",
    meta: { input_format: "String `s`", output_format: "String", constraints: ["0 <= s.length <= 5 * 10^4"] },
    hints: ["Find the longest palindromic prefix of s. The characters after this prefix need to be reversed and appended to the front."],
    inputs: [ ["aacecaaa"], ["abcd"], ["a"], ["aa"] ],
    refFn: (s) => {
      if (!s || s.length === 0) return "";
      let rev = s.split('').reverse().join('');
      let str = s + "#" + rev;
      let lps = Array(str.length).fill(0);
      for (let i = 1; i < str.length; i++) {
        let j = lps[i - 1];
        while (j > 0 && str[i] !== str[j]) j = lps[j - 1];
        if (str[i] === str[j]) j++;
        lps[i] = j;
      }
      return rev.substring(0, rev.length - lps[str.length - 1]) + s;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public String solve(String s) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s) {\n        return \"\";\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b8-${idCounter++}`,
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

async function seedBatch8() {
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

seedBatch8();
