import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

const rawProblems = [
  // --- ARRAYS (4) ---
  {
    topic: "Arrays", title: "Max Consecutive Ones", difficulty: "Easy",
    desc: "Given a binary array `nums`, return the maximum number of consecutive 1's in the array.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 10^5", "nums[i] is either 0 or 1"] },
    hints: ["Keep a count of current consecutive ones and a max count.", "Reset count to 0 when you see a 0."],
    inputs: [ [[1,1,0,1,1,1]], [[1,0,1,1,0,1]], [[0,0,0]], [[1,1,1,1]] ],
    refFn: (nums) => {
      let max = 0, cur = 0;
      for (let n of nums) { if (n === 1) cur++; else { if (cur > max) max = cur; cur = 0; } }
      return Math.max(max, cur);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Move Zeroes", difficulty: "Easy",
    desc: "Given an integer array `nums`, move all 0's to the end of it while maintaining the relative order of the non-zero elements.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^4"] },
    hints: ["Use a pointer to keep track of the next position for a non-zero element."],
    inputs: [ [[0,1,0,3,12]], [[0]], [[1,2,3]], [[0,0,1]] ],
    refFn: (nums) => {
      let arr = [...nums];
      let p = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== 0) arr[p++] = arr[i];
      }
      while (p < arr.length) arr[p++] = 0;
      return arr;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Product of Array Except Self", difficulty: "Medium",
    desc: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. You must write an algorithm that runs in O(n) time and without using the division operation.",
    meta: { input_format: "Array of integers", output_format: "Array of integers", constraints: ["2 <= nums.length <= 10^5"] },
    hints: ["Calculate prefix products.", "Calculate suffix products.", "Multiply them."],
    inputs: [ [[1,2,3,4]], [[-1,1,0,-3,3]], [[0,0]], [[5, 2]] ],
    refFn: (nums) => {
      let res = Array(nums.length).fill(1);
      let p = 1;
      for (let i = 0; i < nums.length; i++) { res[i] = p; p *= nums[i]; }
      p = 1;
      for (let i = nums.length - 1; i >= 0; i--) { res[i] *= p; p *= nums[i]; }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Arrays", title: "Subarray Sum Equals K", difficulty: "Medium",
    desc: "Given an array of integers `nums` and an integer `k`, return the total number of subarrays whose sum equals to `k`. A subarray is a contiguous non-empty sequence of elements within an array.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Integer", constraints: ["1 <= nums.length <= 2 * 10^4"] },
    hints: ["Use a hash map to store prefix sums and their frequencies."],
    inputs: [ [[1,1,1], 2], [[1,2,3], 3], [[1,-1,1,-1], 0], [[10, 2, -2, -20, 10], -10] ],
    refFn: (nums, k) => {
      let count = 0, sum = 0;
      let map = new Map();
      map.set(0, 1);
      for (let i = 0; i < nums.length; i++) {
        sum += nums[i];
        if (map.has(sum - k)) count += map.get(sum - k);
        map.set(sum, (map.get(sum) || 0) + 1);
      }
      return count;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums, int k) {\n        return 0;\n    }\n}"
    }
  },

  // --- STRINGS (11) ---
  {
    topic: "Strings", title: "Valid Palindrome", difficulty: "Easy",
    desc: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
    meta: { input_format: "String `s`", output_format: "Boolean", constraints: ["1 <= s.length <= 2 * 10^5"] },
    hints: ["Use two pointers, one from the start and one from the end."],
    inputs: [ ["A man, a plan, a canal: Panama"], ["race a car"], [" "], ["ab_a"] ],
    refFn: (s) => {
      let str = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return str === str.split('').reverse().join('');
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public boolean solve(String s) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Longest Common Prefix", difficulty: "Easy",
    desc: "Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string.",
    meta: { input_format: "Array of Strings", output_format: "String", constraints: ["1 <= strs.length <= 200", "0 <= strs[i].length <= 200"] },
    hints: ["Compare the first string with all other strings character by character."],
    inputs: [ [["flower","flow","flight"]], [["dog","racecar","car"]], [["ab", "a"]], [[""]] ],
    refFn: (strs) => {
      if (strs.length === 0) return "";
      let prefix = strs[0];
      for (let i = 1; i < strs.length; i++) {
        while (strs[i].indexOf(prefix) !== 0) {
          prefix = prefix.substring(0, prefix.length - 1);
          if (prefix === "") return "";
        }
      }
      return prefix;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, strs):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public String solve(String[] strs) {\n        return \"\";\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(vector<string> strs) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Valid Anagram", difficulty: "Easy",
    desc: "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
    meta: { input_format: "Strings `s` and `t`", output_format: "Boolean", constraints: ["1 <= s.length, t.length <= 5 * 10^4"] },
    hints: ["Count the frequency of each character in both strings and compare them."],
    inputs: [ ["anagram", "nagaram"], ["rat", "car"], ["a", "a"], ["ab", "a"] ],
    refFn: (s, t) => {
      if (s.length !== t.length) return false;
      let c = Array(26).fill(0);
      for(let i=0;i<s.length;i++) { c[s.charCodeAt(i)-97]++; c[t.charCodeAt(i)-97]--; }
      return c.every(x => x === 0);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, t):\n        pass",
      Java: "class Solution {\n    public boolean solve(String s, String t) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s, string t) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "First Unique Character in a String", difficulty: "Easy",
    desc: "Given a string `s`, find the first non-repeating character in it and return its index. If it does not exist, return -1.",
    meta: { input_format: "String `s`", output_format: "Integer", constraints: ["1 <= s.length <= 10^5"] },
    hints: ["Use a hash map or array to count character frequencies.", "Iterate through the string again to find the first character with frequency 1."],
    inputs: [ ["leetcode"], ["loveleetcode"], ["aabb"], ["z"] ],
    refFn: (s) => {
      let map = {};
      for (let c of s) map[c] = (map[c] || 0) + 1;
      for (let i = 0; i < s.length; i++) if (map[s[i]] === 1) return i;
      return -1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public int solve(String s) {\n        return -1;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string s) {\n        return -1;\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Longest Substring Without Repeating Characters", difficulty: "Medium",
    desc: "Given a string `s`, find the length of the longest substring without repeating characters.",
    meta: { input_format: "String `s`", output_format: "Integer", constraints: ["0 <= s.length <= 5 * 10^4"] },
    hints: ["Use a sliding window with two pointers.", "Use a set or map to track characters in the current window."],
    inputs: [ ["abcabcbb"], ["bbbbb"], ["pwwkew"], [""] ],
    refFn: (s) => {
      let map = new Map(), max = 0, start = 0;
      for (let i = 0; i < s.length; i++) {
        if (map.has(s[i]) && map.get(s[i]) >= start) start = map.get(s[i]) + 1;
        map.set(s[i], i);
        max = Math.max(max, i - start + 1);
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public int solve(String s) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string s) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Group Anagrams", difficulty: "Medium",
    desc: "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.",
    meta: { input_format: "Array of strings", output_format: "2D Array of strings", constraints: ["1 <= strs.length <= 10^4"] },
    hints: ["Sort each string and use it as a key in a hash map."],
    inputs: [ [["eat","tea","tan","ate","nat","bat"]], [[""]], [["a"]], [["cab","tin","pew","duh","may","ill","buy","bar","max","doc"]] ],
    refFn: (strs) => {
      let map = {};
      for (let s of strs) {
        let key = s.split('').sort().join('');
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
      // Sort output arrays for deterministic matching
      let res = Object.values(map);
      for(let a of res) a.sort();
      res.sort((a,b) => {
        if(a.length !== b.length) return a.length - b.length;
        return a[0].localeCompare(b[0]);
      });
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, strs):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<String>> solve(String[] strs) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<string>> solve(vector<string> strs) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Longest Palindromic Substring", difficulty: "Medium",
    desc: "Given a string `s`, return the longest palindromic substring in `s`.",
    meta: { input_format: "String", output_format: "String", constraints: ["1 <= s.length <= 1000"] },
    hints: ["Expand around center for each character and between characters."],
    inputs: [ ["babad"], ["cbbd"], ["a"], ["ac"] ],
    refFn: (s) => {
      if (s.length < 2) return s;
      let maxStr = "";
      for (let i = 0; i < s.length; i++) {
        let l = i, r = i;
        while (l >= 0 && r < s.length && s[l] === s[r]) {
          if (r - l + 1 > maxStr.length) maxStr = s.substring(l, r + 1);
          l--; r++;
        }
        l = i, r = i + 1;
        while (l >= 0 && r < s.length && s[l] === s[r]) {
          if (r - l + 1 > maxStr.length) maxStr = s.substring(l, r + 1);
          l--; r++;
        }
      }
      return maxStr;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public String solve(String s) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "String Compression", difficulty: "Medium",
    desc: "Given an array of characters `chars`, compress it using the following algorithm: Begin with an empty string `s`. For each group of consecutive repeating characters in `chars`, append the character followed by the group's length (if length > 1). Return the new compressed array.",
    meta: { input_format: "Array of characters", output_format: "Array of characters", constraints: ["1 <= chars.length <= 2000"] },
    hints: ["Use two pointers to track current reading and writing positions."],
    inputs: [ [["a","a","b","b","c","c","c"]], [["a"]], [["a","b","b","b","b","b","b","b","b","b","b","b","b"]], [["a","a","a","b","b","a","a"]] ],
    refFn: (chars) => {
      let res = [];
      let count = 0;
      for (let i = 0; i < chars.length; i++) {
        count++;
        if (i + 1 === chars.length || chars[i] !== chars[i+1]) {
          res.push(chars[i]);
          if (count > 1) {
            let str = count.toString();
            for(let c of str) res.push(c);
          }
          count = 0;
        }
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, chars):\n        pass",
      Java: "class Solution {\n    public char[] solve(char[] chars) {\n        return new char[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<char> solve(vector<char> chars) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Decode String", difficulty: "Medium",
    desc: "Given an encoded string, return its decoded string. The encoding rule is: k[encoded_string], where the encoded_string inside the square brackets is being repeated exactly k times. You may assume that the input string is always valid.",
    meta: { input_format: "String", output_format: "String", constraints: ["1 <= s.length <= 30"] },
    hints: ["Use a stack to keep track of the strings and repeat counts."],
    inputs: [ ["3[a]2[bc]"], ["3[a2[c]]"], ["2[abc]3[cd]ef"], ["10[a]"] ],
    refFn: (s) => {
      let countStack = [], strStack = [], curStr = "", curNum = 0;
      for (let c of s) {
        if (!isNaN(c)) curNum = curNum * 10 + parseInt(c);
        else if (c === '[') {
          countStack.push(curNum); strStack.push(curStr);
          curStr = ""; curNum = 0;
        } else if (c === ']') {
          let num = countStack.pop();
          let prevStr = strStack.pop();
          curStr = prevStr + curStr.repeat(num);
        } else {
          curStr += c;
        }
      }
      return curStr;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s):\n        pass",
      Java: "class Solution {\n    public String solve(String s) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Minimum Window Substring", difficulty: "Hard",
    desc: "Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return the empty string.",
    meta: { input_format: "Strings `s` and `t`", output_format: "String", constraints: ["1 <= m, n <= 10^5"] },
    hints: ["Use two pointers (sliding window) to find a valid window.", "Use a hash map to keep track of character frequencies."],
    inputs: [ ["ADOBECODEBANC", "ABC"], ["a", "a"], ["a", "aa"], ["ab", "b"] ],
    refFn: (s, t) => {
      let map = {};
      for (let c of t) map[c] = (map[c] || 0) + 1;
      let count = Object.keys(map).length, l = 0, r = 0, minL = 0, minR = 0, min = Infinity;
      while (r < s.length) {
        let char = s[r];
        if (map[char] !== undefined) {
          map[char]--;
          if (map[char] === 0) count--;
        }
        r++;
        while (count === 0) {
          if (r - l < min) { min = r - l; minL = l; minR = r; }
          let leftChar = s[l];
          if (map[leftChar] !== undefined) {
            map[leftChar]++;
            if (map[leftChar] > 0) count++;
          }
          l++;
        }
      }
      return min === Infinity ? "" : s.substring(minL, minR);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, t):\n        pass",
      Java: "class Solution {\n    public String solve(String s, String t) {\n        return \"\";\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string solve(string s, string t) {\n        return \"\";\n    }\n}"
    }
  },
  {
    topic: "Strings", title: "Edit Distance", difficulty: "Hard",
    desc: "Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`. You have the following 3 operations permitted on a word: Insert a character, Delete a character, Replace a character.",
    meta: { input_format: "Strings `word1` and `word2`", output_format: "Integer", constraints: ["0 <= word1.length, word2.length <= 500"] },
    hints: ["Use Dynamic Programming.", "dp[i][j] represents the minimum operations to convert word1[0..i) to word2[0..j)."],
    inputs: [ ["horse", "ros"], ["intention", "execution"], ["", "a"], ["abc", "abc"] ],
    refFn: (word1, word2) => {
      let dp = Array(word1.length + 1).fill().map(() => Array(word2.length + 1).fill(0));
      for (let i = 0; i <= word1.length; i++) dp[i][0] = i;
      for (let j = 0; j <= word2.length; j++) dp[0][j] = j;
      for (let i = 1; i <= word1.length; i++) {
        for (let j = 1; j <= word2.length; j++) {
          if (word1[i-1] === word2[j-1]) dp[i][j] = dp[i-1][j-1];
          else dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
      }
      return dp[word1.length][word2.length];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, word1, word2):\n        pass",
      Java: "class Solution {\n    public int solve(String word1, String word2) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string word1, string word2) {\n        return 0;\n    }\n}"
    }
  },

  // --- HASH TABLES (10) ---
  {
    topic: "Hash Table", title: "Contains Duplicate", difficulty: "Easy",
    desc: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    meta: { input_format: "Array of integers", output_format: "Boolean", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Use a Set to keep track of seen elements."],
    inputs: [ [[1,2,3,1]], [[1,2,3,4]], [[1,1,1,3,3,4,3,2,4,2]], [[0]] ],
    refFn: (nums) => new Set(nums).size !== nums.length,
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public boolean solve(int[] nums) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> nums) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Intersection of Two Arrays", difficulty: "Easy",
    desc: "Given two integer arrays `nums1` and `nums2`, return an array of their intersection. Each element in the result must be unique and you may return the result in any order.",
    meta: { input_format: "Two arrays of integers", output_format: "Array of integers", constraints: ["1 <= nums1.length, nums2.length <= 1000"] },
    hints: ["Use a Set for the first array, then iterate through the second array checking for existence."],
    inputs: [ [[1,2,2,1], [2,2]], [[4,9,5], [9,4,9,8,4]], [[1], [2]], [[0], [0]] ],
    refFn: (n1, n2) => {
      let set1 = new Set(n1), res = new Set();
      for (let n of n2) if (set1.has(n)) res.add(n);
      return Array.from(res).sort((a,b)=>a-b);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums1, nums2):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums1, int[] nums2) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums1, vector<int> nums2) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Word Pattern", difficulty: "Easy",
    desc: "Given a `pattern` and a string `s`, find if `s` follows the same pattern. Here follow means a full match, such that there is a bijection between a letter in `pattern` and a non-empty word in `s`.",
    meta: { input_format: "Strings `pattern` and `s`", output_format: "Boolean", constraints: ["1 <= pattern.length <= 300"] },
    hints: ["Use two hash maps to establish the bijection."],
    inputs: [ ["abba", "dog cat cat dog"], ["abba", "dog cat cat fish"], ["aaaa", "dog cat cat dog"], ["abba", "dog dog dog dog"] ],
    refFn: (p, s) => {
      let w = s.split(' ');
      if (p.length !== w.length) return false;
      let p2w = {}, w2p = {};
      for (let i = 0; i < p.length; i++) {
        let char = p[i], word = w[i];
        if ((p2w[char] && p2w[char] !== word) || (w2p[word] && w2p[word] !== char)) return false;
        p2w[char] = word; w2p[word] = char;
      }
      return true;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, pattern, s):\n        pass",
      Java: "class Solution {\n    public boolean solve(String pattern, String s) {\n        return false;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string pattern, string s) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Top K Frequent Elements", difficulty: "Medium",
    desc: "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Array of integers", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Use a hash map to count frequencies.", "Sort the elements by frequency or use a Priority Queue/Bucket Sort."],
    inputs: [ [[1,1,1,2,2,3], 2], [[1], 1], [[4,4,4,4,5,5,5,6,6,7], 3], [[1,2], 2] ],
    refFn: (nums, k) => {
      let map = {};
      for (let n of nums) map[n] = (map[n] || 0) + 1;
      let sorted = Object.keys(map).sort((a,b) => map[b] - map[a]);
      return sorted.slice(0, k).map(Number).sort((a,b)=>a-b);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums, k):\n        pass",
      Java: "class Solution {\n    public int[] solve(int[] nums, int k) {\n        return new int[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> nums, int k) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Longest Consecutive Sequence", difficulty: "Medium",
    desc: "Given an unsorted array of integers `nums`, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["0 <= nums.length <= 10^5"] },
    hints: ["Put all elements into a Set.", "For each element, check if it's the start of a sequence (i.e., num - 1 is not in Set)."],
    inputs: [ [[100,4,200,1,3,2]], [[0,3,7,2,5,8,4,6,0,1]], [[], 0], [[1,2,0,1]] ],
    refFn: (nums) => {
      if (!nums || nums.length === 0) return 0;
      let set = new Set(nums), max = 0;
      for (let n of set) {
        if (!set.has(n - 1)) {
          let curr = n, count = 1;
          while (set.has(curr + 1)) { curr++; count++; }
          max = Math.max(max, count);
        }
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Find All Anagrams in a String", difficulty: "Medium",
    desc: "Given two strings `s` and `p`, return an array of all the start indices of `p`'s anagrams in `s`. You may return the answer in any order.",
    meta: { input_format: "Strings `s` and `p`", output_format: "Array of integers", constraints: ["1 <= s.length, p.length <= 3 * 10^4"] },
    hints: ["Use a sliding window of length p.length.", "Compare character frequency maps in O(1) time."],
    inputs: [ ["cbaebabacd", "abc"], ["abab", "ab"], ["a", "a"], ["a", "b"] ],
    refFn: (s, p) => {
      let res = [];
      if (s.length < p.length) return res;
      let pMap = Array(26).fill(0), sMap = Array(26).fill(0);
      for (let i = 0; i < p.length; i++) {
        pMap[p.charCodeAt(i) - 97]++;
        sMap[s.charCodeAt(i) - 97]++;
      }
      if (pMap.join('') === sMap.join('')) res.push(0);
      for (let i = p.length; i < s.length; i++) {
        sMap[s.charCodeAt(i) - 97]++;
        sMap[s.charCodeAt(i - p.length) - 97]--;
        if (pMap.join('') === sMap.join('')) res.push(i - p.length + 1);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, p):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<Integer> solve(String s, String p) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(string s, string p) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "Subarray Sums Divisible by K", difficulty: "Medium",
    desc: "Given an integer array `nums` and an integer `k`, return the number of non-empty subarrays that have a sum divisible by `k`.",
    meta: { input_format: "Array of integers `nums`, Integer `k`", output_format: "Integer", constraints: ["1 <= nums.length <= 3 * 10^4"] },
    hints: ["Use a hash map to store the frequencies of prefix sum remainders.", "Be careful with negative remainders (add k and mod k again)."],
    inputs: [ [[4,5,0,-2,-3,1], 5], [[5], 9], [[-1,2,9], 2], [[2,-2,2,-4], 6] ],
    refFn: (nums, k) => {
      let count = 0, sum = 0;
      let map = new Map();
      map.set(0, 1);
      for (let n of nums) {
        sum += n;
        let rem = sum % k;
        if (rem < 0) rem += k;
        if (map.has(rem)) count += map.get(rem);
        map.set(rem, (map.get(rem) || 0) + 1);
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
    topic: "Hash Table", title: "Valid Sudoku", difficulty: "Medium",
    desc: "Determine if a 9x9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules: 1. Each row must contain digits 1-9 without repetition. 2. Each column must contain digits 1-9 without repetition. 3. Each of the nine 3x3 sub-boxes of the grid must contain digits 1-9 without repetition.",
    meta: { input_format: "9x9 Array of strings", output_format: "Boolean", constraints: ["board.length == 9", "board[i].length == 9"] },
    hints: ["Use an array of Sets for rows, columns, and 3x3 boxes."],
    inputs: [
      [[["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]],
      [[["8","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]]
    ],
    refFn: (board) => {
      let rows = Array(9).fill().map(()=>new Set());
      let cols = Array(9).fill().map(()=>new Set());
      let boxes = Array(9).fill().map(()=>new Set());
      for (let r=0; r<9; r++) {
        for (let c=0; c<9; c++) {
          let val = board[r][c];
          if (val === '.') continue;
          let boxId = Math.floor(r/3)*3 + Math.floor(c/3);
          if (rows[r].has(val) || cols[c].has(val) || boxes[boxId].has(val)) return false;
          rows[r].add(val); cols[c].add(val); boxes[boxId].add(val);
        }
      }
      return true;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, board):\n        pass",
      Java: "class Solution {\n    public boolean solve(String[][] board) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<vector<string>> board) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Hash Table", title: "First Missing Positive", difficulty: "Hard",
    desc: "Given an unsorted integer array `nums`, return the smallest missing positive integer. You must implement an algorithm that runs in O(n) time and uses O(1) auxiliary space.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 10^5"] },
    hints: ["Place each positive integer i at index i-1.", "Iterate through the array again to find the first index that doesn't have the correct number."],
    inputs: [ [[1,2,0]], [[3,4,-1,1]], [[7,8,9,11,12]], [[1,2,3]] ],
    refFn: (nums) => {
      let i = 0;
      while (i < nums.length) {
        if (nums[i] > 0 && nums[i] <= nums.length && nums[nums[i]-1] !== nums[i]) {
          let temp = nums[nums[i]-1];
          nums[nums[i]-1] = nums[i];
          nums[i] = temp;
        } else { i++; }
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
  {
    topic: "Hash Table", title: "Palindrome Pairs", difficulty: "Hard",
    desc: "Given a list of unique words, return all the pairs of the distinct indices `(i, j)` in the given list, so that the concatenation of the two words `words[i] + words[j]` is a palindrome.",
    meta: { input_format: "Array of strings", output_format: "2D Array of integers", constraints: ["1 <= words.length <= 5000", "0 <= words[i].length <= 300"] },
    hints: ["Use a hash map to store the reverse of each word and its index."],
    inputs: [ [["abcd","dcba","lls","s","sssll"]], [["bat","tab","cat"]], [["a",""]], [["a","b","c","ab","ac","aa"]] ],
    refFn: (words) => {
      const isPal = (str) => { let l=0, r=str.length-1; while(l<r) { if(str[l++]!==str[r--]) return false; } return true; };
      let res = [];
      for(let i=0; i<words.length; i++) {
        for(let j=0; j<words.length; j++) {
          if (i !== j && isPal(words[i] + words[j])) res.push([i, j]);
        }
      }
      // sort logically to make it deterministic
      res.sort((a,b) => a[0]===b[0] ? a[1]-b[1] : a[0]-b[0]);
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, words):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public int[][] solve(String[] words) {\n        return new int[][]{};\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<string> words) {\n        return {};\n    }\n}"
    }
  }
];

// Helper to format 25 problems properly
const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b2-${idCounter++}`,
    topic: raw.topic, title: raw.title, difficulty: raw.difficulty, description: raw.desc,
    input_format: raw.meta.input_format, output_format: raw.meta.output_format,
    constraints: raw.meta.constraints, hints: raw.hints, test_cases: [],
    metadata: { isClass: true, className: "Solution", methodName: "solve" },
    starter_code: raw.starter
  };
  
  // Create 4 test cases per problem based on inputs
  for (let i = 0; i < raw.inputs.length; i++) {
    const args = raw.inputs[i];
    const rawExpected = raw.refFn(...args);
    let expStr = JSON.stringify(rawExpected);
    let inpStr = args.length === 1 ? JSON.stringify(args[0]) : JSON.stringify(args);
    
    p.test_cases.push({
      input: inpStr,
      expected_output: expStr,
      is_hidden: i >= 2 // First 2 are public, rest hidden
    });
  }
  outProblems.push(p);
}


async function seedBatch2() {
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
          pid = ep.id; // Use existing ID if identical
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
  
  const stats = await db.query('SELECT topic, difficulty, COUNT(*) FROM coding_problems GROUP BY topic, difficulty');
  console.log("Current Distribution:", stats.rows);
  
  process.exit(0);
}

seedBatch2();
