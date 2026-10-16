import db from '../db.js';

const seedQuestions = [
  {
    category: 'Logical Reasoning', topic: 'Number Series', difficulty: 'Easy',
    question: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
    options: JSON.stringify(['(1/3)', '(1/8)', '(2/8)', '(1/16)']),
    correct_answer: '(1/8)',
    explanation: 'This is a simple division series; each number is one-half of the previous number.'
  },
  {
    category: 'Quantitative Aptitude', topic: 'Percentages', difficulty: 'Medium',
    question: 'If A is 20% taller than B, by what percent is B shorter than A?',
    options: JSON.stringify(['16.66%', '20%', '25%', '15%']),
    correct_answer: '16.66%',
    explanation: 'Let height of B = 100, then A = 120. B is 20 less than A. Percentage = (20/120)*100 = 16.66%'
  },
  {
    category: 'Verbal Ability', topic: 'Synonyms', difficulty: 'Easy',
    question: 'Choose the word most similar in meaning to: ABANDON',
    options: JSON.stringify(['Forsake', 'Keep', 'Cherish', 'Enlarge']),
    correct_answer: 'Forsake',
    explanation: 'To abandon means to leave or desert, which is synonymous with forsake.'
  },
  {
    category: 'Basic Coding', topic: 'Time Complexity', difficulty: 'Easy',
    question: 'What is the time complexity of binary search?',
    options: JSON.stringify(['O(1)', 'O(n)', 'O(log n)', 'O(n^2)']),
    correct_answer: 'O(log n)',
    explanation: 'Binary search halves the search space at each step, leading to a logarithmic time complexity.'
  },
  {
    category: 'Data Structures & Algorithms', topic: 'Arrays', difficulty: 'Easy',
    question: 'What is the time complexity of accessing an element in an array using its index?',
    options: JSON.stringify(['O(1)', 'O(n)', 'O(log n)', 'O(n^2)']),
    correct_answer: 'O(1)',
    explanation: 'Arrays store elements in contiguous memory locations, allowing constant time access.'
  },
  {
    category: 'Operating Systems', topic: 'Deadlock', difficulty: 'Medium',
    question: 'Which of the following is NOT a necessary condition for deadlock?',
    options: JSON.stringify(['Mutual Exclusion', 'Hold and Wait', 'No Preemption', 'Starvation']),
    correct_answer: 'Starvation',
    explanation: 'The four necessary conditions for deadlock are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.'
  },
  {
    category: 'Computer Networks', topic: 'OSI Model', difficulty: 'Easy',
    question: 'Which layer of the OSI model is responsible for routing packets?',
    options: JSON.stringify(['Data Link Layer', 'Network Layer', 'Transport Layer', 'Physical Layer']),
    correct_answer: 'Network Layer',
    explanation: 'The Network layer is responsible for packet forwarding including routing through intermediate routers.'
  },
  {
    category: 'DBMS', topic: 'SQL', difficulty: 'Medium',
    question: 'Which SQL statement is used to remove all rows from a table without logging the individual row deletions?',
    options: JSON.stringify(['DELETE', 'DROP', 'TRUNCATE', 'REMOVE']),
    correct_answer: 'TRUNCATE',
    explanation: 'TRUNCATE is a DDL command that quickly removes all rows from a table.'
  },
  {
    category: 'DCN', topic: 'Data Transmission', difficulty: 'Medium',
    question: 'Which of the following multiplexing techniques is used in optical fiber?',
    options: JSON.stringify(['FDM', 'TDM', 'WDM', 'CDM']),
    correct_answer: 'WDM',
    explanation: 'Wavelength Division Multiplexing (WDM) is used in optical fiber communications.'
  },
  {
    category: 'Theory of Computation (TOC)', topic: 'Automata', difficulty: 'Medium',
    question: 'Which type of language is accepted by a Pushdown Automaton (PDA)?',
    options: JSON.stringify(['Regular Languages', 'Context-Free Languages', 'Context-Sensitive Languages', 'Recursively Enumerable Languages']),
    correct_answer: 'Context-Free Languages',
    explanation: 'A Pushdown Automaton is designed to recognize Context-Free Languages.'
  },
  {
    category: 'OOPS', topic: 'Inheritance', difficulty: 'Easy',
    question: 'Which principle of OOPS is used when a class acquires the properties of another class?',
    options: JSON.stringify(['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction']),
    correct_answer: 'Inheritance',
    explanation: 'Inheritance allows a class to inherit the attributes and methods of another class.'
  },
  {
    category: 'C++', topic: 'Pointers', difficulty: 'Medium',
    question: 'What does the `&` operator do in C++ when placed before a variable name?',
    options: JSON.stringify(['Returns the value', 'Returns the memory address', 'Dereferences the pointer', 'Allocates memory']),
    correct_answer: 'Returns the memory address',
    explanation: 'The address-of operator `&` returns the memory address of a variable.'
  }
];

async function seed() {
  try {
    for (const q of seedQuestions) {
      await db.query(
        `INSERT INTO aptitude_questions (category, topic, difficulty, question, options, correct_answer, explanation) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [q.category, q.topic, q.difficulty, q.question, q.options, q.correct_answer, q.explanation]
      );
    }
    console.log('Seed questions inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
