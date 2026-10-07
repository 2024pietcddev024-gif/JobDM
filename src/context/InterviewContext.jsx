import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const InterviewContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text || `HTTP ${res.status}` }; }
}

function normaliseQuestion(q) {
  if (!q) return null;
  return {
    ...q,
    question: q.question || q.question_text || '',
    question_text: q.question_text || q.question || '',
    type: q.type || q.question_type || 'conceptual',
    topics: parseField(q.topics),
    expectedKeywords: parseField(q.expectedKeywords || q.expected_keywords),
    codingPrompt: q.codingPrompt || q.coding_starter || null,
    idealAnswer: q.idealAnswer || q.ideal_answer || null,
  };
}

function parseField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

export const InterviewProvider = ({ children }) => {
  const [pastSessions, setPastSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionsHistory, setQuestionsHistory] = useState([]);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [interviewError, setInterviewError] = useState(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  // Track all asked question texts to prevent repetition
  const askedQuestionsRef = useRef([]);

  const fetchHistory = async () => {
    const token = localStorage.getItem('interviewiq_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/interviews/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeJson(res);
      if (res.ok) setPastSessions(data.sessions || []);
    } catch (err) {
      console.error('[InterviewContext] Failed to fetch history', err);
    }
  };

  useEffect(() => { 
    fetchHistory(); 
    
    // Resume active session on refresh
    const stored = localStorage.getItem('interviewiq_active_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.activeSession) {
          setActiveSession(parsed.activeSession);
          setCurrentQuestion(parsed.currentQuestion);
          setQuestionsHistory(parsed.questionsHistory || []);
          setQuestionIndex(parsed.questionIndex || 0);
          askedQuestionsRef.current = parsed.askedQuestions || [];
        }
      } catch (e) {
        localStorage.removeItem('interviewiq_active_session');
      }
    }
  }, []);

  useEffect(() => {
    if (activeSession && !interviewComplete) {
      localStorage.setItem('interviewiq_active_session', JSON.stringify({
        activeSession,
        currentQuestion,
        questionsHistory,
        questionIndex,
        askedQuestions: askedQuestionsRef.current
      }));
    }
  }, [activeSession, currentQuestion, questionsHistory, questionIndex, interviewComplete]);

  const startNewInterview = async ({ category, role, difficulty, resumeData, totalQuestions = 10, mode = 'voice', codingLanguage, interviewMode }) => {
    const token = localStorage.getItem('interviewiq_token');
    if (!token) {
      setInterviewError('You must be logged in to start an interview.');
      return { success: false, error: 'Not authenticated' };
    }

    setIsLoadingQuestion(true);
    setQuestionsHistory([]);
    setInterviewError(null);
    setQuestionIndex(0);
    setInterviewComplete(false);
    setFinalReport(null);
    askedQuestionsRef.current = [];

    try {
      const res = await fetch(`${API_URL}/interviews/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, role, difficulty, mode, resumeData, totalQuestions, codingLanguage, interviewMode })
      });

      const data = await safeJson(res);
      if (!res.ok) {
        setInterviewError(data.error || `Server error (${res.status})`);
        return { success: false, error: data.error };
      }

      const q = normaliseQuestion(data.question);
      askedQuestionsRef.current = [{ question_text: q.question }];

      setActiveSession({ ...data.session, totalQuestions, category, role, difficulty, mode, resumeData, interviewMode, codingLanguage });
      setCurrentQuestion(q);
      setQuestionIndex(0);
      return { success: true };
    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'Unable to connect to the server. Make sure the backend is running.'
        : `Failed to start: ${err.message}`;
      setInterviewError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const submitCurrentAnswer = async ({ answerText, codeContent, metrics }) => {
    if (!activeSession || !currentQuestion) return null;
    setIsEvaluating(true);
    const token = localStorage.getItem('interviewiq_token');

    try {
      const res = await fetch(`${API_URL}/interviews/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId: activeSession.id,
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          idealAnswer: currentQuestion.idealAnswer,
          expectedKeywords: currentQuestion.expectedKeywords || [],
          answer: answerText,
          code: codeContent,
          metrics,
          category: activeSession.category,
        })
      });

      const data = await safeJson(res);
      if (!res.ok) { console.error('[submit] Evaluate error:', data.error); return null; }

      const qaPair = {
        question: currentQuestion,
        answer: answerText || '',
        code: codeContent || '',
        evaluation: data.evaluation,
        metrics,
        timestamp: Date.now()
      };

      const newHistory = [...questionsHistory, qaPair];
      setQuestionsHistory(newHistory);

      const newIndex = questionIndex + 1;
      const total = activeSession.totalQuestions || 10;

      setQuestionIndex(newIndex);
      setActiveSession(prev => prev ? { ...prev, currentQuestionIndex: newIndex } : null);

      if (newIndex >= total) {
        // All questions done — finalize and generate report
        await finalizeInterview(newHistory);
        return data.evaluation;
      }

      // Load next question
      setIsLoadingQuestion(true);
      await loadNextQuestion(newIndex, newHistory);

      return data.evaluation;
    } catch (err) {
      console.error('[InterviewContext] submitCurrentAnswer error:', err);
      return null;
    } finally {
      setIsEvaluating(false);
    }
  };

  const loadNextQuestion = async (nextIndex, history) => {
    const token = localStorage.getItem('interviewiq_token');
    try {
      const res = await fetch(`${API_URL}/interviews/next-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId: activeSession?.id,
          category: activeSession?.category,
          role: activeSession?.role,
          difficulty: activeSession?.difficulty,
          questionIndex: nextIndex,
          askedQuestions: askedQuestionsRef.current,
          resumeData: activeSession?.resumeData,
          interviewMode: activeSession?.interviewMode,
          codingLanguage: activeSession?.codingLanguage || activeSession?.coding_language
        })
      });

      const data = await safeJson(res);
      if (!res.ok) { console.error('[next-question] error:', data.error); return; }

      const q = normaliseQuestion(data.question);
      askedQuestionsRef.current = [...askedQuestionsRef.current, { question_text: q.question }];
      setCurrentQuestion(q);
    } catch (err) {
      console.error('[InterviewContext] loadNextQuestion error:', err);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const finalizeInterview = async (history) => {
    const token = localStorage.getItem('interviewiq_token');
    const validEvals = history.filter(qa => qa.evaluation?.overall != null);
    const avgScore = validEvals.length > 0
      ? (validEvals.reduce((s, qa) => s + parseFloat(qa.evaluation.overall), 0) / validEvals.length).toFixed(1)
      : null;

    const durationMinutes = activeSession?.startTime
      ? Math.round((Date.now() - activeSession.startTime) / 60000)
      : null;

    try {
      await fetch(`${API_URL}/interviews/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId: activeSession?.id,
          questionsHistory: history,
          durationMinutes,
        })
      });
    } catch (err) {
      console.warn('[finalizeInterview] Could not call /complete:', err.message);
    }

    const report = {
      session: { ...activeSession, overall_score: avgScore, overallScore: avgScore, completedAt: Date.now() },
      questionsHistory: history,
      overallScore: avgScore,
    };

    setFinalReport(report);
    setInterviewComplete(true);
    localStorage.removeItem('interviewiq_active_session');
    fetchHistory();
    return report;
  };

  const skipCurrentQuestion = async () => {
    if (!activeSession || !currentQuestion) return;

    const skippedPair = {
      question: currentQuestion,
      answer: '',
      code: '',
      evaluation: {
        accuracy: 0, communication: 0, confidence: 0, depth: 0, examples: 0,
        overall: 0, verdict: 'Skipped',
        strengths: [],
        improvements: ['Question was skipped. Review this topic before your real interview.'],
        detailedFeedback: 'This question was skipped.',
        idealAnswer: currentQuestion.idealAnswer
      },
      metrics: {},
      skipped: true,
      timestamp: Date.now()
    };

    const newHistory = [...questionsHistory, skippedPair];
    setQuestionsHistory(newHistory);

    const newIndex = questionIndex + 1;
    const total = activeSession.totalQuestions || 10;
    setQuestionIndex(newIndex);

    if (newIndex >= total) {
      await finalizeInterview(newHistory);
      return;
    }

    setIsLoadingQuestion(true);
    await loadNextQuestion(newIndex, newHistory);
  };

  const exitInterview = async () => {
    const history = questionsHistory;
    if (history.length > 0) {
      await finalizeInterview(history);
    } else {
      setInterviewComplete(true);
      setFinalReport({ session: activeSession, questionsHistory: [], overallScore: null });
    }
    setActiveSession(null);
    setCurrentQuestion(null);
    setQuestionIndex(0);
    localStorage.removeItem('interviewiq_active_session');
  };

  const resetInterview = () => {
    setActiveSession(null);
    setCurrentQuestion(null);
    setQuestionsHistory([]);
    setQuestionIndex(0);
    setInterviewComplete(false);
    setFinalReport(null);
    setInterviewError(null);
    askedQuestionsRef.current = [];
    localStorage.removeItem('interviewiq_active_session');
  };

  return (
    <InterviewContext.Provider value={{
      pastSessions,
      activeSession,
      currentQuestion,
      questionsHistory,
      isLoadingQuestion,
      isEvaluating,
      questionIndex,
      interviewError,
      interviewComplete,
      finalReport,
      startNewInterview,
      submitCurrentAnswer,
      skipCurrentQuestion,
      exitInterview,
      resetInterview,
      fetchHistory,
    }}>
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => useContext(InterviewContext);
