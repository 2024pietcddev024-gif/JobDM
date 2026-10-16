import db from './server/db.js';

const inspectSchema = async () => {
  try {
    const res = await db.query("SELECT table_name, column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;");
    console.log(JSON.stringify(res.rows, null, 2));
    
    // Check primary keys and foreign keys
    const constraints = await db.query("SELECT tc.table_name, kcu.column_name, tc.constraint_type FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.table_schema = 'public'");
    console.log("Constraints:", JSON.stringify(constraints.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
inspectSchema();
