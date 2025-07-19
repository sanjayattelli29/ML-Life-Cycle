import { createContext, useContext } from 'react';

interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, string | number>[];
}

interface PreprocessingContextType {
  dataset: Dataset | null;
  setProcessedData: (data: Dataset | null) => void;
  setProcessingStatus: (status: string) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}

export const PreprocessingContext = createContext<PreprocessingContextType | null>(null);

export function usePreprocessingContext() {
  const context = useContext(PreprocessingContext);
  if (!context) {
    throw new Error('usePreprocessingContext must be used within a PreprocessingProvider');
  }
  return context;
}
