import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- TWO POINTERS (10) ---
  {
    topic: "Two Pointers", title: "Two Sum II - Input Array Is Sorted", difficulty: "Medium",
    desc: "Given a 1-indexed array of integers `numbers` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number. Return the indices of the two numbers, 1-indexed.",
    meta: { input_format: "Array of integers `numbers`, Integer `target`", output_format: "Array of integers", constraints: ["2 <= numbers.length <= 3 * 10^4"] },
    hints: ["Use two pointers, one at the beginning and one at the end."],
    inputs: [ [[2,7,11,15], 9], [[2,3,4], 6], [[-1,0], -1], [[1,2,3,4,4,9,56,90], 8] ],
    refFn: (nums, t) => {
      let l=0, r=nums.length-1;
      while(l<r) {
        let sum = nums[l]+nums[r];
        if(sum===t) return [l+1, r+1];
        if(sum<t) l++; else r--;
      }
      return [];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, numbers, target):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] numbers, int target) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> numbers, int target) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "3Sum", difficulty: "Medium",
    desc: "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`. Notice that the solution set must not contain duplicate triplets.",
    meta: { input_format: "Array of integers", output_format: "2D Array of integers", constraints: ["3 <= nums.length <= 3000"] },
    hints: ["Sort the array first.", "Iterate through the array and use two pointers for the remaining elements."],
    inputs: [ [[-1,0,1,2,-1,-4]], [[0,1,1]], [[0,0,0]], [[-2,0,0,2,2]] ],
    refFn: (nums) => {
      nums.sort((a,b)=>a-b);
      let res = [];
      for (let i=0; i<nums.length-2; i++) {
        if(i>0 && nums[i]===nums[i-1]) continue;
        let l=i+1, r=nums.length-1;
        while(l<r) {
          let sum = nums[i]+nums[l]+nums[r];
          if(sum===0) {
            res.push([nums[i],nums[l],nums[r]]);
            l++; r--;
            while(l<r && nums[l]===nums[l-1]) l++;
            while(l<r && nums[r]===nums[r+1]) r--;
          } else if(sum<0) l++; else r--;
        }
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "Container With Most Water", difficulty: "Medium",
    desc: "You are given an integer array `height` of length n. There are n vertical lines drawn such that the two endpoints of the ith line are `(i, 0)` and `(i, height[i])`. Find two lines that together with the x-axis form a container, such that the container contains the most water.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["2 <= height.length <= 10^5"] },
    hints: ["Use two pointers at the ends of the array.", "Move the pointer pointing to the shorter line inward."],
    inputs: [ [[1,8,6,2,5,4,8,3,7]], [[1,1]], [[4,3,2,1,4]], [[1,2,1]] ],
    refFn: (h) => {
      let max=0, l=0, r=h.length-1;
      while(l<r) {
        max = Math.max(max, Math.min(h[l],h[r])*(r-l));
        if(h[l]<h[r]) l++; else r--;
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, height):\n        pass",
      Java: "class Solution {\n    public int solve(int[] height) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> height) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "Trapping Rain Water", difficulty: "Hard",
    desc: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= height.length <= 2 * 10^4"] },
    hints: ["Use two pointers to track maximum heights from the left and right."],
    inputs: [ [[0,1,0,2,1,0,1,3,2,1,2,1]], [[4,2,0,3,2,5]], [[1,0,1]], [[3,0,0,2,0,4]] ],
    refFn: (h) => {
      let l=0, r=h.length-1, maxL=0, maxR=0, sum=0;
      while(l<r) {
        if(h[l]<=h[r]) {
          if(h[l]>=maxL) maxL=h[l]; else sum+=maxL-h[l];
          l++;
        } else {
          if(h[r]>=maxR) maxR=h[r]; else sum+=maxR-h[r];
          r--;
        }
      }
      return sum;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, height):\n        pass",
      Java: "class Solution {\n    public int solve(int[] height) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> height) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "Remove Duplicates from Sorted Array", difficulty: "Easy",
    desc: "Given an integer array `nums` sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Return the number of unique elements.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 3 * 10^4"] },
    hints: ["Use a fast pointer and a slow pointer."],
    inputs: [ [[1,1,2]], [[0,0,1,1,1,2,2,3,3,4]], [[1]], [[1,1,1,1]] ],
    refFn: (nums) => {
      if(nums.length===0) return 0;
      let k = 1;
      for(let i=1; i<nums.length; i++) {
        if(nums[i]!==nums[i-1]) k++;
      }
      return k;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "Remove Element", difficulty: "Easy",
    desc: "Given an integer array `nums` and an integer `val`, remove all occurrences of `val` in `nums` in-place. The order of the elements may be changed. Then return the number of elements in `nums` which are not equal to `val`.",
    meta: { input_format: "Array of integers `nums`, Integer `val`", output_format: "Integer", constraints: ["0 <= nums.length <= 100"] },
    hints: ["Use a pointer to track the next valid position."],
    inputs: [ [[3,2,2,3], 3], [[0,1,2,2,3,0,4,2], 2], [[1], 1], [[2,2,2], 2] ],
    refFn: (nums, val) => {
      let k = 0;
      for(let n of nums) if(n!==val) k++;
      return k;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, val):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int val) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int val) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "Sort Colors", difficulty: "Medium",
    desc: "Given an array `nums` with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue. We will use the integers 0, 1, and 2 to represent the color red, white, and blue, respectively.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["n == nums.length", "1 <= n <= 300"] },
    hints: ["Use the Dutch National Flag algorithm with three pointers."],
    inputs: [ [[2,0,2,1,1,0]], [[2,0,1]], [[0]], [[1,2,0]] ],
    refFn: (nums) => {
      return [...nums].sort((a,b)=>a-b);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "Reverse String", difficulty: "Easy",
    desc: "Write a function that reverses a string. The input string is given as an array of characters `s`. You must do this by modifying the input array in-place with O(1) extra memory.",
    meta: { input_format: "Array of characters", output_format: "Array of characters", constraints: ["1 <= s.length <= 10^5"] },
    hints: ["Swap characters from the ends towards the middle."],
    inputs: [ [["h","e","l","l","o"]], [["H","a","n","n","a","h"]], [["a"]], [["A","B"]] ],
    refFn: (s) => [...s].reverse(),
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public char[] solve(char[] s) {\n        return new char[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<char> solve(vector<char> s) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "Valid Palindrome II", difficulty: "Easy",
    desc: "Given a string `s`, return `true` if the `s` can be palindrome after deleting at most one character from it.",
    meta: { input_format: "String", output_format: "Boolean", constraints: ["1 <= s.length <= 10^5"] },
    hints: ["Use two pointers. If a mismatch is found, check if skipping left or right character makes it a palindrome."],
    inputs: [ ["aba"], ["abca"], ["abc"], ["abccbxa"] ],
    refFn: (s) => {
      const isPal = (l,r) => { while(l<r) { if(s[l++]!==s[r--]) return false; } return true; };
      let l=0, r=s.length-1;
      while(l<r) {
        if(s[l]!==s[r]) return isPal(l+1, r) || isPal(l, r-1);
        l++; r--;
      }
      return true;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public boolean solve(String s) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Two Pointers", title: "4Sum", difficulty: "Medium",
    desc: "Given an array `nums` of n integers, return an array of all the unique quadruplets `[nums[a], nums[b], nums[c], nums[d]]` such that `nums[a] + nums[b] + nums[c] + nums[d] == target`.",
    meta: { input_format: "Array of integers `nums`, Integer `target`", output_format: "2D Array of integers", constraints: ["1 <= nums.length <= 200"] },
    hints: ["Sort the array. Use two nested loops to fix two numbers, and two pointers for the rest."],
    inputs: [ [[1,0,-1,0,-2,2], 0], [[2,2,2,2,2], 8], [[0,0,0,0], 0], [[-3,-1,0,2,4,5], 2] ],
    refFn: (nums, t) => {
      nums.sort((a,b)=>a-b);
      let res = [];
      for(let i=0; i<nums.length-3; i++) {
        if(i>0 && nums[i]===nums[i-1]) continue;
        for(let j=i+1; j<nums.length-2; j++) {
          if(j>i+1 && nums[j]===nums[j-1]) continue;
          let l=j+1, r=nums.length-1;
          while(l<r) {
            let sum = nums[i]+nums[j]+nums[l]+nums[r];
            if(sum===t) {
              res.push([nums[i],nums[j],nums[l],nums[r]]);
              l++; r--;
              while(l<r && nums[l]===nums[l-1]) l++;
              while(l<r && nums[r]===nums[r+1]) r--;
            } else if(sum<t) l++; else r--;
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

  // --- LINKED LISTS (10) ---
  {
    topic: "Linked List", title: "Reverse Linked List", difficulty: "Easy",
    desc: "Given the `head` of a singly linked list, reverse the list, and return the reversed list. (Note: Input is provided as an array, you must return an array representing the reversed list).",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["0 <= nodes <= 5000"] },
    hints: ["Keep track of previous, current, and next pointers."],
    inputs: [ [[1,2,3,4,5]], [[1,2]], [[],], [[1]] ],
    refFn: (arr) => [...arr].reverse(),
    starter: {
      Python: "class Solution:\n    def solve(self, head):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] head) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> head) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Merge Two Sorted Lists", difficulty: "Easy",
    desc: "You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists into one sorted list. (Note: Input and output are represented as arrays).",
    meta: { input_format: "Two Arrays of integers", output_format: "Array of integers", constraints: ["Both arrays are sorted."] },
    hints: ["Use a dummy head and compare the heads of both lists."],
    inputs: [ [[1,2,4], [1,3,4]], [[], []], [[], [0]], [[2,5], [1,6]] ],
    refFn: (l1, l2) => [...l1, ...l2].sort((a,b)=>a-b),
    starter: {
      Python: "class Solution:\n    def solve(self, list1, list2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] list1, int[] list2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> list1, vector<int> list2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Linked List Cycle", difficulty: "Easy",
    desc: "Determine if a linked list has a cycle. For execution simplicity, the input is given as an array of integers and a `pos` index representing where the tail connects. Return boolean. (Input: `[array, pos]`)",
    meta: { input_format: "Array of integers, Integer `pos`", output_format: "Boolean", constraints: ["pos is -1 or a valid index in the array."] },
    hints: ["Use Floyd's Cycle-Finding Algorithm (Tortoise and Hare)."],
    inputs: [ [[[3,2,0,-4], 1]], [[[1,2], 0]], [[[1], -1]], [[[1,2,3], 1]] ],
    refFn: (arr, pos) => pos !== -1,
    starter: {
      Python: "class Solution:\n    def solve(self, head, pos):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[] head, int pos) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> head, int pos) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Middle of the Linked List", difficulty: "Easy",
    desc: "Given the `head` of a singly linked list, return the middle node of the linked list. If there are two middle nodes, return the second middle node. (Output as an array starting from middle).",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["1 <= nodes <= 100"] },
    hints: ["Use a fast pointer that moves two steps and a slow pointer that moves one step."],
    inputs: [ [[1,2,3,4,5]], [[1,2,3,4,5,6]], [[1]], [[1,2]] ],
    refFn: (arr) => arr.slice(Math.floor(arr.length/2)),
    starter: {
      Python: "class Solution:\n    def solve(self, head):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] head) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> head) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Remove Nth Node From End of List", difficulty: "Medium",
    desc: "Given the `head` of a linked list, remove the `nth` node from the end of the list and return its head.",
    meta: { input_format: "Array of integers `head`, Integer `n`", output_format: "Array of integers", constraints: ["1 <= n <= nodes"] },
    hints: ["Use two pointers with a gap of n between them."],
    inputs: [ [[1,2,3,4,5], 2], [[1], 1], [[1,2], 1], [[1,2], 2] ],
    refFn: (arr, n) => { let a=[...arr]; a.splice(arr.length-n, 1); return a; },
    starter: {
      Python: "class Solution:\n    def solve(self, head, n):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] head, int n) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> head, int n) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Add Two Numbers", difficulty: "Medium",
    desc: "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
    meta: { input_format: "Two Arrays of integers", output_format: "Array of integers", constraints: ["1 <= nodes <= 100"] },
    hints: ["Simulate addition digit by digit. Keep track of the carry."],
    inputs: [ [[2,4,3], [5,6,4]], [[0], [0]], [[9,9,9,9,9,9,9], [9,9,9,9]], [[2,3], [4,5]] ],
    refFn: (l1, l2) => {
      let res = [], carry = 0, i = 0, j = 0;
      while(i<l1.length || j<l2.length || carry) {
        let sum = (l1[i]||0) + (l2[j]||0) + carry;
        res.push(sum % 10);
        carry = Math.floor(sum / 10);
        i++; j++;
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, l1, l2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] l1, int[] l2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> l1, vector<int> l2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Intersection of Two Linked Lists", difficulty: "Easy",
    desc: "Given the heads of two singly linked lists, return the node at which the two lists intersect. If they don't intersect, return null. (For simplicity, inputs are arrays representing list sizes, and output the intersection size).",
    meta: { input_format: "Two Arrays of integers", output_format: "Integer", constraints: ["Represented by values matching at tail."] },
    hints: ["Find the lengths of both lists, align their starting points, and traverse."],
    inputs: [ [[4,1,8,4,5], [5,6,1,8,4,5]], [[1,9,1,2,4], [3,2,4]], [[2,6,4], [1,5]], [[1],[1]] ],
    refFn: (l1, l2) => {
      let len1=l1.length, len2=l2.length;
      let minLen = Math.min(len1,len2);
      for(let i=1; i<=minLen; i++) {
        if(l1[len1-i] !== l2[len2-i]) return minLen - (i-1) > 0 ? l1.slice(len1 - i + 1).length : 0;
      }
      return minLen;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, list1, list2):\n        pass",
      Java: "class Solution {\n    public int solve(int[] list1, int[] list2) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> list1, vector<int> list2) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Merge k Sorted Lists", difficulty: "Hard",
    desc: "You are given an array of `k` linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it. (Represented as a 2D array).",
    meta: { input_format: "2D Array of integers", output_format: "Array of integers", constraints: ["0 <= k <= 10^4"] },
    hints: ["Use a Priority Queue or divide and conquer."],
    inputs: [ [[[1,4,5],[1,3,4],[2,6]]], [[]], [[[]]], [[[2]]] ],
    refFn: (lists) => lists.flat().sort((a,b)=>a-b),
    starter: {
      Python: "class Solution:\n    def solve(self, lists):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[][] lists) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<vector<int>> lists) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Reverse Nodes in k-Group", difficulty: "Hard",
    desc: "Given the head of a linked list, reverse the nodes of the list `k` at a time, and return the modified list.",
    meta: { input_format: "Array of integers `head`, Integer `k`", output_format: "Array of integers", constraints: ["1 <= k <= n"] },
    hints: ["Recursion or iterative approach using a pointer to the previous group's tail."],
    inputs: [ [[1,2,3,4,5], 2], [[1,2,3,4,5], 3], [[1,2,3], 1], [[1], 1] ],
    refFn: (head, k) => {
      let res = [];
      for(let i=0; i<head.length; i+=k) {
        let group = head.slice(i, i+k);
        if(group.length === k) res.push(...group.reverse());
        else res.push(...group);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, head, k):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] head, int k) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> head, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Linked List", title: "Palindrome Linked List", difficulty: "Easy",
    desc: "Given the head of a singly linked list, return `true` if it is a palindrome or `false` otherwise.",
    meta: { input_format: "Array of integers", output_format: "Boolean", constraints: ["1 <= nodes <= 10^5"] },
    hints: ["Reverse the second half of the list and compare it with the first half."],
    inputs: [ [[1,2,2,1]], [[1,2]], [[1]], [[1,2,3,2,1]] ],
    refFn: (head) => head.join('') === [...head].reverse().join(''),
    starter: {
      Python: "class Solution:\n    def solve(self, head):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[] head) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> head) {\n        return false;\n    }\n}"
    }
  },

  // --- SLIDING WINDOW (5) ---
  {
    topic: "Sliding Window", title: "Maximum Average Subarray I", difficulty: "Easy",
    desc: "You are given an integer array `nums` consisting of `n` elements, and an integer `k`. Find a contiguous subarray whose length is equal to `k` that has the maximum average value and return this value.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Float", constraints: ["1 <= k <= n <= 10^5"] },
    hints: ["Use a sliding window to maintain the sum of size k."],
    inputs: [ [[1,12,-5,-6,50,3], 4], [[5], 1], [[0,4,0,3,2], 1], [[10, 20, 30], 2] ],
    refFn: (nums, k) => {
      let sum = 0;
      for(let i=0; i<k; i++) sum+=nums[i];
      let max = sum;
      for(let i=k; i<nums.length; i++) { sum += nums[i] - nums[i-k]; max = Math.max(max, sum); }
      return max / k;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public double solve(int[] nums, int k) {\n        return 0.0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    double solve(vector<int> nums, int k) {\n        return 0.0;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Contains Duplicate II", difficulty: "Easy",
    desc: "Given an integer array `nums` and an integer `k`, return `true` if there are two distinct indices `i` and `j` in the array such that `nums[i] == nums[j]` and `abs(i - j) <= k`.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Boolean", constraints: ["0 <= nums.length <= 10^5"] },
    hints: ["Use a sliding window of size k using a Hash Set."],
    inputs: [ [[1,2,3,1], 3], [[1,0,1,1], 1], [[1,2,3,1,2,3], 2], [[1,1], 1] ],
    refFn: (nums, k) => {
      let set = new Set();
      for(let i=0; i<nums.length; i++) {
        if(set.has(nums[i])) return true;
        set.add(nums[i]);
        if(set.size > k) set.delete(nums[i-k]);
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
    topic: "Sliding Window", title: "Longest Repeating Character Replacement", difficulty: "Medium",
    desc: "You are given a string `s` and an integer `k`. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most `k` times. Return the length of the longest substring containing the same letter you can get.",
    meta: { input_format: "String `s`, Integer `k`", output_format: "Integer", constraints: ["1 <= s.length <= 10^5"] },
    hints: ["Use a sliding window. Window is valid if window_length - max_freq_char_in_window <= k."],
    inputs: [ ["ABAB", 2], ["AABABBA", 1], ["A", 0], ["ABBB", 2] ],
    refFn: (s, k) => {
      let max = 0, l = 0, maxFreq = 0;
      let count = Array(26).fill(0);
      for(let r=0; r<s.length; r++) {
        let c = s.charCodeAt(r)-65;
        count[c]++;
        maxFreq = Math.max(maxFreq, count[c]);
        while(r-l+1 - maxFreq > k) { count[s.charCodeAt(l)-65]--; l++; }
        max = Math.max(max, r-l+1);
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, k):\n        pass",
      Java: "class Solution {\n    public int solve(String s, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string s, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Max Consecutive Ones III", difficulty: "Medium",
    desc: "Given a binary array `nums` and an integer `k`, return the maximum number of consecutive 1's in the array if you can flip at most `k` 0's.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Integer", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Use a sliding window. Maintain the number of zeros in the window."],
    inputs: [ [[1,1,1,0,0,0,1,1,1,1,0], 2], [[0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1], 3], [[0,0], 1], [[1,1], 1] ],
    refFn: (nums, k) => {
      let max = 0, l = 0, zeros = 0;
      for(let r=0; r<nums.length; r++) {
        if(nums[r]===0) zeros++;
        while(zeros>k) { if(nums[l]===0) zeros--; l++; }
        max = Math.max(max, r-l+1);
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Sliding Window", title: "Sliding Window Maximum", difficulty: "Hard",
    desc: "You are given an array of integers `nums`, there is a sliding window of size `k` which is moving from the very left of the array to the very right. You can only see the `k` numbers in the window. Each time the sliding window moves right by one position. Return the max sliding window.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Use a monotonically decreasing deque to store indices."],
    inputs: [ [[1,3,-1,-3,5,3,6,7], 3], [[1], 1], [[1,-1], 1], [[9,11], 2] ],
    refFn: (nums, k) => {
      let res = [], q = [];
      for(let i=0; i<nums.length; i++) {
        while(q.length>0 && q[0] < i-k+1) q.shift();
        while(q.length>0 && nums[q[q.length-1]] < nums[i]) q.pop();
        q.push(i);
        if(i >= k-1) res.push(nums[q[0]]);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums, int k) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums, int k) {\n        return {};\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b3-${idCounter++}`,
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

async function seedBatch3() {
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

seedBatch3();
