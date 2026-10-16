import fs from 'fs';
import db from '../db.js';

let idCounter = 1;

// Helper to build a Tree from LeetCode-style array for reference calculations
const buildTreeStr = `
const buildTree = (arr) => {
  if (!arr || !arr.length || arr[0] === null) return null;
  let root = { val: arr[0], left: null, right: null };
  let queue = [root];
  let i = 1;
  while (i < arr.length) {
    let node = queue.shift();
    if (arr[i] !== null && arr[i] !== undefined) {
      node.left = { val: arr[i], left: null, right: null };
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      node.right = { val: arr[i], left: null, right: null };
      queue.push(node.right);
    }
    i++;
  }
  return root;
};
`;

const rawProblems = [
  // --- TREES / BST (10) ---
  {
    topic: "Trees", title: "Maximum Depth of Binary Tree", difficulty: "Easy",
    desc: "Given the `root` of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    meta: { input_format: "Array of integers/nulls `root`", output_format: "Integer", constraints: ["0 <= nodes <= 10^4"] },
    hints: ["Use recursion (DFS) or level-order traversal (BFS)."],
    inputs: [ [[3,9,20,null,null,15,7]], [[1,null,2]], [[],], [[1]] ],
    refFn: (arr) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let root = { val: a[0], left: null, right: null };
        let q = [root];
        let i = 1;
        while (i < a.length) {
          let node = q.shift();
          if (a[i] !== null && a[i] !== undefined) { node.left = { val: a[i] }; q.push(node.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { node.right = { val: a[i] }; q.push(node.right); }
          i++;
        }
        return root;
      };
      const root = buildTree(arr);
      const dfs = (node) => node ? 1 + Math.max(dfs(node.left), dfs(node.right)) : 0;
      return dfs(root);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root):\n        pass",
      Java: "class Solution {\n    public int solve(Integer[] root) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> root) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Invert Binary Tree", difficulty: "Easy",
    desc: "Given the `root` of a binary tree, invert the tree, and return its root. (Note: output the inverted tree as a level-order array).",
    meta: { input_format: "Array of integers/nulls `root`", output_format: "Array of integers/nulls", constraints: ["0 <= nodes <= 100"] },
    hints: ["Recursively swap left and right children for every node."],
    inputs: [ [[4,2,7,1,3,6,9]], [[2,1,3]], [[],], [[1,2]] ],
    refFn: (arr) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let root = { val: a[0], left: null, right: null };
        let q = [root]; let i = 1;
        while (i < a.length) {
          let n = q.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; q.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; q.push(n.right); }
          i++;
        }
        return root;
      };
      const root = buildTree(arr);
      const invert = (node) => {
        if (!node) return null;
        let temp = node.left; node.left = node.right; node.right = temp;
        invert(node.left); invert(node.right);
        return node;
      };
      invert(root);
      if(!root) return [];
      let res = [], q = [root];
      while(q.length) {
        let n = q.shift();
        if(n) { res.push(n.val); q.push(n.left); q.push(n.right); }
        else { res.push(null); }
      }
      while(res.length && res[res.length-1]===null) res.pop();
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root):\n        pass",
      Java: "class Solution {\n    public Integer[] solve(Integer[] root) {\n        return new Integer[]{};\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> solve(vector<int> root) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Same Tree", difficulty: "Easy",
    desc: "Given the roots of two binary trees `p` and `q`, write a function to check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.",
    meta: { input_format: "Two Arrays of integers/nulls `p` and `q`", output_format: "Boolean", constraints: ["0 <= nodes <= 100"] },
    hints: ["Use DFS. If both nodes are null, true. If one is null or values differ, false."],
    inputs: [ [[1,2,3], [1,2,3]], [[1,2], [1,null,2]], [[1,2,1], [1,1,2]], [[], []] ],
    refFn: (p, q) => {
      if(p.length !== q.length) return false;
      for(let i=0; i<p.length; i++) if(p[i]!==q[i]) return false;
      return true; // Simplified since array serialization uniquely identifies them
    },
    starter: {
      Python: "class Solution:\n    def solve(self, p, q):\n        pass",
      Java: "class Solution {\n    public boolean solve(Integer[] p, Integer[] q) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> p, vector<int> q) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Symmetric Tree", difficulty: "Easy",
    desc: "Given the `root` of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).",
    meta: { input_format: "Array of integers/nulls `root`", output_format: "Boolean", constraints: ["1 <= nodes <= 1000"] },
    hints: ["Write a helper function that takes two nodes and checks if their values are equal and their children are mirrors."],
    inputs: [ [[1,2,2,3,4,4,3]], [[1,2,2,null,3,null,3]], [[1]], [[1,2,3]] ],
    refFn: (arr) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let r = { val: a[0], left: null, right: null };
        let q = [r]; let i = 1;
        while (i < a.length) {
          let n = q.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; q.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; q.push(n.right); }
          i++;
        }
        return r;
      };
      const root = buildTree(arr);
      const isMirror = (t1, t2) => {
        if(!t1 && !t2) return true;
        if(!t1 || !t2) return false;
        return (t1.val===t2.val) && isMirror(t1.right, t2.left) && isMirror(t1.left, t2.right);
      };
      return isMirror(root, root);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root):\n        pass",
      Java: "class Solution {\n    public boolean solve(Integer[] root) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> root) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Diameter of Binary Tree", difficulty: "Easy",
    desc: "Given the `root` of a binary tree, return the length of the diameter of the tree. The diameter is the length of the longest path between any two nodes in a tree.",
    meta: { input_format: "Array of integers/nulls `root`", output_format: "Integer", constraints: ["1 <= nodes <= 10^4"] },
    hints: ["The diameter passing through a node is left_depth + right_depth.", "Use DFS to return depth, and update max diameter globally."],
    inputs: [ [[1,2,3,4,5]], [[1,2]], [[1]], [[1,2,3,4,5,6,7]] ],
    refFn: (arr) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let r = { val: a[0], left: null, right: null };
        let q = [r]; let i = 1;
        while (i < a.length) {
          let n = q.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; q.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; q.push(n.right); }
          i++;
        }
        return r;
      };
      const root = buildTree(arr);
      let max = 0;
      const dfs = (n) => {
        if(!n) return 0;
        let l = dfs(n.left), r = dfs(n.right);
        max = Math.max(max, l+r);
        return 1 + Math.max(l, r);
      };
      dfs(root);
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root):\n        pass",
      Java: "class Solution {\n    public int solve(Integer[] root) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> root) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Binary Tree Level Order Traversal", difficulty: "Medium",
    desc: "Given the `root` of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    meta: { input_format: "Array of integers/nulls `root`", output_format: "2D Array of integers", constraints: ["0 <= nodes <= 2000"] },
    hints: ["Use a queue to process nodes level by level.", "Count the number of nodes at the current level before processing."],
    inputs: [ [[3,9,20,null,null,15,7]], [[1]], [[],], [[1,2,3,4,null,null,5]] ],
    refFn: (arr) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let r = { val: a[0], left: null, right: null };
        let q = [r]; let i = 1;
        while (i < a.length) {
          let n = q.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; q.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; q.push(n.right); }
          i++;
        }
        return r;
      };
      const root = buildTree(arr);
      if(!root) return [];
      let res = [], q = [root];
      while(q.length) {
        let len = q.length, lvl = [];
        for(let i=0; i<len; i++) {
          let n = q.shift();
          lvl.push(n.val);
          if(n.left) q.push(n.left);
          if(n.right) q.push(n.right);
        }
        res.push(lvl);
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(Integer[] root) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<int> root) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Lowest Common Ancestor of a Binary Search Tree", difficulty: "Medium",
    desc: "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.",
    meta: { input_format: "Array of integers `root`, Integer `p`, Integer `q`", output_format: "Integer", constraints: ["2 <= nodes <= 10^5", "p and q exist in the BST."] },
    hints: ["Exploit the BST property: if both p and q are smaller than root, LCA is in left subtree."],
    inputs: [ [[6,2,8,0,4,7,9,null,null,3,5], 2, 8], [[6,2,8,0,4,7,9,null,null,3,5], 2, 4], [[2,1], 2, 1], [[10,5,15,3,7,null,18], 3, 18] ],
    refFn: (arr, p, q) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let r = { val: a[0], left: null, right: null };
        let qu = [r]; let i = 1;
        while (i < a.length) {
          let n = qu.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; qu.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; qu.push(n.right); }
          i++;
        }
        return r;
      };
      const root = buildTree(arr);
      let curr = root;
      while(curr) {
        if(p < curr.val && q < curr.val) curr = curr.left;
        else if(p > curr.val && q > curr.val) curr = curr.right;
        else return curr.val;
      }
      return null;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root, p, q):\n        pass",
      Java: "class Solution {\n    public int solve(Integer[] root, int p, int q) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> root, int p, int q) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Validate Binary Search Tree", difficulty: "Medium",
    desc: "Given the `root` of a binary tree, determine if it is a valid binary search tree (BST). A valid BST has left child < node < right child for all subtrees.",
    meta: { input_format: "Array of integers/nulls `root`", output_format: "Boolean", constraints: ["1 <= nodes <= 10^4"] },
    hints: ["Use an in-order traversal and check if values are strictly increasing.", "Or use recursive ranges (min, max)."],
    inputs: [ [[2,1,3]], [[5,1,4,null,null,3,6]], [[2,2,2]], [[10,5,15,null,null,6,20]] ],
    refFn: (arr) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let r = { val: a[0], left: null, right: null };
        let qu = [r]; let i = 1;
        while (i < a.length) {
          let n = qu.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; qu.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; qu.push(n.right); }
          i++;
        }
        return r;
      };
      const root = buildTree(arr);
      const validate = (n, low, high) => {
        if(!n) return true;
        if(n.val <= low || n.val >= high) return false;
        return validate(n.left, low, n.val) && validate(n.right, n.val, high);
      };
      return validate(root, -Infinity, Infinity);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root):\n        pass",
      Java: "class Solution {\n    public boolean solve(Integer[] root) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(vector<int> root) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Kth Smallest Element in a BST", difficulty: "Medium",
    desc: "Given the `root` of a binary search tree, and an integer `k`, return the `kth` smallest value (1-indexed) of all the values of the nodes in the tree.",
    meta: { input_format: "Array of integers `root`, Integer `k`", output_format: "Integer", constraints: ["1 <= k <= n <= 10^4"] },
    hints: ["In-order traversal of a BST yields values in sorted order."],
    inputs: [ [[3,1,4,null,2], 1], [[5,3,6,2,4,null,null,1], 3], [[1], 1], [[2,1,3], 2] ],
    refFn: (arr, k) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let r = { val: a[0], left: null, right: null };
        let qu = [r]; let i = 1;
        while (i < a.length) {
          let n = qu.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; qu.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; qu.push(n.right); }
          i++;
        }
        return r;
      };
      const root = buildTree(arr);
      let res = [];
      const inOrder = (n) => {
        if(!n || res.length>=k) return;
        inOrder(n.left);
        res.push(n.val);
        inOrder(n.right);
      };
      inOrder(root);
      return res[k-1];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root, k):\n        pass",
      Java: "class Solution {\n    public int solve(Integer[] root, int k) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> root, int k) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Trees", title: "Binary Tree Maximum Path Sum", difficulty: "Hard",
    desc: "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge connecting them. Given the `root` of a binary tree, return the maximum path sum of any non-empty path.",
    meta: { input_format: "Array of integers/nulls `root`", output_format: "Integer", constraints: ["1 <= nodes <= 3 * 10^4"] },
    hints: ["Use DFS. For each node, compute the max path sum extending to its left and right.", "Update a global max with left + right + node.val."],
    inputs: [ [[1,2,3]], [[-10,9,20,null,null,15,7]], [[-3]], [[2,-1]] ],
    refFn: (arr) => {
      const buildTree = (a) => {
        if (!a || !a.length || a[0] === null) return null;
        let r = { val: a[0], left: null, right: null };
        let qu = [r]; let i = 1;
        while (i < a.length) {
          let n = qu.shift();
          if (a[i] !== null && a[i] !== undefined) { n.left = { val: a[i] }; qu.push(n.left); }
          i++;
          if (i < a.length && a[i] !== null && a[i] !== undefined) { n.right = { val: a[i] }; qu.push(n.right); }
          i++;
        }
        return r;
      };
      const root = buildTree(arr);
      let max = -Infinity;
      const dfs = (n) => {
        if(!n) return 0;
        let l = Math.max(0, dfs(n.left));
        let r = Math.max(0, dfs(n.right));
        max = Math.max(max, l+r+n.val);
        return n.val + Math.max(l, r);
      };
      dfs(root);
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, root):\n        pass",
      Java: "class Solution {\n    public int solve(Integer[] root) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> root) {\n        return 0;\n    }\n}"
    }
  },

  // --- GRAPHS (7) ---
  {
    topic: "Graphs", title: "Number of Islands", difficulty: "Medium",
    desc: "Given an `m x n` 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    meta: { input_format: "2D Array of strings", output_format: "Integer", constraints: ["1 <= m, n <= 300"] },
    hints: ["Iterate through the grid. When a '1' is found, increment count and run DFS/BFS to mark the entire island as visited (e.g. '0')."],
    inputs: [ [[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]], [[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]], [[["1"]]], [[["0"]]] ],
    refFn: (grid) => {
      let g = grid.map(row => [...row]);
      let count = 0;
      const dfs = (r, c) => {
        if(r<0 || c<0 || r>=g.length || c>=g[0].length || g[r][c]==='0') return;
        g[r][c] = '0';
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
      };
      for(let r=0; r<g.length; r++) {
        for(let c=0; c<g[0].length; c++) {
          if(g[r][c]==='1') { count++; dfs(r,c); }
        }
      }
      return count;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(char[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<char>> grid) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Max Area of Island", difficulty: "Medium",
    desc: "You are given an `m x n` binary matrix `grid`. An island is a group of 1's connected 4-directionally. Return the maximum area of an island in `grid`. If there is no island, return 0.",
    meta: { input_format: "2D Array of integers", output_format: "Integer", constraints: ["1 <= m, n <= 50"] },
    hints: ["Use DFS to count the size of each island.", "Update a global max variable."],
    inputs: [ [[[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]]], [[[0,0,0,0,0,0,0,0]]], [[[1]]], [[[1,1],[1,0]]] ],
    refFn: (grid) => {
      let g = grid.map(row => [...row]);
      let max = 0;
      const dfs = (r, c) => {
        if(r<0 || c<0 || r>=g.length || c>=g[0].length || g[r][c]===0) return 0;
        g[r][c] = 0;
        return 1 + dfs(r+1,c) + dfs(r-1,c) + dfs(r,c+1) + dfs(r,c-1);
      };
      for(let r=0; r<g.length; r++) {
        for(let c=0; c<g[0].length; c++) {
          if(g[r][c]===1) max = Math.max(max, dfs(r,c));
        }
      }
      return max;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> grid) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Rotting Oranges", difficulty: "Medium",
    desc: "You are given an `m x n` `grid` where each cell can have one of three values: 0 representing an empty cell, 1 representing a fresh orange, or 2 representing a rotten orange. Every minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return -1.",
    meta: { input_format: "2D Array of integers", output_format: "Integer", constraints: ["1 <= m, n <= 10"] },
    hints: ["Use multi-source BFS.", "Push all initially rotten oranges to a queue and spread the rot minute by minute."],
    inputs: [ [[[2,1,1],[1,1,0],[0,1,1]]], [[[2,1,1],[0,1,1],[1,0,1]]], [[[0,2]]], [[[2,2],[1,1]]] ],
    refFn: (grid) => {
      let g = grid.map(row => [...row]);
      let q = [], fresh = 0, mins = 0;
      for(let r=0; r<g.length; r++) {
        for(let c=0; c<g[0].length; c++) {
          if(g[r][c]===2) q.push([r,c]);
          else if(g[r][c]===1) fresh++;
        }
      }
      let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      while(q.length && fresh > 0) {
        let len = q.length;
        for(let i=0; i<len; i++) {
          let [r, c] = q.shift();
          for(let [dr, dc] of dirs) {
            let nr = r+dr, nc = c+dc;
            if(nr>=0 && nc>=0 && nr<g.length && nc<g[0].length && g[nr][nc]===1) {
              g[nr][nc] = 2; fresh--;
              q.push([nr,nc]);
            }
          }
        }
        mins++;
      }
      return fresh === 0 ? mins : -1;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, grid):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] grid) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> grid) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Course Schedule", difficulty: "Medium",
    desc: "There are a total of `numCourses` courses you have to take, labeled from 0 to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first if you want to take course `a`. Return `true` if you can finish all courses. Otherwise, return `false`.",
    meta: { input_format: "Integer `numCourses`, 2D Array of integers `prerequisites`", output_format: "Boolean", constraints: ["1 <= numCourses <= 2000"] },
    hints: ["This is a cycle detection problem in a directed graph.", "Use Kahn's algorithm (indegree) or DFS with a visited and visiting set."],
    inputs: [ [2, [[1,0]]], [2, [[1,0],[0,1]]], [3, [[1,0],[2,1]]], [4, [[1,0],[2,1],[3,2],[1,3]]] ],
    refFn: (n, prereqs) => {
      let adj = Array(n).fill().map(()=>[]);
      let indeg = Array(n).fill(0);
      for(let [a,b] of prereqs) { adj[b].push(a); indeg[a]++; }
      let q = [];
      for(let i=0; i<n; i++) if(indeg[i]===0) q.push(i);
      let count = 0;
      while(q.length) {
        let node = q.shift();
        count++;
        for(let nei of adj[node]) {
          indeg[nei]--;
          if(indeg[nei]===0) q.push(nei);
        }
      }
      return count === n;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, numCourses, prerequisites):\n        pass",
      Java: "class Solution {\n    public boolean solve(int numCourses, int[][] prerequisites) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(int numCourses, vector<vector<int>> prerequisites) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Pacific Atlantic Water Flow", difficulty: "Medium",
    desc: "There is an `m x n` rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific Ocean touches the island's left and top edges, and the Atlantic touches the right and bottom edges. Given `heights` matrix, water can flow 4-directionally to a neighboring cell with an equal or lower height. Return a 2D array of grid coordinates where water can flow to both oceans.",
    meta: { input_format: "2D Array of integers `heights`", output_format: "2D Array of integers", constraints: ["1 <= m, n <= 200"] },
    hints: ["Work backwards. Start DFS/BFS from the Pacific edge and the Atlantic edge separately.", "Find cells that are reachable from both sets."],
    inputs: [ [[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]], [[[1]]], [[[2,1],[1,2]]], [[[10,10,10],[10,1,10],[10,10,10]]] ],
    refFn: (h) => {
      let m=h.length, n=h[0].length;
      let pac = Array(m).fill().map(()=>Array(n).fill(false));
      let atl = Array(m).fill().map(()=>Array(n).fill(false));
      let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const dfs = (r, c, set, prev) => {
        if(r<0||c<0||r>=m||c>=n||set[r][c]||h[r][c]<prev) return;
        set[r][c] = true;
        for(let [dr,dc] of dirs) dfs(r+dr, c+dc, set, h[r][c]);
      };
      for(let i=0; i<m; i++) { dfs(i, 0, pac, h[i][0]); dfs(i, n-1, atl, h[i][n-1]); }
      for(let j=0; j<n; j++) { dfs(0, j, pac, h[0][j]); dfs(m-1, j, atl, h[m-1][j]); }
      let res = [];
      for(let i=0; i<m; i++) {
        for(let j=0; j<n; j++) {
          if(pac[i][j] && atl[i][j]) res.push([i,j]);
        }
      }
      return res;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, heights):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public List<List<Integer>> solve(int[][] heights) {\n        return new ArrayList<>();\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> solve(vector<vector<int>> heights) {\n        return {};\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Word Ladder", difficulty: "Hard",
    desc: "A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words such that every adjacent pair of words differs by a single letter. Return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, or 0 if no such sequence exists.",
    meta: { input_format: "String `beginWord`, String `endWord`, Array of strings `wordList`", output_format: "Integer", constraints: ["1 <= word length <= 10", "All words have same length."] },
    hints: ["Treat each word as a node in an undirected graph.", "Use BFS to find the shortest path."],
    inputs: [ ["hit", "cog", ["hot","dot","dog","lot","log","cog"]], ["hit", "cog", ["hot","dot","dog","lot","log"]], ["a", "c", ["a", "b", "c"]], ["hot", "dog", ["hot","dog"]] ],
    refFn: (begin, end, wordList) => {
      let set = new Set(wordList);
      if(!set.has(end)) return 0;
      let q = [[begin, 1]];
      while(q.length) {
        let [w, steps] = q.shift();
        if(w===end) return steps;
        for(let i=0; i<w.length; i++) {
          for(let c=97; c<=122; c++) {
            let nextW = w.substring(0,i) + String.fromCharCode(c) + w.substring(i+1);
            if(set.has(nextW)) { set.delete(nextW); q.push([nextW, steps+1]); }
          }
        }
      }
      return 0;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, beginWord, endWord, wordList):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public int solve(String beginWord, String endWord, List<String> wordList) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string beginWord, string endWord, vector<string> wordList) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Graphs", title: "Longest Increasing Path in a Matrix", difficulty: "Hard",
    desc: "Given an `m x n` integers `matrix`, return the length of the longest increasing path in `matrix`. From each cell, you can either move in four directions. You may not move diagonally or move outside the boundary.",
    meta: { input_format: "2D Array of integers", output_format: "Integer", constraints: ["1 <= m, n <= 200"] },
    hints: ["Use DFS with memoization to avoid recomputing the longest path from the same cell."],
    inputs: [ [[[9,9,4],[6,6,8],[2,1,1]]], [[[3,4,5],[3,2,6],[2,2,1]]], [[[1]]], [[[1,2],[3,4]]] ],
    refFn: (matrix) => {
      let m=matrix.length, n=matrix[0].length;
      let memo = Array(m).fill().map(()=>Array(n).fill(0));
      let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      let maxLen = 0;
      const dfs = (r, c) => {
        if(memo[r][c]!==0) return memo[r][c];
        let max = 1;
        for(let [dr,dc] of dirs) {
          let nr=r+dr, nc=c+dc;
          if(nr>=0 && nc>=0 && nr<m && nc<n && matrix[nr][nc]>matrix[r][c]) {
            max = Math.max(max, 1 + dfs(nr,nc));
          }
        }
        memo[r][c] = max;
        return max;
      };
      for(let i=0; i<m; i++) {
        for(let j=0; j<n; j++) maxLen = Math.max(maxLen, dfs(i,j));
      }
      return maxLen;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, matrix):\n        pass",
      Java: "class Solution {\n    public int solve(int[][] matrix) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<vector<int>> matrix) {\n        return 0;\n    }\n}"
    }
  },

  // --- DYNAMIC PROGRAMMING (8) ---
  {
    topic: "Dynamic Programming", title: "Climbing Stairs", difficulty: "Easy",
    desc: "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    meta: { input_format: "Integer `n`", output_format: "Integer", constraints: ["1 <= n <= 45"] },
    hints: ["This is exactly the Fibonacci sequence.", "Use variables to store the last two results instead of an array to save space."],
    inputs: [ [2], [3], [5], [10] ],
    refFn: (n) => {
      if(n<=2) return n;
      let a=1, b=2;
      for(let i=3; i<=n; i++) { let temp = a+b; a=b; b=temp; }
      return b;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, n):\n        pass",
      Java: "class Solution {\n    public int solve(int n) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(int n) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Min Cost Climbing Stairs", difficulty: "Easy",
    desc: "You are given an integer array `cost` where `cost[i]` is the cost of `ith` step on a staircase. Once you pay the cost, you can either climb one or two steps. You can either start from the step with index 0, or the step with index 1. Return the minimum cost to reach the top of the floor.",
    meta: { input_format: "Array of integers `cost`", output_format: "Integer", constraints: ["2 <= cost.length <= 1000"] },
    hints: ["dp[i] = cost[i] + min(dp[i-1], dp[i-2])"],
    inputs: [ [[10,15,20]], [[1,100,1,1,1,100,1,1,100,1]], [[0,0,0,0]], [[2,5]] ],
    refFn: (cost) => {
      let dp = [cost[0], cost[1]];
      for(let i=2; i<cost.length; i++) {
        dp[i] = cost[i] + Math.min(dp[i-1], dp[i-2]);
      }
      return Math.min(dp[cost.length-1], dp[cost.length-2]);
    },
    starter: {
      Python: "class Solution:\n    def solve(self, cost):\n        pass",
      Java: "class Solution {\n    public int solve(int[] cost) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> cost) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Coin Change", difficulty: "Medium",
    desc: "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If it cannot be made up, return -1.",
    meta: { input_format: "Array of integers `coins`, Integer `amount`", output_format: "Integer", constraints: ["1 <= coins.length <= 12", "0 <= amount <= 10^4"] },
    hints: ["Use an array dp of size amount + 1, initialized to Infinity.", "dp[i] = min(dp[i], 1 + dp[i - coin]) for each coin."],
    inputs: [ [[1,2,5], 11], [[2], 3], [[1], 0], [[186,419,83,408], 6249] ],
    refFn: (coins, amount) => {
      let dp = Array(amount+1).fill(Infinity);
      dp[0] = 0;
      for(let i=1; i<=amount; i++) {
        for(let c of coins) {
          if(i-c>=0) dp[i] = Math.min(dp[i], dp[i-c]+1);
        }
      }
      return dp[amount] === Infinity ? -1 : dp[amount];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, coins, amount):\n        pass",
      Java: "class Solution {\n    public int solve(int[] coins, int amount) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> coins, int amount) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Longest Increasing Subsequence", difficulty: "Medium",
    desc: "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.",
    meta: { input_format: "Array of integers", output_format: "Integer", constraints: ["1 <= nums.length <= 2500"] },
    hints: ["dp[i] is the length of the LIS ending at index i.", "To optimize to O(n log n), use a patience sorting / binary search approach with a tails array."],
    inputs: [ [[10,9,2,5,3,7,101,18]], [[0,1,0,3,2,3]], [[7,7,7,7,7,7,7]], [[1,2,3,4,5]] ],
    refFn: (nums) => {
      let tails = [];
      for(let x of nums) {
        let l=0, r=tails.length;
        while(l<r) {
          let m = l + Math.floor((r-l)/2);
          if(tails[m]<x) l=m+1; else r=m;
        }
        tails[l] = x;
      }
      return tails.length;
    },
    starter: {
      Python: "class Solution:\n    def solve(self, nums):\n        pass",
      Java: "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Longest Common Subsequence", difficulty: "Medium",
    desc: "Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return 0.",
    meta: { input_format: "Strings `text1` and `text2`", output_format: "Integer", constraints: ["1 <= text1.length, text2.length <= 1000"] },
    hints: ["Use a 2D DP array where dp[i][j] represents LCS of text1[0..i] and text2[0..j]."],
    inputs: [ ["abcde", "ace"], ["abc", "abc"], ["abc", "def"], ["bsbininm", "jmjkbkjkv"] ],
    refFn: (t1, t2) => {
      let dp = Array(t1.length+1).fill().map(()=>Array(t2.length+1).fill(0));
      for(let i=1; i<=t1.length; i++) {
        for(let j=1; j<=t2.length; j++) {
          if(t1[i-1]===t2[j-1]) dp[i][j] = 1 + dp[i-1][j-1];
          else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
      return dp[t1.length][t2.length];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, text1, text2):\n        pass",
      Java: "class Solution {\n    public int solve(String text1, String text2) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string text1, string text2) {\n        return 0;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Word Break", difficulty: "Medium",
    desc: "Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.",
    meta: { input_format: "String `s`, Array of strings `wordDict`", output_format: "Boolean", constraints: ["1 <= s.length <= 300", "1 <= wordDict.length <= 1000"] },
    hints: ["dp[i] represents if the prefix s[0..i] can be segmented.", "dp[i] is true if dp[j] is true and s[j..i] is in wordDict."],
    inputs: [ ["leetcode", ["leet","code"]], ["applepenapple", ["apple","pen"]], ["catsandog", ["cats","dog","sand","and","cat"]], ["a", ["a"]] ],
    refFn: (s, wordDict) => {
      let set = new Set(wordDict);
      let dp = Array(s.length+1).fill(false);
      dp[0] = true;
      for(let i=1; i<=s.length; i++) {
        for(let j=0; j<i; j++) {
          if(dp[j] && set.has(s.substring(j, i))) { dp[i]=true; break; }
        }
      }
      return dp[s.length];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, wordDict):\n        pass",
      Java: "import java.util.*;\nclass Solution {\n    public boolean solve(String s, List<String> wordDict) {\n        return false;\n    }\n}",
      "C++": "#include <vector>\n#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool solve(string s, vector<string> wordDict) {\n        return false;\n    }\n}"
    }
  },
  {
    topic: "Dynamic Programming", title: "Regular Expression Matching", difficulty: "Hard",
    desc: "Given an input string `s` and a pattern `p`, implement regular expression matching with support for '.' and '*' where: '.' Matches any single character. '*' Matches zero or more of the preceding element. The matching should cover the entire input string.",
    meta: { input_format: "Strings `s` and `p`", output_format: "Boolean", constraints: ["1 <= s.length <= 20", "1 <= p.length <= 20"] },
    hints: ["Use 2D DP. dp[i][j] is true if s[0..i] matches p[0..j].", "Be careful with '*' cases, it can match 0 times or multiple times."],
    inputs: [ ["aa", "a"], ["aa", "a*"], ["ab", ".*"], ["aab", "c*a*b"] ],
    refFn: (s, p) => {
      let dp = Array(s.length+1).fill().map(()=>Array(p.length+1).fill(false));
      dp[0][0] = true;
      for(let j=1; j<=p.length; j++) if(p[j-1]==='*') dp[0][j] = dp[0][j-2];
      for(let i=1; i<=s.length; i++) {
        for(let j=1; j<=p.length; j++) {
          if(p[j-1]==='.' || p[j-1]===s[i-1]) dp[i][j] = dp[i-1][j-1];
          else if(p[j-1]==='*') {
            dp[i][j] = dp[i][j-2] || (dp[i-1][j] && (s[i-1]===p[j-2] || p[j-2]==='.'));
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
    topic: "Dynamic Programming", title: "Distinct Subsequences", difficulty: "Hard",
    desc: "Given two strings `s` and `t`, return the number of distinct subsequences of `s` which equals `t`.",
    meta: { input_format: "Strings `s` and `t`", output_format: "Integer", constraints: ["1 <= s.length, t.length <= 1000"] },
    hints: ["dp[i][j] represents number of subsequences of s[0..i] matching t[0..j].", "If s[i-1] == t[j-1], dp[i][j] = dp[i-1][j-1] + dp[i-1][j]. Else dp[i][j] = dp[i-1][j]."],
    inputs: [ ["rabbbit", "rabbit"], ["babgbag", "bag"], ["a", "b"], ["a", "a"] ],
    refFn: (s, t) => {
      let dp = Array(s.length+1).fill().map(()=>Array(t.length+1).fill(0));
      for(let i=0; i<=s.length; i++) dp[i][0] = 1;
      for(let i=1; i<=s.length; i++) {
        for(let j=1; j<=t.length; j++) {
          if(s[i-1]===t[j-1]) dp[i][j] = dp[i-1][j-1] + dp[i-1][j];
          else dp[i][j] = dp[i-1][j];
        }
      }
      return dp[s.length][t.length];
    },
    starter: {
      Python: "class Solution:\n    def solve(self, s, t):\n        pass",
      Java: "class Solution {\n    public int solve(String s, String t) {\n        return 0;\n    }\n}",
      "C++": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(string s, string t) {\n        return 0;\n    }\n}"
    }
  }
];

const outProblems = [];
for (const raw of rawProblems) {
  const p = {
    id: `dsa-b5-${idCounter++}`,
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

async function seedBatch5() {
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

seedBatch5();
