import db from '../server/db.js';
import { simulateCodeExecution } from '../server/services/aiEngine.js';

async function testTree() {
  const prob = (await db.query('SELECT * FROM coding_problems WHERE id = $1', ['dsa-b5-1'])).rows[0];
  const tcs = (await db.query('SELECT input, expected_output FROM coding_test_cases WHERE problem_id = $1', ['dsa-b5-1'])).rows.map(r => ({ input: r.input, expectedOutput: r.expected_output }));

  console.log("Problem:", prob.title);
  console.log("Sample input:", tcs[0].input, "expected:", tcs[0].expected_output);

  // In Python:
  // Note: For dsa-b5-1, the starter code is:
  // Python: class Solution: def solve(self, root): pass
  // Sample input: [3,9,20,null,null,15,7] -> Out: 3
  const pyCode = `class Solution:
    def solve(self, root):
        if not root: return 0
        return 1 + max(self.solve(root.left), self.solve(root.right))`;

  const pyRes = await simulateCodeExecution({
    language: 'Python',
    code: pyCode,
    testCases: tcs,
    problemTitle: prob.title,
    wrapperMetadata: prob.wrapper_metadata
  });
  console.log("Tree Python Test:", pyRes.passedCount, "/", tcs.length, pyRes.status);

  process.exit(0);
}

testTree().catch(e => { console.error(e); process.exit(1); });
