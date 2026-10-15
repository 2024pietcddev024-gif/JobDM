import db from './server/db.js';

async function main() {
  try {
    const res = await db.query('SELECT starter_code, wrapper_metadata FROM coding_problems WHERE id = $1', ['dsa-b7-2']);
    if (res.rows.length === 0) {
      console.log('Problem not found');
      return;
    }
    
    let starterCode = res.rows[0].starter_code;
    let wrapperMeta = res.rows[0].wrapper_metadata;
    
    // Update Python starter code to use maxProfit
    starterCode.Python = "class Solution:\n    def maxProfit(self, prices):\n        pass";
    
    // Update wrapper_metadata to maxProfit
    wrapperMeta.methodName = "maxProfit";
    
    await db.query('UPDATE coding_problems SET starter_code = $1, wrapper_metadata = $2 WHERE id = $3', [starterCode, wrapperMeta, 'dsa-b7-2']);
    console.log('Successfully updated dsa-b7-2 in database');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

main();
