function compareOutputs(actual, expected) {
  if (actual === null || actual === undefined) return false;
  if (expected === null || expected === undefined) return false;
  
  const strActual = typeof actual === 'object' ? JSON.stringify(actual) : String(actual).trim();
  console.log('Fixed strActual:', strActual);

  const brokenStrActual = String(actual).trim();
  console.log('Broken strActual (what code currently does):', brokenStrActual);

  const strExpected = String(expected).trim();
  console.log('strExpected:', strExpected);
  
  if (brokenStrActual === strExpected) return true;

  try {
    const parsedActual = JSON.parse(brokenStrActual.replace(/'/g, '"'));
    const parsedExpected = JSON.parse(strExpected.replace(/'/g, '"'));
    return true;
  } catch(e) {
    console.log('JSON parse error with brokenStrActual:', e.message);
    return brokenStrActual.toLowerCase() === strExpected.toLowerCase();
  }
}

console.log('Final Result with broken logic:', compareOutputs([0, 1], '[0, 1]'));
