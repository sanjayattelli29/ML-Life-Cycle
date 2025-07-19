'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import BasePreprocessingPage from '../components/BasePreprocessingPage';
import { usePreprocessingContext } from '../context/PreprocessingContext';

type DataRow = Record<string, string | number | null>;

export default function MissingValues() {
  const { dataset, setProcessedData, setProcessingStatus, setIsProcessing } = usePreprocessingContext();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [fillMethod, setFillMethod] = useState<string>('mean');
  const [customValue, setCustomValue] = useState<string>('');

  const calculateMean = (data: DataRow[], column: string): number => {
    const numbers = data
      .map(row => row[column])
      .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
      .map(Number);
    return numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
  };

  const calculateMedian = (data: DataRow[], column: string): number => {
    const numbers = data
      .map(row => row[column])
      .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
      .map(Number)
      .sort((a, b) => a - b);
    const mid = Math.floor(numbers.length / 2);
    return numbers.length % 2 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
  };

  const calculateMode = (data: DataRow[], column: string): string | number => {
    const values = data.map(row => row[column]);
    const frequency: { [key: string]: number } = {};
    let maxFreq = 0;
    let mode: string | number = '';

    values.forEach(val => {
      if (val === null || val === undefined) return;
      const strVal = String(val);
      frequency[strVal] = (frequency[strVal] || 0) + 1;
      if (frequency[strVal] > maxFreq) {
        maxFreq = frequency[strVal];
        mode = val;
      }
    });

    return mode;
  };

  const handleProcessData = async () => {
    if (!dataset) return;

    setIsProcessing(true);
    setProcessingStatus('Analyzing missing values...');

    try {
      const processedData = {
        ...dataset,
        data: [...dataset.data]
      };

      for (const column of selectedColumns) {
        setProcessingStatus(`Processing missing values in column: ${column}`);
        let fillValue: string | number;

        if (fillMethod === 'custom') {
          fillValue = customValue;
        } else {
          const columnData = dataset.data;
          switch (fillMethod) {
            case 'mean':
              fillValue = calculateMean(columnData, column);
              break;
            case 'median':
              fillValue = calculateMedian(columnData, column);
              break;
            case 'mode':
              fillValue = calculateMode(columnData, column);
              break;
            default:
              fillValue = '';
          }
        }

        processedData.data = processedData.data.map(row => ({
          ...row,
          [column]: row[column] === null || row[column] === undefined || row[column] === '' 
            ? fillValue 
            : row[column]
        }));
      }

      setProcessedData(processedData);
      setProcessingStatus('Missing values have been handled successfully!');
      toast.success('Missing values processed successfully!');
    } catch (error) {
      console.error('Error processing missing values:', error);
      toast.error('Failed to process missing values');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage 
      title="Handle Missing Values" 
      description="Select columns and methods to handle missing values in your dataset."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Select Columns</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dataset?.columns.map(column => (
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

        <div>
          <h3 className="text-lg font-semibold mb-2">Fill Method</h3>
          <select
            value={fillMethod}
            onChange={(e) => setFillMethod(e.target.value)}
            className="form-select mt-1 block w-full"
          >
            <option value="mean">Mean</option>
            <option value="median">Median</option>
            <option value="mode">Mode</option>
            <option value="custom">Custom Value</option>
          </select>

          {fillMethod === 'custom' && (
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Enter custom value"
              className="mt-2 form-input block w-full"
            />
          )}
        </div>

        <button
          onClick={handleProcessData}
          disabled={selectedColumns.length === 0}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 hover:bg-blue-600"
        >
          Process Missing Values
        </button>
      </div>
    </BasePreprocessingPage>
  );
}
