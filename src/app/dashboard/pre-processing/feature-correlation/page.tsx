'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import BasePreprocessingPage from '../components/BasePreprocessingPage';

interface Column {
  name: string;
  type: 'numeric' | 'text' | 'date';
}

interface Dataset {
  _id: string;
  name: string;
  columns: Column[];
  data: Record<string, string | number>[];
}

interface CorrelationPair {
  column1: string;
  column2: string;
  correlation: number;
}

export default function FeatureCorrelation() {
  const [threshold, setThreshold] = useState<number>(0.8);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [correlations, setCorrelations] = useState<CorrelationPair[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const findCorrelations = () => {
    if (!dataset) return;

    const numericColumns = dataset.columns.filter(col => col.type === 'numeric');
    const foundCorrelations: CorrelationPair[] = [];

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i].name;
        const col2 = numericColumns[j].name;

        const values1 = dataset.data.map(row => Number(row[col1])).filter(val => !isNaN(val));
        const values2 = dataset.data.map(row => Number(row[col2])).filter(val => !isNaN(val));

        if (values1.length === values2.length) {
          const correlation = Math.abs(calculateCorrelation(values1, values2));
          if (correlation >= threshold) {
            foundCorrelations.push({ column1: col1, column2: col2, correlation });
          }
        }
      }
    }

    setCorrelations(foundCorrelations.sort((a, b) => b.correlation - a.correlation));
  };

  const togglePairSelection = (pair: string) => {
    const newSelected = new Set(selectedPairs);
    if (newSelected.has(pair)) {
      newSelected.delete(pair);
    } else {
      newSelected.add(pair);
    }
    setSelectedPairs(newSelected);
  };

  const handleProcess = async () => {
    if (!dataset || selectedPairs.size === 0) {
      toast.error('Please select at least one correlation pair to resolve');
      return;
    }

    setIsProcessing(true);
    try {
      const processedData = { ...dataset };
      const columnsToRemove = new Set<string>();

      selectedPairs.forEach(pair => {
        const [col1, col2] = pair.split('|');
        // Always remove the second column of the pair
        columnsToRemove.add(col2);
      });

      // Remove selected columns
      processedData.columns = processedData.columns.filter(
        col => !columnsToRemove.has(col.name)
      );

      // Remove column data
      processedData.data = processedData.data.map(row => {
        const newRow = { ...row };
        columnsToRemove.forEach(col => delete newRow[col]);
        return newRow;
      });

      // Save processed data
      const response = await fetch('/api/datasets/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId: dataset._id,
          processedData,
          operation: 'feature-correlation'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      toast.success('Highly correlated features removed successfully');
      setDataset(processedData);
      setCorrelations([]);
      setSelectedPairs(new Set());
    } catch (error) {
      console.error('Error removing correlated features:', error);
      toast.error('Failed to remove correlated features');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Feature Correlation Analysis"
      description="Identify and handle highly correlated features in your dataset."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Correlation Threshold</h3>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm font-medium">{threshold}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Features with correlation above this threshold will be identified
          </p>
        </div>

        <div>
          <button
            onClick={findCorrelations}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Find Correlations
          </button>
        </div>

        {correlations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Highly Correlated Features</h3>
            {correlations.map(({ column1, column2, correlation }) => {
              const pair = `${column1}|${column2}`;
              return (
                <div
                  key={pair}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {column1} ↔ {column2}
                    </p>
                    <p className="text-sm text-gray-500">
                      Correlation: {correlation.toFixed(3)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={pair}
                      checked={selectedPairs.has(pair)}
                      onChange={() => togglePairSelection(pair)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={pair} className="text-sm text-gray-700">
                      Remove {column2}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPairs.size > 0 && (
          <div>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `Remove Selected Features (${selectedPairs.size})`}
            </button>
          </div>
        )}
      </div>
    </BasePreprocessingPage>
  );
}
