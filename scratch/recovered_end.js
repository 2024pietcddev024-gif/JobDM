export async function evaluateCode({ problemTitle, problemDescription, language, code, testResult, inputFormat, outputFormat, constraints, examples }) {
342:   let finalVerdict = 'EVALUATION UNAVAILABLE';
343:   let passedCount = 0;
344:   let totalCount = 0;
345:   
346:   if (testResult && typeof testResult === 'object') {
347:      passedCount = testResult.passedCount || 0;
348:      totalCount = testResult.totalCount || 0;
349:      
350:      if (testResult.status === 'compilation_error') finalVerdict = 'COMPILATION ERROR';
351:      else if (testResult.status === 'runtime_error') finalVerdict = 'RUNTIME ERROR';
352:      else if (testResult.status === 'time_limit_exceeded') finalVerdict = 'TIME LIMIT EXCEEDED';
353:      else if (testResult.status === 'wrong_answer') finalVerdict = 'INCORRECT ANSWER';
354:      else if (testResult.status === 'success') finalVerdict = 'CORRECT ANSWER';
355:      else if (testResult.status === 'error') finalVerdict = 'EVALUATION UNAVAILABLE';
356:   }
357:   
358:   const correctness = totalCount > 0 ? Number(((passedCount / totalCount) * 100).toFixed(2)) + '%' : '0%';
359:   const failedCount = Math.max(0, totalCount - passedCount);
360: 
361:   let mappedVerdict = 'error';
362:   if (finalVerdict === 'CORRECT ANSWER') mappedVerdict = 'correct';
363:   else if (finalVerdict === 'INCORRECT ANSWER' || finalVerdict === 'RUNTIME ERROR' || finalVerdict === 'COMPILATION ERROR' || finalVerdict === 'TIME LIMIT EXCEEDED') mappedVerdict = 'incorrect';
364: 
365:   let failedTestCaseInfo = '';
366:   if (testResult && testResult.results) {
367:     const failedTest = testResult.results.find(r => !r.passed);
368:     if (failedTest) {
369:       failedTestCaseInfo = `\nFailed Test Case:\nInput: ${failedTest.input || 'Unavailable'}\nExpected Output: ${failedTest.expectedOutput || 'Unavailable'}\nActual Output: ${failedTest.actualOutput || 'Unavailable'}`;
370:     }
371:   }
372: 
373:   const fallback = {
374:     verdict: mappedVerdict,
375:     summary: finalVerdict,
376:     correctness,
377:     passedCount,
378:     failedCount,
379:     timeComplexity: "Unknown",
380:     spaceComplexity: "Unknown",
381:     logicAnalysis: "AI REVIEW TEMPORARILY UNAVAILABLE",
382:     codeQuality: "Unknown",
383:     edgeCaseAnalysis: "Unknown",
384:     userApproach: "Unknown",
385:     expectedApproach: "Unknown",
386:     difference: "Unknown",
387:     mistakeLocation: "Unknown",
388:     mistakeExplanation: "Unknown",
389:     improvementSuggestions: "Please try again later.",
390:     correctedCode: null,
391:     learningTopics: "Unknown",
392:     reviewStatus: "error",
393:     errorMessage: "AI review service is temporarily unavailable."
394:   };
395: 
396:   if (!genAI || finalVerdict === 'EVALUATION UNAVAILABLE') {
397:     return fallback;
398:   }
399: 
400:   const MAX_RETRIES = 3;
401:   let attempt = 0;
402:   let lastErrorMsg = '';
403:   let modelName = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
404: 
405:   while (attempt < MAX_RETRIES) {
406:     try {
407:       const model = genAI.getGenerativeModel({ model: modelName });
408:       const prompt = `You are an expert Senior Software Engineer conducting a code review.
409: Evaluate the submitted solution. DO NOT output verdict or correctness; focus on complexity and logic.
410: 
411: Problem: "${problemTitle}"
412: Description: "${problemDescription}"
413: Input Format: "${inputFormat || 'N/A'}"
414: Output Format: "${outputFormat || 'N/A'}"
415: 
416: Candidate Code:
417: \`\`\`${language}
418: ${code}
419: \`\`\`
420: 
421: Execution Results:
422: Verdict: ${finalVerdict}
423: Passed: ${passedCount}/${totalCount}${failedTestCaseInfo}
424: ${testResult?.compileError ? `\nCompilation Error:\n${testResult.compileError}` : ''}
425: ${testResult?.runtimeError ? `\nRuntime Error:\n${testResult.runtimeError}` : ''}
426: 
427: Generate a concise, constructive code review in valid JSON format ONLY. Ensure your JSON strictly matches the following structure:
428: {
429:   "timeComplexity": "O(n) / Unknown (analyze from code)",
430:   "spaceComplexity": "O(n) / Unknown (analyze from code)",
431:   "logicAnalysis": "Analysis of the candidate's core logic. Why it works or why it fails.",
432:   "userApproach": "What strategy did the candidate attempt?",
433:   "expectedApproach": "What is the optimal algorithmic approach?",
434:   "difference": "What is the difference between their approach and the optimal one?",
435:   "mistakeLocation": "Exactly where the mistake is in the code (if incorrect, compile error, or runtime error) or 'None' (if correct).",
436:   "mistakeExplanation": "Why the mistake causes a failure (if incorrect), explain the compile/runtime error, or 'N/A' (if correct). Use beginner-friendly language.",
437:   "improvementSuggestions": "Specific actionable steps to improve. (e.g. concepts to revise, logic to change, edge cases to test)",
438:   "correctedCode": "Provide a clean, optimized, fully working solution in the same language. Explain changes in comments. (string)",
439:   "codeQuality": "Feedback on code readability and structure.",
440:   "edgeCaseAnalysis": "How does it handle edge cases? Did it miss any?",
441:   "learningTopics": "Relevant DSA concepts or suggested next learning topics."
442: }`;
443: 
444:       // Set timeout for request
445:       const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
446:       const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
447:       let text = result.response.text();
448:       text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
449:       const parsed = JSON.parse(text);
450:       
451:       return {
452:         verdict: mappedVerdict,
453:         summary: finalVerdict,
454:         correctness,
455:         passedCount,
456:         failedCount,
457:         timeComplexity: parsed.timeComplexity || 'Unknown',
458:         spaceComplexity: parsed.spaceComplexity || 'Unknown',
459:         logicAnalysis: parsed.logicAnalysis || 'Unknown',
460:         codeQuality: parsed.codeQuality || 'Unknown',
461:         edgeCaseAnalysis: parsed.edgeCaseAnalysis || 'Unknown',
462:         userApproach: parsed.userApproach || 'Unknown',
463:         expectedApproach: parsed.expectedApproach || 'Unknown',
464:         difference: parsed.difference || 'Unknown',
465:         mistakeLocation: parsed.mistakeLocation || 'Unknown',
466:         mistakeExplanation: parsed.mistakeExplanation || 'Unknown',
467:         improvementSuggestions: parsed.improvementSuggestions || 'Unknown',
468:         correctedCode: parsed.correctedCode || null,
469:         learningTopics: parsed.learningTopics || 'Unknown',
470:         reviewStatus: "success",
471:         errorMessage: null,
472:         reviewSource: "ai"
473:       };
474:     } catch (err) {
475:       const errMsg = err?.message || String(err);
476:       lastErrorMsg = errMsg;
477:       console.error(`[AI Engine] Code Evaluation error (attempt ${attempt + 1}):`, errMsg);
478: 
479:       if (errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('503') || errMsg.includes('500') || errMsg.includes('timeout')) {
480:         attempt++;
481:         if (attempt < MAX_RETRIES) {
482:           const delay = Math.pow(2, attempt) * 1000;
483:           await new Promise(res => setTimeout(res, delay));
484:           continue; // Retry
485:         }
486:       } else {
487:         // Break out of loop immediately for 400, 401, 403, 404, or unrecoverable error
488:         break;
489:       }
490:     }
491:   }
492: 
493:   // Fallback Logic
494:   let errorCategory = 'AI review service is temporarily unavailable.';
495:   let reviewStatus = 'error';
496:   let httpStatus = 'Unknown';
497: 
498:   if (lastErrorMsg.includes('400')) { errorCategory = 'AI Request/Configuration Issue (400).'; httpStatus = '400'; }
499:   else if (lastErrorMsg.includes('401') || lastErrorMsg.includes('403')) { errorCategory = 'AI Authentication/Permission Issue.'; httpStatus = lastErrorMsg.includes('401'
The above content was truncated because individual lines are very long. Only a portion of the content is shown.
