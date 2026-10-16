import db from '../server/db.js';

async function verify() {
  try {
    const res = await db.query(`
      SELECT category, difficulty, count(*) 
      FROM aptitude_questions 
      GROUP BY category, difficulty
    `);
    
    const data = res.rows;
    const categories = [
      'Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability', 
      'Basic Coding', 'Data Structures & Algorithms', 'Operating Systems', 
      'Computer Networks', 'DBMS', 'DCN', 'Theory of Computation (TOC)', 
      'OOPS', 'C++'
    ];
    
    const table = {};
    categories.forEach(c => table[c] = { Easy: 0, Medium: 0, Hard: 0, Total: 0 });
    
    data.forEach(r => {
      const { category, difficulty, count } = r;
      if (!table[category]) table[category] = { Easy: 0, Medium: 0, Hard: 0, Total: 0 };
      table[category][difficulty] = parseInt(count);
      table[category].Total += parseInt(count);
    });
    
    console.log('Category | Easy | Medium | Hard | Total');
    console.log('--- | --- | --- | --- | ---');
    Object.keys(table).forEach(c => {
      console.log(`${c} | ${table[c].Easy} | ${table[c].Medium} | ${table[c].Hard} | ${table[c].Total}`);
    });
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
verify();
