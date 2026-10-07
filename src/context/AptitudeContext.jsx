import React, { createContext, useContext, useState } from 'react';

const AptitudeContext = createContext();

export function useAptitude() {
  return useContext(AptitudeContext);
}

export function AptitudeProvider({ children }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sessionParams, setSessionParams] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [result, setResult] = useState(null);

  const value = {
    selectedCategory, setSelectedCategory,
    sessionParams, setSessionParams,
    currentSessionId, setCurrentSessionId,
    questions, setQuestions,
    result, setResult
  };

  return (
    <AptitudeContext.Provider value={value}>
      {children}
    </AptitudeContext.Provider>
  );
}
