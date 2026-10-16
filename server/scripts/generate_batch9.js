import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- EASY (13) ---
  {
    topic: "Hash Table", title: "Intersection of Two Arrays", difficulty: "Easy",
    desc: "Given two integer arrays `nums1` and `nums2`, return an array of their intersection. Each element in the result must be unique and you may return the result in any order.",
    meta: { input_format: "Array `nums1`, Array `nums2`", output_format: "Array of integers", constraints: ["1 <= nums1.length, nums2.length <= 1000"] },
    hints: ["Use a Set to keep track of seen elements."],
    inputs: [ [[1,2,2,1], [2,2]], [[4,9,5], [9,4,9,8,4]], [[1], [1]], [[1], [2]] ],
    refFn: (nums1, nums2) => [...new Set(nums1.filter(n => nums2.includes(n)))],
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums1, int[] nums2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums1, vector<int> nums2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Intersection of Two Arrays II", difficulty: "Easy",
    desc: "Given two integer arrays `nums1` and `nums2`, return an array of their intersection. Each element in the result must appear as many times as it shows in both arrays and you may return the result in any order.",
    meta: { input_format: "Array `nums1`, Array `nums2`", output_format: "Array of integers", constraints: ["1 <= nums1.length, nums2.length <= 1000"] },
    hints: ["Use a Hash Map to count frequencies."],
    inputs: [ [[1,2,2,1], [2,2]], [[4,9,5], [9,4,9,8,4]], [[1], [1]], [[1], [2]] ],
    refFn: (nums1, nums2) => {
      let map = {};
      for (let n of nums1) map[n] = (map[n] || 0) + 1;
      let res = [];
      for (let n of nums2) {
        if (map[n]) { res.push(n); map[n]--; }
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums1, int[] nums2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums1, vector<int> nums2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Missing Number", difficulty: "Easy",
    desc: "Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.",
    meta: { input_format: "Array `nums`", output_format: "Integer", constraints: ["n == nums.length", "1 <= n <= 10^4"] },
    hints: ["You can use the formula for the sum of the first n natural numbers, or use XOR."],
    inputs: [ [[3,0,1]], [[0,1]], [[9,6,4,2,3,5,7,0,1]], [[0]] ],
    refFn: (nums) => {
      let n = nums.length;
      let sum = (n * (n + 1)) / 2;
      return sum - nums.reduce((a, b) => a + b, 0);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Single Number", difficulty: "Easy",
    desc: "Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one. You must implement a solution with a linear runtime complexity and use only constant extra space.",
    meta: { input_format: "Array `nums`", output_format: "Integer", constraints: ["1 <= nums.length <= 3 * 10^4"] },
    hints: ["Use the XOR operator. a XOR a = 0."],
    inputs: [ [[2,2,1]], [[4,1,2,1,2]], [[1]], [[1,1,3]] ],
    refFn: (nums) => nums.reduce((a, b) => a ^ b, 0),
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Happy Number", difficulty: "Easy",
    desc: "Write an algorithm to determine if a number `n` is happy. A happy number is a number defined by the following process: Starting with any positive integer, replace the number by the sum of the squares of its digits. Repeat the process until the number equals 1 (where it will stay), or it loops endlessly in a cycle which does not include 1.",
    meta: { input_format: "Integer `n`", output_format: "Boolean", constraints: ["1 <= n <= 2^31 - 1"] },
    hints: ["Use a Set to keep track of numbers you have already seen to detect cycles."],
    inputs: [ [19], [2], [1], [7] ],
    refFn: (n) => {
      let set = new Set();
      while (n !== 1 && !set.has(n)) {
        set.add(n);
        n = String(n).split('').reduce((sum, d) => sum + parseInt(d) ** 2, 0);
      }
      return n === 1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public boolean solve(int n) {\n        return false;\n    }\n}",
      "C++": "class Solution {\npublic:\n    bool solve(int n) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Next Greater Element I", difficulty: "Easy",
    desc: "The next greater element of some element `x` in an array is the first greater element that is to the right of `x` in the same array. You are given two distinct 0-indexed integer arrays `nums1` and `nums2`, where `nums1` is a subset of `nums2`. For each `0 <= i < nums1.length`, find the index `j` such that `nums1[i] == nums2[j]` and determine the next greater element of `nums2[j]` in `nums2`. If there is no next greater element, then the answer for this query is `-1`.",
    meta: { input_format: "Array `nums1`, Array `nums2`", output_format: "Array of integers", constraints: ["1 <= nums1.length <= nums2.length <= 1000"] },
    hints: ["Use a monotonic decreasing stack to find the next greater element for all elements in nums2."],
    inputs: [ [[4,1,2], [1,3,4,2]], [[2,4], [1,2,3,4]], [[1], [1,2]], [[1,2], [2,1]] ],
    refFn: (nums1, nums2) => {
      let map = {};
      let stack = [];
      for (let n of nums2) {
        while (stack.length > 0 && stack[stack.length - 1] < n) {
          map[stack.pop()] = n;
        }
        stack.push(n);
      }
      return nums1.map(n => map[n] || -1);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums1, int[] nums2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums1, vector<int> nums2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Last Stone Weight", difficulty: "Easy",
    desc: "You are given an array of integers `stones` where `stones[i]` is the weight of the `ith` stone. We are playing a game with the stones. On each turn, we choose the heaviest two stones and smash them together. Suppose the heaviest two stones have weights `x` and `y` with `x <= y`. If `x == y`, both stones are destroyed. If `x != y`, the stone of weight `x` is destroyed, and the stone of weight `y` has new weight `y - x`. At the end of the game, there is at most one stone left. Return the weight of the last remaining stone. If there are no stones left, return 0.",
    meta: { input_format: "Array `stones`", output_format: "Integer", constraints: ["1 <= stones.length <= 30"] },
    hints: ["Use a Max Heap or sort the array after every smash."],
    inputs: [ [[2,7,4,1,8,1]], [[1]], [[2,2]], [[1,3]] ],
    refFn: (s) => {
      let stones = [...s];
      while (stones.length > 1) {
        stones.sort((a, b) => a - b);
        let y = stones.pop();
        let x = stones.pop();
        if (x !== y) stones.push(y - x);
      }
      return stones.length === 0 ? 0 : stones[0];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, stones):\n        pass",
      Java: "class Solution {\n    public int solve(int[] stones) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> stones) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Relative Ranks", difficulty: "Easy",
    desc: "You are given an integer array `score` of size `n`, where `score[i]` is the score of the `ith` athlete in a competition. All the scores are guaranteed to be unique. Return an array `answer` of size `n` where `answer[i]` is the rank of the `ith` athlete. The top 3 are 'Gold Medal', 'Silver Medal', and 'Bronze Medal'.",
    meta: { input_format: "Array `score`", output_format: "Array of strings", constraints: ["1 <= score.length <= 10^4"] },
    hints: ["Sort the scores in descending order to assign ranks, then map them back to their original indices."],
    inputs: [ [[5,4,3,2,1]], [[10,3,8,9,4]], [[1]], [[2,1]] ],
    refFn: (score) => {
      let sorted = [...score].sort((a, b) => b - a);
      let map = new Map();
      sorted.forEach((s, i) => {
        if (i === 0) map.set(s, "Gold Medal");
        else if (i === 1) map.set(s, "Silver Medal");
        else if (i === 2) map.set(s, "Bronze Medal");
        else map.set(s, String(i + 1));
      });
      return score.map(s => map.get(s));
    },
    starter: {
      Python: "class Solution:\n    def solve(self, score):\n        pass",
      Java: "class Solution {\n    public String[] solve(int[] score) {\n        return new String[]{};\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(vector<int> score) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Third Maximum Number", difficulty: "Easy",
    desc: "Given an integer array `nums`, return the third distinct maximum number in this array. If the third maximum does not exist, return the maximum number.",
    meta: { input_format: "Array `nums`", output_format: "Integer", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Keep track of the top 3 distinct maximums using variables or a Set."],
    inputs: [ [[3,2,1]], [[1,2]], [[2,2,3,1]], [[5,2,2]] ],
    refFn: (nums) => {
      let arr = [...new Set(nums)].sort((a, b) => b - a);
      return arr.length >= 3 ? arr[2] : arr[0];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Squares of a Sorted Array", difficulty: "Easy",
    desc: "Given an integer array `nums` sorted in non-decreasing order, return an array of the squares of each number sorted in non-decreasing order.",
    meta: { input_format: "Array `nums`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Use two pointers, one at the beginning and one at the end, and build the result array from back to front."],
    inputs: [ [[-4,-1,0,3,10]], [[-7,-3,2,3,11]], [[1]], [[-1]] ],
    refFn: (nums) => nums.map(x => x * x).sort((a, b) => a - b),
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Summary Ranges", difficulty: "Easy",
    desc: "You are given a sorted unique integer array `nums`. A range `[a,b]` is the set of all integers from `a` to `b` (inclusive). Return the smallest sorted list of ranges that cover all the numbers in the array exactly.",
    meta: { input_format: "Array `nums`", output_format: "Array of strings", constraints: ["0 <= nums.length <= 20"] },
    hints: ["Iterate through the array and track the start of the current consecutive sequence."],
    inputs: [ [[0,1,2,4,5,7]], [[0,2,3,4,6,8,9]], [[-1]], [[]] ],
    refFn: (nums) => {
      let res = [];
      for (let i = 0; i < nums.length; i++) {
        let start = nums[i];
        while (i + 1 < nums.length && nums[i+1] === nums[i] + 1) i++;
        if (start === nums[i]) res.push(String(start));
        else res.push(start + "->" + nums[i]);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Find All Numbers Disappeared in an Array", difficulty: "Easy",
    desc: "Given an array `nums` of `n` integers where `nums[i]` is in the range `[1, n]`, return an array of all the integers in the range `[1, n]` that do not appear in `nums`.",
    meta: { input_format: "Array `nums`", output_format: "Array of integers", constraints: ["n == nums.length", "1 <= n <= 10^5"] },
    hints: ["You can do this in O(n) time and O(1) extra space by marking visited indices negative."],
    inputs: [ [[4,3,2,7,8,2,3,1]], [[1,1]], [[2,2]], [[1,2,3]] ],
    refFn: (nums) => {
      let set = new Set(nums);
      let res = [];
      for (let i = 1; i <= nums.length; i++) {
        if (!set.has(i)) res.push(i);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<Integer> solve(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Move Zeroes to End", difficulty: "Easy",
    desc: "Given an integer array `nums`, move all 0's to the end of it while maintaining the relative order of the non-zero elements. Note that you must do this in-place without making a copy of the array. (Return the modified array).",
    meta: { input_format: "Array `nums`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Use a two-pointer approach: one for iterating, one for placing non-zero elements."],
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

  // --- MEDIUM (8) ---
  {
    topic: "Backtracking", title: "Subsets", difficulty: "Medium",
    desc: "Given an integer array `nums` of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.",
    meta: { input_format: "Array `nums`", output_format: "2D Array of integers", constraints: ["1 <= nums.length <= 10"] },
    hints: ["Use backtracking to explore including or excluding each element."],
    inputs: [ [[1,2,3]], [[0]], [[1,2]], [[1,2,3,4]] ],
    refFn: (nums) => {
      let res = [];
      const dfs = (i, path) => {
        if (i === nums.length) { res.push([...path]); return; }
        path.push(nums[i]);
        dfs(i + 1, path);
        path.pop();
        dfs(i + 1, path);
      };
      dfs(0, []);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "Subsets II", difficulty: "Medium",
    desc: "Given an integer array `nums` that may contain duplicates, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.",
    meta: { input_format: "Array `nums`", output_format: "2D Array of integers", constraints: ["1 <= nums.length <= 10"] },
    hints: ["Sort the array first. Skip elements that are the same as the previous one if the previous one wasn't included in the current recursive branch."],
    inputs: [ [[1,2,2]], [[0]], [[1,1,1]], [[4,4,4,1,4]] ],
    refFn: (nums) => {
      nums.sort((a,b) => a-b);
      let res = [];
      const dfs = (i, path) => {
        if (i === nums.length) { res.push([...path]); return; }
        path.push(nums[i]);
        dfs(i + 1, path);
        path.pop();
        while (i + 1 < nums.length && nums[i] === nums[i+1]) i++;
        dfs(i + 1, path);
      };
      dfs(0, []);
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
    hints: ["Use backtracking to build the combinations element by element."],
    inputs: [ [4, 2], [1, 1], [3, 3], [5, 1] ],
    refFn: (n, k) => {
      let res = [];
      const dfs = (start, path) => {
        if (path.length === k) { res.push([...path]); return; }
        for (let i = start; i <= n; i++) {
          path.push(i);
          dfs(i + 1, path);
          path.pop();
        }
      };
      dfs(1, []);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n, k):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int n, int k) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(int n, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "Combination Sum II", difficulty: "Medium",
    desc: "Given a collection of candidate numbers (`candidates`) and a target number (`target`), find all unique combinations in `candidates` where the candidate numbers sum to `target`. Each number in `candidates` may only be used once in the combination.",
    meta: { input_format: "Array `candidates`, Integer `target`", output_format: "2D Array of integers", constraints: ["1 <= candidates.length <= 100", "1 <= target <= 30"] },
    hints: ["Sort the array to handle duplicates easily. Skip duplicate elements at the same level of the backtracking tree."],
    inputs: [ [[10,1,2,7,6,1,5], 8], [[2,5,2,1,2], 5], [[1,1,1], 2], [[1], 1] ],
    refFn: (candidates, target) => {
      candidates.sort((a,b) => a-b);
      let res = [];
      const dfs = (i, target, path) => {
        if (target === 0) { res.push([...path]); return; }
        if (target < 0) return;
        for (let j = i; j < candidates.length; j++) {
          if (j > i && candidates[j] === candidates[j-1]) continue;
          path.push(candidates[j]);
          dfs(j + 1, target - candidates[j], path);
          path.pop();
        }
      };
      dfs(0, target, []);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, candidates, target):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] candidates, int target) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> candidates, int target) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Top K Frequent Elements", difficulty: "Medium",
    desc: "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.",
    meta: { input_format: "Array `nums`, Integer `k`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^5", "1 <= k <= unique elements"] },
    hints: ["Count frequencies, then use a Min Heap of size k, or Bucket Sort."],
    inputs: [ [[1,1,1,2,2,3], 2], [[1], 1], [[4,4,4,4], 1], [[1,2,3,1,2,1], 2] ],
    refFn: (nums, k) => {
      let map = {};
      for (let n of nums) map[n] = (map[n] || 0) + 1;
      return Object.keys(map).sort((a, b) => map[b] - map[a]).slice(0, k).map(Number);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums, int k) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "Kth Largest Element in an Array", difficulty: "Medium",
    desc: "Given an integer array `nums` and an integer `k`, return the `kth` largest element in the array. Note that it is the `kth` largest element in the sorted order, not the `kth` distinct element.",
    meta: { input_format: "Array `nums`, Integer `k`", output_format: "Integer", constraints: ["1 <= k <= nums.length <= 10^5"] },
    hints: ["Use a Min Heap of size k, or Quickselect."],
    inputs: [ [[3,2,1,5,6,4], 2], [[3,2,3,1,2,4,5,5,6], 4], [[1], 1], [[-1, -1], 2] ],
    refFn: (nums, k) => {
      return [...nums].sort((a,b) => b-a)[k-1];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Heap", title: "K Closest Points to Origin", difficulty: "Medium",
    desc: "Given an array of `points` where `points[i] = [xi, yi]` represents a point on the X-Y plane and an integer `k`, return the `k` closest points to the origin `(0, 0)`. The distance between two points on the X-Y plane is the Euclidean distance.",
    meta: { input_format: "2D Array `points`, Integer `k`", output_format: "2D Array of integers", constraints: ["1 <= k <= points.length <= 10^4"] },
    hints: ["Sort the points by distance or use a Max Heap of size k."],
    inputs: [ [[[1,3],[-2,2]], 1], [[[3,3],[5,-1],[-2,4]], 2], [[[0,1],[1,0]], 2], [[[1,1]], 1] ],
    refFn: (points, k) => {
      let pts = [...points].sort((a,b) => (a[0]**2 + a[1]**2) - (b[0]**2 + b[1]**2));
      return pts.slice(0, k);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, points, k):\n        pass",
      Java: "class Solution {\n    public int[][] solve(int[][] points, int k) {\n        return new int[][]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<vector<int>> points, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Daily Temperatures", difficulty: "Medium",
    desc: "Given an array of integers `temperatures` represents the daily temperatures, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `ith` day to get a warmer temperature. If there is no future day for which this is possible, keep `answer[i] == 0` instead.",
    meta: { input_format: "Array `temperatures`", output_format: "Array of integers", constraints: ["1 <= temperatures.length <= 10^5"] },
    hints: ["Use a monotonic decreasing stack to store indices."],
    inputs: [ [[73,74,75,71,69,72,76,73]], [[30,40,50,60]], [[30,60,90]], [[90,60,30]] ],
    refFn: (temperatures) => {
      let res = Array(temperatures.length).fill(0);
      let stack = [];
      for (let i = 0; i < temperatures.length; i++) {
        while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
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

  // --- HARD (13) ---
  {
    topic: "Arrays", title: "Trapping Rain Water", difficulty: "Hard",
    desc: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    meta: { input_format: "Array `height`", output_format: "Integer", constraints: ["1 <= n <= 2 * 10^4"] },
    hints: ["Use two pointers starting from both ends, or precompute the max height to the left and right for each index."],
    inputs: [ [[0,1,0,2,1,0,1,3,2,1,2,1]], [[4,2,0,3,2,5]], [[1,1]], [[5,4,1,2]] ],
    refFn: (height) => {
      if (height.length === 0) return 0;
      let l = 0, r = height.length - 1;
      let leftMax = height[l], rightMax = height[r];
      let res = 0;
      while (l < r) {
        if (leftMax < rightMax) {
          l++;
          leftMax = Math.max(leftMax, height[l]);
          res += leftMax - height[l];
        } else {
          r--;
          rightMax = Math.max(rightMax, height[r]);
          res += rightMax - height[r];
        }
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, height):\n        pass",
      Java: "class Solution {\n    public int solve(int[] height) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> height) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Median of Two Sorted Arrays", difficulty: "Hard",
    desc: "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
    meta: { input_format: "Array `nums1`, Array `nums2`", output_format: "Float", constraints: ["0 <= m, n <= 1000", "m + n >= 1"] },
    hints: ["Binary search on the smaller array to find the correct partition."],
    inputs: [ [[1,3], [2]], [[1,2], [3,4]], [[0,0], [0,0]], [[], [1]] ],
    refFn: (nums1, nums2) => {
      let merged = [...nums1, ...nums2].sort((a,b) => a-b);
      let n = merged.length;
      if (n % 2 === 1) return merged[Math.floor(n / 2)];
      return (merged[n / 2 - 1] + merged[n / 2]) / 2;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2):\n        pass",
      Java: "class Solution {\n    public double solve(int[] nums1, int[] nums2) {\n        return 0.0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    double solve(vector<int> nums1, vector<int> nums2) {\n        return 0.0;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Substring with Concatenation of All Words", difficulty: "Hard",
    desc: "You are given a string `s` and an array of strings `words`. All the strings of `words` are of the same length. A concatenated substring in `s` is a substring that contains all the strings of any permutation of `words` concatenated. Return the starting indices of all the concatenated substrings in `s`.",
    meta: { input_format: "String `s`, Array `words`", output_format: "Array of integers", constraints: ["1 <= s.length <= 10^4", "1 <= words.length <= 5000", "1 <= words[i].length <= 30"] },
    hints: ["Use a sliding window. Since all words have the same length, you can slide the window in steps of word length."],
    inputs: [ ["barfoothefoobarman", ["foo","bar"]], ["wordgoodgoodgoodbestword", ["word","good","best","word"]], ["barfoofoobarthefoobarman", ["bar","foo","the"]], ["a", ["a"]] ],
    refFn: (s, words) => {
      if (words.length === 0 || s.length === 0) return [];
      let wordLen = words[0].length;
      let numWords = words.length;
      let totalLen = wordLen * numWords;
      let map = {};
      for (let w of words) map[w] = (map[w] || 0) + 1;
      let res = [];
      for (let i = 0; i <= s.length - totalLen; i++) {
        let seen = {};
        let j = 0;
        while (j < numWords) {
          let word = s.substr(i + j * wordLen, wordLen);
          if (!map[word]) break;
          seen[word] = (seen[word] || 0) + 1;
          if (seen[word] > map[word]) break;
          j++;
        }
        if (j === numWords) res.push(i);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, words):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<Integer> solve(String s, String[] words) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(string s, vector<string> words) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Max Points on a Line", difficulty: "Hard",
    desc: "Given an array of `points` where `points[i] = [xi, yi]` represents a point on the X-Y plane, return the maximum number of points that lie on the same straight line.",
    meta: { input_format: "2D Array `points`", output_format: "Integer", constraints: ["1 <= points.length <= 300"] },
    hints: ["For each point, calculate the slopes to all other points using GCD to avoid floating-point inaccuracies."],
    inputs: [ [[[1,1],[2,2],[3,3]]], [[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]], [[[0,0]]], [[[0,0],[1,1],[0,0]]] ],
    refFn: (points) => {
      if (points.length <= 2) return points.length;
      let res = 0;
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      for (let i = 0; i < points.length; i++) {
        let map = new Map();
        let duplicates = 1;
        let maxLocal = 0;
        for (let j = i + 1; j < points.length; j++) {
          let dx = points[j][0] - points[i][0];
          let dy = points[j][1] - points[i][1];
          if (dx === 0 && dy === 0) { duplicates++; continue; }
          let g = gcd(Math.abs(dx), Math.abs(dy));
          dx /= g; dy /= g;
          if (dx < 0 || (dx === 0 && dy < 0)) { dx = -dx; dy = -dy; }
          let key = `\${dx}_\${dy}`;
          map.set(key, (map.get(key) || 0) + 1);
          maxLocal = Math.max(maxLocal, map.get(key));
        }
        res = Math.max(res, maxLocal + duplicates);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, points):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] points) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> points) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Sliding Window Maximum", difficulty: "Hard",
    desc: "You are given an array of integers `nums`, there is a sliding window of size `k` which is moving from the very left of the array to the very right. You can only see the `k` numbers in the window. Each time the sliding window moves right by one position. Return the max sliding window.",
    meta: { input_format: "Array `nums`, Integer `k`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^5", "1 <= k <= nums.length"] },
    hints: ["Use a monotonic decreasing deque to store indices of potential maximums."],
    inputs: [ [[1,3,-1,-3,5,3,6,7], 3], [[1], 1], [[1,-1], 1], [[9,11], 2] ],
    refFn: (nums, k) => {
      let deque = [], res = [];
      for (let i = 0; i < nums.length; i++) {
        while (deque.length > 0 && deque[0] < i - k + 1) deque.shift();
        while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) deque.pop();
        deque.push(i);
        if (i >= k - 1) res.push(nums[deque[0]]);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums, int k) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Sliding Window Median", difficulty: "Hard",
    desc: "The median is the middle value in an ordered integer list. You are given an integer array `nums` and an integer `k`. There is a sliding window of size `k` which is moving from the very left of the array to the very right. Return the median array for each window in the original array.",
    meta: { input_format: "Array `nums`, Integer `k`", output_format: "Array of floats", constraints: ["1 <= k <= nums.length <= 10^5"] },
    hints: ["Use two heaps (Max Heap for lower half, Min Heap for upper half) or a sorted data structure to maintain the window elements."],
    inputs: [ [[1,3,-1,-3,5,3,6,7], 3], [[1,2,3,4,2,3,1,4,2], 3], [[1], 1], [[1,2], 2] ],
    refFn: (nums, k) => {
      let res = [];
      let window = [];
      for (let i = 0; i < nums.length; i++) {
        let val = nums[i];
        let idx = window.findIndex(x => x > val);
        if (idx === -1) window.push(val);
        else window.splice(idx, 0, val);
        if (window.length > k) {
          let out = nums[i - k];
          window.splice(window.indexOf(out), 1);
        }
        if (window.length === k) {
          if (k % 2 === 1) res.push(window[Math.floor(k / 2)]);
          else res.push((window[k / 2 - 1] + window[k / 2]) / 2);
        }
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public double[] solve(int[] nums, int k) {\n        return new double[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<double> solve(vector<int> nums, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Largest Rectangle in Histogram", difficulty: "Hard",
    desc: "Given an array of integers `heights` representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
    meta: { input_format: "Array `heights`", output_format: "Integer", constraints: ["1 <= heights.length <= 10^5"] },
    hints: ["Use a monotonic increasing stack to keep track of the start indices of rectangles."],
    inputs: [ [[2,1,5,6,2,3]], [[2,4]], [[1]], [[0,0]] ],
    refFn: (heights) => {
      let stack = [], maxArea = 0;
      for (let i = 0; i <= heights.length; i++) {
        let h = i === heights.length ? 0 : heights[i];
        while (stack.length > 0 && heights[stack[stack.length - 1]] > h) {
          let height = heights[stack.pop()];
          let width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
          maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
      }
      return maxArea;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, heights):\n        pass",
      Java: "class Solution {\n    public int solve(int[] heights) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> heights) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Stack", title: "Maximal Rectangle", difficulty: "Hard",
    desc: "Given a `rows x cols` binary `matrix` filled with 0's and 1's, find the largest rectangle containing only 1's and return its area.",
    meta: { input_format: "2D Array `matrix`", output_format: "Integer", constraints: ["1 <= rows, cols <= 200"] },
    hints: ["Treat each row as a histogram's base and apply the Largest Rectangle in Histogram algorithm."],
    inputs: [ [[[1,0,1,0,0],[1,0,1,1,1],[1,1,1,1,1],[1,0,0,1,0]]], [[[0]]], [[[1]]], [[[0,0],[0,0]]] ],
    refFn: (m) => {
      if (m.length === 0) return 0;
      let heights = Array(m[0].length).fill(0);
      let maxArea = 0;
      for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < m[0].length; j++) {
          heights[j] = m[i][j] === 1 || m[i][j] === "1" ? heights[j] + 1 : 0;
        }
        let stack = [];
        for (let j = 0; j <= heights.length; j++) {
          let h = j === heights.length ? 0 : heights[j];
          while (stack.length > 0 && heights[stack[stack.length - 1]] > h) {
            let height = heights[stack.pop()];
            let width = stack.length === 0 ? j : j - stack[stack.length - 1] - 1;
            maxArea = Math.max(maxArea, height * width);
          }
          stack.push(j);
        }
      }
      return maxArea;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, matrix):\n        pass",
      Java: "class Solution {\n    public int solve(char[][] matrix) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<char>> matrix) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "N-Queens", difficulty: "Hard",
    desc: "The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other. Given an integer `n`, return all distinct solutions to the n-queens puzzle. You may return the answer in any order.",
    meta: { input_format: "Integer `n`", output_format: "2D Array of strings", constraints: ["1 <= n <= 9"] },
    hints: ["Use backtracking to place queens row by row. Use sets to track used columns, positive diagonals, and negative diagonals."],
    inputs: [ [4], [1], [2], [3] ],
    refFn: (n) => {
      let res = [];
      let board = Array.from({length: n}, () => Array(n).fill('.'));
      let cols = new Set(), posDiag = new Set(), negDiag = new Set();
      const dfs = (r) => {
        if (r === n) { res.push(board.map(row => row.join(''))); return; }
        for (let c = 0; c < n; c++) {
          if (cols.has(c) || posDiag.has(r + c) || negDiag.has(r - c)) continue;
          cols.add(c); posDiag.add(r + c); negDiag.add(r - c); board[r][c] = 'Q';
          dfs(r + 1);
          cols.delete(c); posDiag.delete(r + c); negDiag.delete(r - c); board[r][c] = '.';
        }
      };
      dfs(0);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<String>> solve(int n) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<string>> solve(int n) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "N-Queens II", difficulty: "Hard",
    desc: "The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other. Given an integer `n`, return the number of distinct solutions to the n-queens puzzle.",
    meta: { input_format: "Integer `n`", output_format: "Integer", constraints: ["1 <= n <= 9"] },
    hints: ["Identical approach to N-Queens, but return a count instead of constructing the boards."],
    inputs: [ [4], [1], [2], [3] ],
    refFn: (n) => {
      let res = 0;
      let cols = new Set(), posDiag = new Set(), negDiag = new Set();
      const dfs = (r) => {
        if (r === n) { res++; return; }
        for (let c = 0; c < n; c++) {
          if (cols.has(c) || posDiag.has(r + c) || negDiag.has(r - c)) continue;
          cols.add(c); posDiag.add(r + c); negDiag.add(r - c);
          dfs(r + 1);
          cols.delete(c); posDiag.delete(r + c); negDiag.delete(r - c);
        }
      };
      dfs(0);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public int solve(int n) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "Unique Paths III", difficulty: "Hard",
    desc: "You are given an `m x n` integer array `grid` where `grid[i][j]` could be: 1 (starting square), 2 (ending square), 0 (empty square), -1 (obstacle). Return the number of 4-directional walks from the starting square to the ending square, that walk over every non-obstacle square exactly once.",
    meta: { input_format: "2D Array `grid`", output_format: "Integer", constraints: ["1 <= m, n <= 20", "1 <= m * n <= 20"] },
    hints: ["Use backtracking DFS. Count the total empty squares first, then ensure all are visited when you reach the end."],
    inputs: [ [[[1,0,0,0],[0,0,0,0],[0,0,2,-1]]], [[[1,0,0,0],[0,0,0,0],[0,0,0,2]]], [[[0,1],[2,0]]], [[[1,2]]] ],
    refFn: (grid) => {
      let m = grid.length, n = grid[0].length;
      let empty = 1, startR = 0, startC = 0;
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          if (grid[i][j] === 0) empty++;
          else if (grid[i][j] === 1) { startR = i; startC = j; }
        }
      }
      let res = 0;
      const dfs = (r, c, count) => {
        if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] < 0) return;
        if (grid[r][c] === 2) {
          if (count === empty) res++;
          return;
        }
        grid[r][c] = -2;
        dfs(r + 1, c, count + 1);
        dfs(r - 1, c, count + 1);
        dfs(r, c + 1, count + 1);
        dfs(r, c - 1, count + 1);
        grid[r][c] = 0;
      };
      dfs(startR, startC, 0);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> grid) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Backtracking", title: "Expression Add Operators", difficulty: "Hard",
    desc: "Given a string `num` that contains only digits and an integer `target`, return all possibilities to insert the binary operators '+', '-', and/or '*' between the digits of `num` so that the resultant expression evaluates to the `target` value.",
    meta: { input_format: "String `num`, Integer `target`", output_format: "Array of strings", constraints: ["1 <= num.length <= 10"] },
    hints: ["Use backtracking to try all combinations. Keep track of the current evaluation and the previous operand (for multiplication)."],
    inputs: [ ["123", 6], ["232", 8], ["3456237490", 9191], ["105", 5] ],
    refFn: (num, target) => {
      let res = [];
      const dfs = (i, path, evalVal, multVal) => {
        if (i === num.length) {
          if (evalVal === target) res.push(path);
          return;
        }
        for (let j = i; j < num.length; j++) {
          if (j !== i && num[i] === '0') break;
          let currStr = num.substring(i, j + 1);
          let curr = parseInt(currStr, 10);
          if (i === 0) {
            dfs(j + 1, path + currStr, curr, curr);
          } else {
            dfs(j + 1, path + "+" + currStr, evalVal + curr, curr);
            dfs(j + 1, path + "-" + currStr, evalVal - curr, -curr);
            dfs(j + 1, path + "*" + currStr, evalVal - multVal + multVal * curr, multVal * curr);
          }
        }
      };
      dfs(0, "", 0, 0);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, num, target):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<String> solve(String num, int target) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <string>\n#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> solve(string num, int target) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Count of Smaller Numbers After Self", difficulty: "Hard",
    desc: "Given an integer array `nums`, return an integer array `counts` where `counts[i]` is the number of smaller elements to the right of `nums[i]`.",
    meta: { input_format: "Array `nums`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Use Merge Sort and count smaller elements during the merge step, or a Binary Indexed Tree."],
    inputs: [ [[5,2,6,1]], [[-1]], [[-1,-1]], [[1,2,3]] ],
    refFn: (nums) => {
      let res = Array(nums.length).fill(0);
      for (let i = 0; i < nums.length; i++) {
        let count = 0;
        for (let j = i + 1; j < nums.length; j++) {
          if (nums[j] < nums[i]) count++;
        }
        res[i] = count;
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<Integer> solve(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b9-${idCounter++}`,
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

async function seedBatch9() {
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

seedBatch9();
