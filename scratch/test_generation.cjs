
const db = require('../server/db.js').default;
const aiEngine = require('../server/services/aiEngine.js');

async function test() {
  try {
    console.log('Generating...');
    const generated = await aiEngine.generateCodingProblem({ topic: 'Arrays', difficulty: 'Easy', pastQA: [] });
    console.log('Generated problem:', generated.title);
    
    const execRes = await aiEngine.simulateCodeExecution({
      language: 'Python',
      code: generated.starterCode.python,
      testCases: generated.testCases,
      problemTitle: generated.title,
      wrapperMetadata: { sourceType: generated.sourceType }
    });
    console.log('Execution result:', execRes.status);
    console.log(execRes);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
test();
