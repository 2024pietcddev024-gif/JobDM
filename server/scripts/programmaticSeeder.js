import db from '../db.js';

const category = 'Logical Reasoning';
const TARGET = 30;

function generateDeterministicLR() {
  const questions = [];
  
  // Easy (30 questions) - Number Series
  for (let i = 1; i <= 30; i++) {
    const diff = i;
    const start = i * 2;
    const next = start + (diff * 4);
    
    questions.push({
      category,
      topic: 'Number Series',
      difficulty: 'Easy',
      question: `Find the next number in the series: ${start}, ${start + diff}, ${start + (diff * 2)}, ${start + (diff * 3)}, ...`,
      options: [
        (next).toString(),
        (next + 1).toString(),
        (next + diff).toString(),
        (next - 1).toString()
      ],
      correct_answer: (next).toString(),
      explanation: `The series increases by a constant difference of ${diff}. Therefore, the next number is ${start + (diff * 3)} + ${diff} = ${next}.`
    });
  }

  // Medium (30 questions) - Syllogisms & Logic
  for (let i = 1; i <= 30; i++) {
    const items = ["cats", "dogs", "birds", "fish", "cars", "bikes", "trees", "flowers", "books", "pens"];
    const itemA = items[i % items.length];
    const itemB = items[(i + 1) % items.length];
    const itemC = items[(i + 2) % items.length];
    
    questions.push({
      category,
      topic: 'Syllogisms',
      difficulty: 'Medium',
      question: `Statements: \n1. All ${itemA} are ${itemB}.\n2. Some ${itemB} are ${itemC}.\n\nConclusions: \nI. Some ${itemA} are ${itemC}.\nII. Some ${itemC} are ${itemB}.\n\nWhich conclusion(s) logically follows? (Scenario ${i})`,
      options: [
        "Only I follows",
        "Only II follows",
        "Both I and II follow",
        "Neither I nor II follows"
      ],
      correct_answer: "Only II follows",
      explanation: `From "Some ${itemB} are ${itemC}", we can definitively say "Some ${itemC} are ${itemB}". However, there is no direct relation given between ${itemA} and ${itemC}, so conclusion I does not necessarily follow.`
    });
  }

  // Hard (30 questions) - Seating Arrangements
  for (let i = 1; i <= 30; i++) {
    const people = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const p1 = people[i % 8];
    const p2 = people[(i + 2) % 8];
    const p3 = people[(i + 4) % 8];
    
    questions.push({
      category,
      topic: 'Seating Arrangement',
      difficulty: 'Hard',
      question: `Eight friends are sitting in a circle facing the center. ${p1} is sitting third to the left of ${p2}. ${p3} is to the immediate right of ${p1}. If the positions of ${p1} and ${p2} are swapped, who is sitting second to the right of ${p3}? (Arrangement ${i})`,
      options: [
        p1,
        p2,
        "Cannot be determined",
        "Data inadequate"
      ],
      correct_answer: p2,
      explanation: `By drawing the circular arrangement, ${p3} is to the immediate right of ${p1}. If ${p1} and ${p2} swap, ${p2} takes ${p1}'s place. The person second to the right of ${p3} will now be ${p2}.`
    });
  }

  return questions;
}

async function seedLR() {
  console.log('--- STARTING DETERMINISTIC LR SEEDING ---');
  let added = 0;
  const questions = generateDeterministicLR();
  
  for (const q of questions) {
    const dupCheck = await db.query(
      'SELECT id FROM aptitude_questions WHERE category = $1 AND question = $2',
      [q.category, q.question]
    );
    
    if (dupCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO aptitude_questions 
         (category, topic, difficulty, question, options, correct_answer, explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [q.category, q.topic, q.difficulty, q.question, JSON.stringify(q.options), q.correct_answer, q.explanation]
      );
      added++;
    }
  }
  
  console.log(`Added ${added} deterministic Logical Reasoning questions.`);
  
  const stats = await db.query('SELECT category, difficulty, count(*) as c FROM aptitude_questions GROUP BY category, difficulty ORDER BY category, difficulty');
  console.log('\\nFinal Counts:');
  stats.rows.forEach(r => console.log(`${r.category} | ${r.difficulty} | ${r.c}`));
  
  process.exit(0);
}

seedLR();
