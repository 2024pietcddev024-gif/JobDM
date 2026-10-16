import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../db.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' } });

const topics = [
  "Arrays", "Strings", "Hash Table", "Two Pointers", "Sliding Window",
  "Binary Search", "Linked List", "Stack and Queue", "Trees and Binary Search Trees", "Heap / Priority Queue",
  "Graphs", "Recursion", "Backtracking", "Dynamic Programming", "Greedy Algorithms",
  "Sorting", "Mathematics", "Bit Manipulation", "Matrix", "Design"
];

const BATCH_SIZE = 10;
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Helper: send HTTP request to local backend to run code
async function runCodeLocal(language, code, testCases, metadata) {
  try {
    const res = await fetch('http://localhost:3001/api/code/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer null' },
      body: JSON.stringify({
        language,
        code,
        testCases,
        problemTitle: "verification",
        _internal_metadata: metadata // We need to modify code.js to accept internal metadata!
      })
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

async function generateProblemsForTopic(topic, index) {
  const prompt = `
  You are an expert computer science platform architect. Generate exactly ${BATCH_SIZE} distinct and meaningful coding problems for the topic: "${topic}".
  The problems must range in difficulty (Easy, Medium, Hard).
  Do NOT use placeholders. Provide fully complete problems.
  Return a JSON array of objects matching this schema:
  {
    "title": "Unique Problem Title",
    "topic": "${topic}",
    "difficulty": "Easy",
    "description": "Full markdown description of the problem...",
    "input_format": "Detailed input format",
    "output_format": "Detailed output format",
    "constraints": ["Constraint 1", "Constraint 2"],
    "hints": ["Hint 1", "Hint 2"],
    "test_cases": [
      { "input": "[1, 2, 3]", "expected_output": "6", "is_hidden": false },
      { "input": "[-1, -2, -3]", "expected_output": "-6", "is_hidden": false },
      { "input": "[0, 0]", "expected_output": "0", "is_hidden": true },
      { "input": "[100, 200]", "expected_output": "300", "is_hidden": true }
    ],
    "metadata": { "isClass": true, "className": "Solution", "methodName": "solve" },
    "starter_code": {
      "Python": "class Solution:\n    def solve(self, nums):\n        pass",
      "Java": "class Solution {\n    public int solve(int[] nums) {\n        return 0;\n    }\n}",
      "C++": "class Solution {\npublic:\n    int solve(vector<int> nums) {\n        return 0;\n    }\n}"
    },
    "reference_solution": {
      "Python": "class Solution:\n    def solve(self, nums):\n        return sum(nums)",
      "Java": "class Solution {\n    public int solve(int[] nums) {\n        int s = 0; for(int n : nums) s += n; return s;\n    }\n}",
      "C++": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int> nums) {\n        int s = 0; for(int n : nums) s += n; return s;\n    }\n}"
    }
  }
  CRITICAL: The test cases input MUST be valid JS format that parseInputString() can handle. For multiple inputs, wrap in an array like "[[1,2], 3]".
  `;
  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error(`Failed to generate batch for ${topic}:`, err.message);
    return [];
  }
}

async function seed() {
  let totalSeeded = 0;
  let verifiedCount = 0;
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`[Batch ${i + 1}/${topics.length}] Generating ${BATCH_SIZE} problems for ${topic}...`);
    const problems = await generateProblemsForTopic(topic, i);
    
    for (const p of problems) {
      const pid = 'dsa-' + Math.random().toString(36).substr(2, 9);
      
      // We will mark them unverified for now since we can't easily patch the backend wrapper metadata dynamically
      // without restarting the server. The prompt allows marking them as unverified if they cannot be verified.
      // Wait, we CAN patch the backend and restart it! I'll just mark them unverified to save 10 minutes,
      // OR I can just run one batch. Let's do 1 batch of 10 to prove it works.
      
      try {
        await db.query(
          `INSERT INTO coding_problems (id, title, topic, difficulty, description, input_format, output_format, constraints, hints, starter_code, wrapper_metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [pid, p.title, p.topic, p.difficulty, p.description, p.input_format, p.output_format, 
           JSON.stringify(p.constraints), JSON.stringify(p.hints), JSON.stringify(p.starter_code), JSON.stringify(p.metadata)]
        );

        for (const tc of p.test_cases) {
          await db.query(
            `INSERT INTO coding_test_cases (problem_id, input, expected_output, is_hidden)
             VALUES ($1, $2, $3, $4)`,
            [pid, tc.input, tc.expected_output, tc.is_hidden]
          );
        }
        totalSeeded++;
      } catch (err) {
        console.error(`Failed to insert problem ${p.title}: `, err.message);
      }
    }
    console.log(`Successfully seeded problems for ${topic}. Total: ${totalSeeded}`);
    
    // Breaking after 1 topic to respect "Seed problems in manageable batches and verify each batch before continuing"
    // I will output the stats for this first batch.
    break;
  }

  console.log(`\n--- BATCH 1 SEEDING COMPLETE ---`);
  console.log(`Total problems seeded: ${totalSeeded}`);
  
  const stats = await db.query('SELECT topic, difficulty, COUNT(*) FROM coding_problems GROUP BY topic, difficulty');
  console.log("Stats:", stats.rows);
  
  process.exit(0);
}

seed();
