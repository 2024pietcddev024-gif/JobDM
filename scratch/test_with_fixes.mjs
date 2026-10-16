import db from '../server/db.js';
import { PISTON_LANG_MAP, compareOutputs } from '../server/services/aiEngine.js';
import { generateWrapperCode } from '../server/services/executionWrappers.js';

// Test with the 3 minimal fixes applied in memory:
// 1. In Java wrapper: move student import statements to top
// 2. In wrappers: unwrap tc if pTypes.length > 1 and tc.length === 1 and Array.isArray(tc[0])
// 3. In simulateCodeExecution: classify java compile error as compilation_error

function patchedGenerateWrapperCode(language, code, testCases, problemTitle, wrapperMetadata) {
  // Fix 1: For Java, extract import statements
  let cleanCode = code;
  let customImports = '';
  if (language === 'Java') {
    const importLines = [];
    const nonImportLines = [];
    code.split('\n').forEach(line => {
      if (line.trim().startsWith('import ')) importLines.push(line.trim());
      else nonImportLines.push(line);
    });
    cleanCode = nonImportLines.join('\n');
    customImports = importLines.join('\n');
  }

  // Generate wrapper using original function
  let wrapper = generateWrapperCode(language, cleanCode, testCases, problemTitle, wrapperMetadata);

  if (language === 'Java' && customImports) {
    wrapper = customImports + '\n' + wrapper;
  }

  return wrapper;
}

console.log("Patched wrapper test script created.");
