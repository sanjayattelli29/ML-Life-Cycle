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

interface Inconsistency {
  column: string;
  value: string;
  count: number;
  similar: string[];
}

export default function Inconsistencies() {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const calculateLevenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(a.length + 1).fill(null).map(() => 
      Array(b.length + 1).fill(null)
    );

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[a.length][b.length];
  };

  const findSimilarValues = (values: string[]): Inconsistency[] => {
    const inconsistencies: Inconsistency[] = [];
    const frequency: Record<string, number> = {};
    
    // Calculate frequency of each value
    values.forEach(val => {
      if (val === null || val === undefined) return;
      frequency[val] = (frequency[val] || 0) + 1;
    });

    // Find similar values using Levenshtein distance
    Object.entries(frequency).forEach(([value, count]) => {
      const similar = Object.keys(frequency)
        .filter(other => {
          if (other === value) return false;
          const distance = calculateLevenshteinDistance(value, other);
          return distance <= 2 && distance > 0; // Adjust threshold as needed
        });

      if (similar.length > 0) {
        inconsistencies.push({
          column: selectedColumns[0], // For simplicity, we're processing one column at a time
          value,
          count,
          similar
        });
      }
    });

    return inconsistencies;
  };

  const findInconsistencies = () => {
    if (!dataset || selectedColumns.length === 0) return;

    const column = selectedColumns[0];
    const values = dataset.data
      .map(row => row[column]?.toString() || '')
      .filter(val => val !== '');

    const found = findSimilarValues(values);
    setInconsistencies(found);
  };

  const handleAddReplacement = (original: string, replacement: string) => {
    setReplacements(prev => ({
      ...prev,
      [original]: replacement
    }));
  };

  const handleProcess = async () => {
    if (!dataset || Object.keys(replacements).length === 0) {
      toast.error('Please select replacements for inconsistent values');
      return;
    }

    setIsProcessing(true);
    try {
      const processedData = { ...dataset };
      const column = selectedColumns[0];

      processedData.data = processedData.data.map(row => {
        const value = row[column]?.toString();
        if (value && replacements[value]) {
          return {
            ...row,
            [column]: replacements[value]
          };
        }
        return row;
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
          operation: 'inconsistencies'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      toast.success('Inconsistencies resolved successfully');
      setDataset(processedData);
      setInconsistencies([]);
      setReplacements({});
    } catch (error) {
      console.error('Error resolving inconsistencies:', error);
      toast.error('Failed to resolve inconsistencies');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Fix Inconsistencies"
      description="Identify and fix inconsistent text values in your dataset."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Column</h3>
          <p className="text-sm text-gray-500 mb-4">Choose a column to check for inconsistencies</p>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedColumns[0] || ''}
            onChange={(e) => {
              setSelectedColumns([e.target.value]);
              setInconsistencies([]);
              setReplacements({});
            }}
          >
            <option value="">Select a column</option>
            {dataset?.columns
              .filter(col => col.type === 'text')
              .map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name}
                </option>
            ))}
          </select>
        </div>

        {selectedColumns.length > 0 && (
          <div>
            <button
              onClick={findInconsistencies}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Find Inconsistencies
            </button>
          </div>
        )}

        {inconsistencies.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Found Inconsistencies</h3>
            {inconsistencies.map((inc, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">"{inc.value}"</span>
                  <span className="text-gray-500">({inc.count} occurrences)</span>
                </div>
                <div className="space-y-2">
                  {inc.similar.map((similarValue) => (
                    <div key={similarValue} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Similar to: "{similarValue}"</span>
                      <button
                        onClick={() => handleAddReplacement(inc.value, similarValue)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          replacements[inc.value] === similarValue
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {replacements[inc.value] === similarValue ? 'Selected' : 'Use This'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(replacements).length > 0 && (
          <div>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Apply Replacements'}
            </button>
          </div>
        )}
      </div>
    </BasePreprocessingPage>
  );
}
