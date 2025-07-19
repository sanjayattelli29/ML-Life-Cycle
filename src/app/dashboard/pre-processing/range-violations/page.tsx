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

interface RangeRule {
  column: string;
  min?: number;
  max?: number;
  action: 'clip' | 'remove' | 'setNull';
}

interface ColumnStats {
  min: number;
  max: number;
  mean: number;
  std: number;
}

export default function RangeViolations() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rangeRules, setRangeRules] = useState<RangeRule[]>([]);
  const [columnStats, setColumnStats] = useState<Record<string, ColumnStats>>({});

  const calculateColumnStats = (data: Record<string, string | number>[], column: string): ColumnStats => {
    const numbers = data
      .map(row => Number(row[column]))
      .filter(val => !isNaN(val));

    const sum = numbers.reduce((acc, val) => acc + val, 0);
    const mean = sum / numbers.length;
    const squaredDiffs = numbers.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / numbers.length;

    return {
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      mean,
      std: Math.sqrt(variance)
    };
  };

  const handleAddRule = (column: string) => {
    const stats = columnStats[column];
    if (!stats) return;

    setRangeRules([
      ...rangeRules,
      {
        column,
        min: stats.mean - 3 * stats.std, // Default to 3 standard deviations
        max: stats.mean + 3 * stats.std,
        action: 'clip'
      }
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setRangeRules(rangeRules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<RangeRule>) => {
    setRangeRules(rangeRules.map((rule, i) => 
      i === index ? { ...rule, ...updates } : rule
    ));
  };

  const analyzeColumns = () => {
    if (!dataset) return;

    const stats: Record<string, ColumnStats> = {};
    dataset.columns
      .filter(col => col.type === 'numeric')
      .forEach(col => {
        stats[col.name] = calculateColumnStats(dataset.data, col.name);
      });

    setColumnStats(stats);
  };

  const handleProcess = async () => {
    if (!dataset || rangeRules.length === 0) {
      toast.error('Please set at least one range rule');
      return;
    }

    setIsProcessing(true);
    try {
      const processedData = { ...dataset };
      
      processedData.data = processedData.data.filter(row => {
        let keepRow = true;
        
        rangeRules.forEach(rule => {
          const value = Number(row[rule.column]);
          if (isNaN(value)) return;

          const isViolation = (rule.min !== undefined && value < rule.min) ||
                            (rule.max !== undefined && value > rule.max);

          if (isViolation) {
            switch (rule.action) {
              case 'clip':
                if (rule.min !== undefined && value < rule.min) {
                  row[rule.column] = rule.min;
                }
                if (rule.max !== undefined && value > rule.max) {
                  row[rule.column] = rule.max;
                }
                break;
              case 'remove':
                keepRow = false;
                break;
              case 'setNull':
                row[rule.column] = null;
                break;
            }
          }
        });

        return keepRow;
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
          operation: 'range-violations'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      toast.success('Range violations handled successfully');
      setDataset(processedData);
    } catch (error) {
      console.error('Error handling range violations:', error);
      toast.error('Failed to handle range violations');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Handle Range Violations"
      description="Define acceptable ranges for numeric columns and handle out-of-range values."
    >
      <div className="space-y-6">
        <div>
          <button
            onClick={analyzeColumns}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Analyze Columns
          </button>
        </div>

        {Object.entries(columnStats).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Column Statistics</h3>
            {Object.entries(columnStats).map(([column, stats]) => (
              <div key={column} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{column}</h4>
                    <p className="text-sm text-gray-500">
                      Range: {stats.min.toFixed(2)} to {stats.max.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Mean: {stats.mean.toFixed(2)} ± {stats.std.toFixed(2)}
                    </p>
                  </div>
                  {!rangeRules.some(rule => rule.column === column) && (
                    <button
                      onClick={() => handleAddRule(column)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Add Rule
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {rangeRules.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Range Rules</h3>
            {rangeRules.map((rule, index) => (
              <div key={index} className="bg-white border rounded-lg p-4 space-y-4">
                <div className="flex justify-between">
                  <h4 className="font-medium">{rule.column}</h4>
                  <button
                    onClick={() => handleRemoveRule(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700">Minimum</label>
                    <input
                      type="number"
                      value={rule.min}
                      onChange={(e) => updateRule(index, { min: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Maximum</label>
                    <input
                      type="number"
                      value={rule.max}
                      onChange={(e) => updateRule(index, { max: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-700">Action</label>
                  <select
                    value={rule.action}
                    onChange={(e) => updateRule(index, { action: e.target.value as RangeRule['action'] })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="clip">Clip to Range</option>
                    <option value="remove">Remove Row</option>
                    <option value="setNull">Set to Null</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {rangeRules.length > 0 && (
          <div>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Apply Range Rules'}
            </button>
          </div>
        )}
      </div>
    </BasePreprocessingPage>
  );
}
