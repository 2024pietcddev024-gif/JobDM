import db from '../server/db.js';
import { simulateCodeExecution } from '../server/services/aiEngine.js';

async function diagnose() {
  console.log("=== DIAGNOSIS 1: Java Compilation Error ===");
  const tcsMissingNumber = (await db.query('SELECT input, expected_output, is_hidden FROM coding_test_cases WHERE problem_id = $1 ORDER BY id', ['dsa-b6-10'])).rows.map(tc => ({
    input: tc.input,
    expectedOutput: tc.expected_output,
    isHidden: tc.is_hidden
  }));
  const javaCompileErrorCode = `class Solution {
    public int solve(int[] nums) {
        this is not valid java code;
    }
}`;
  const javaRes = await simulateCodeExecution({
    language: 'Java',
    code: javaCompileErrorCode,
    testCases: tcsMissingNumber,
    problemTitle: 'Missing Number',
    wrapperMetadata: { isClass: true, className: 'Solution', methodName: 'solve' }
  });
  console.log("Java compile error result:", JSON.stringify(javaRes, null, 2));

  console.log("\n=== DIAGNOSIS 2: Java Array Return Type (dsa-div-2) ===");
  const tcsDiv2 = (await db.query('SELECT input, expected_output, is_hidden FROM coding_test_cases WHERE problem_id = $1 ORDER BY id', ['dsa-div-2'])).rows.map(tc => ({
    input: tc.input,
    expectedOutput: tc.expected_output,
    isHidden: tc.is_hidden
  }));
  const javaDiv2Code = `import java.util.*;
class Solution {
    public int[] solve(int[] nums) {
        List<Integer> list = new ArrayList<>();
        for (int x : nums) {
            if (x % 2 == 0) list.add(x);
        }
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}`;
  const javaDiv2Res = await simulateCodeExecution({
    language: 'Java',
    code: javaDiv2Code,
    testCases: tcsDiv2,
    problemTitle: 'Find Elements Divisible by 2',
    wrapperMetadata: { isClass: true, className: 'Solution', methodName: 'solve' }
  });
  console.log("Java Div2 results:", JSON.stringify(javaDiv2Res, null, 2));

  console.log("\n=== DIAGNOSIS 3: Two Sum II Inputs ===");
  const tcsTwoSum = (await db.query('SELECT input, expected_output FROM coding_test_cases WHERE problem_id = $1', ['dsa-b3-1'])).rows;
  console.log("Two Sum TC inputs:", tcsTwoSum);

  process.exit(0);
}

diagnose().catch(err => { console.error(err); process.exit(1); });
