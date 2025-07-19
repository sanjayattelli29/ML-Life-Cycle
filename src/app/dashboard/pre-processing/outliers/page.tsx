'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import BasePreprocessingPage from '../components/BasePreprocessingPage';
import { usePreprocessingContext } from '../context/PreprocessingContext';

type DataRow = Record<string, string | number | null>;

export default function Outliers() {
  const { dataset, setProcessedData, setProcessingStatus, setIsProcessing } = usePreprocessingContext();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [method, setMethod] = useState<string>('zscore');
  const [threshold, setThreshold] = useState<number>(3);
  const [replacementMethod, setReplacementMethod] = useState<string>('mean');

  const calculateZScore = (values: number[]): number[] => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
    return values.map(val => Math.abs((val - mean) / stdDev));
  };

  const calculateIQR = (values: number[]): { q1: number; q3: number; iqr: number } => {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    return { q1, q3, iqr };
  };

  const calculateReplacement = (values: number[], method: string): number => {
    switch (method) {
      case 'mean':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'median': {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      default:
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  };

  const handleProcessData = async () => {
    if (!dataset) return;

    setIsProcessing(true);
    setProcessingStatus('Analyzing outliers...');

    try {
      const processedData = {
        ...dataset,
        data: [...dataset.data]
      };

      for (const column of selectedColumns) {
        setProcessingStatus(`Processing outliers in column: ${column}`);

        // Extract numeric values and their indices
        const columnDataWithIndices = processedData.data
          .map((row, index) => ({ 
            value: row[column],
            index
          }))
          .filter(item => item.value !== null && item.value !== undefined && !isNaN(Number(item.value)));

        const columnData = columnDataWithIndices.map(item => Number(item.value));
        
        // Identify outliers
        let outlierIndices: number[] = [];
        if (method === 'zscore') {
          const zScores = calculateZScore(columnData);
          outlierIndices = zScores
            .map((z, index) => (z > threshold ? columnDataWithIndices[index].index : -1))
            .filter(i => i !== -1);
        } else if (method === 'iqr') {
          const { q1, q3, iqr } = calculateIQR(columnData);
          const lowerBound = q1 - threshold * iqr;
          const upperBound = q3 + threshold * iqr;
          outlierIndices = columnData
            .map((val, index) => (val < lowerBound || val > upperBound ? columnDataWithIndices[index].index : -1))
            .filter(i => i !== -1);
        }

        // Calculate replacement value
        if (outlierIndices.length > 0) {
          const nonOutlierValues = columnData.filter((_, i) => 
            !outlierIndices.includes(columnDataWithIndices[i].index)
          );
          const replacementValue = calculateReplacement(nonOutlierValues, replacementMethod);

          // Replace outliers
          processedData.data = processedData.data.map((row, rowIndex) => {
            if (outlierIndices.includes(rowIndex)) {
              return { ...row, [column]: replacementValue };
            }
            return row;
          });
        }
      }

      setProcessedData(processedData);
      setProcessingStatus('Outliers have been handled successfully!');
      toast.success('Outliers processed successfully!');
    } catch (error) {
      console.error('Error processing outliers:', error);
      toast.error('Failed to process outliers');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage 
      title="Handle Outliers" 
      description="Select columns and methods to detect and handle outliers in your dataset."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Select Columns</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dataset?.columns
              .filter(col => col.type === 'numeric')
              .map(column => (
                <label key={column.name} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, column.name]);
                      } else {
                        setSelectedColumns(selectedColumns.filter(col => col !== column.name));
                      }
                    }}
                    className="form-checkbox"
                  />
                  <span>{column.name}</span>
                </label>
              ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Detection Method</h3>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="form-select mt-1 block w-full"
            >
              <option value="zscore">Z-Score</option>
              <option value="iqr">IQR (Interquartile Range)</option>
            </select>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Threshold ({method === 'zscore' ? 'standard deviations' : 'IQR multiplier'})
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                min="1"
                step="0.5"
                className="mt-1 form-input block w-full"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Replacement Method</h3>
            <select
              value={replacementMethod}
              onChange={(e) => setReplacementMethod(e.target.value)}
              className="form-select mt-1 block w-full"
            >
              <option value="mean">Mean</option>
              <option value="median">Median</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleProcessData}
          disabled={selectedColumns.length === 0}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 hover:bg-blue-600"
        >
          Process Outliers
        </button>
      </div>
    </BasePreprocessingPage>
  );
}
