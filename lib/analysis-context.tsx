'use client';
import { createContext, useContext, useState } from 'react';
import { AnalyseResponse } from './api';

const AnalysisCtx = createContext<{
  result: AnalyseResponse | null;
  setResult: (r: AnalyseResponse) => void;
}>({ result: null, setResult: () => {} });

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalyseResponse | null>(null);
  return (
    <AnalysisCtx.Provider value={{ result, setResult }}>
      {children}
    </AnalysisCtx.Provider>
  );
}

export const useAnalysis = () => useContext(AnalysisCtx);