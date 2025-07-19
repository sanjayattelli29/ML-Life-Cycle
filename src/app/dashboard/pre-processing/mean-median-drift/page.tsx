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

interface ColumnDrift {
  column: string;
  mean: number;
  median: number;
  drift: number;
  skewness: number;
}

export default function MeanMedianDrift() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [driftStats, setDriftStats] = useState<ColumnDrift[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [transformationType, setTransformationType] = useState<'log' | 'sqrt' | 'boxcox'>('log');
  const [driftThreshold, setDriftThreshold] = useState<number>(0.2);

  const calculateDriftStats = (values: number[]): Omit<ColumnDrift, 'column'> => {
    const sortedValues = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const drift = Math.abs((mean - median) / mean);

    // Calculate skewness
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
    const skewness = values.reduce(
      (sum, val) => sum + Math.pow((val - mean) / std, 3),
      0
    ) / values.length;

    return {
      mean,
      median,
      drift,
      skewness
    };
  };

  const analyzeDistributions = () => {
    if (!dataset) return;

    const stats: ColumnDrift[] = [];
    dataset.columns
      .filter(col => col.type === 'numeric')
      .forEach(col => {
        const values = dataset.data
          .map(row => Number(row[col.name]))
          .filter(val => !isNaN(val));

        if (values.length > 0) {
          const driftStat = calculateDriftStats(values);
          stats.push({
            column: col.name,
            ...driftStat
          });
        }
      });

    setDriftStats(stats.sort((a, b) => b.drift - a.drift));
  };

  const applyTransformation = (values: number[], type: 'log' | 'sqrt' | 'boxcox'): number[] => {
    switch (type) {
      case 'log':
        // Add small constant to handle zeros and negatives
        const minVal = Math.min(...values);
        const constant = minVal < 0 ? Math.abs(minVal) + 1 : 0;
        return values.map(v => Math.log(v + constant));
      
      case 'sqrt':
        // Handle negative values
        const minValue = Math.min(...values);
        const shift = minValue < 0 ? Math.abs(minValue) : 0;
        return values.map(v => Math.sqrt(v + shift));
      
      case 'boxcox':
        // Simplified Box-Cox transformation with λ = 0.5 (similar to sqrt)
        const min = Math.min(...values);
        const offset = min < 0 ? Math.abs(min) + 1 : 1;
        return values.map(v => Math.pow(v + offset, 0.5) - 1);
      
      default:
        return values;
    }
  };

  const handleProcess = async () => {
    if (!dataset || selectedColumns.length === 0) {
      toast.error('Please select at least one column to transform');
      return;
    }

    setIsProcessing(true);
    try {
      const processedData = { ...dataset };
      
      selectedColumns.forEach(column => {
        const values = processedData.data
          .map(row => Number(row[column]))
          .filter(val => !isNaN(val));

        const transformedValues = applyTransformation(values, transformationType);
        
        // Create value mapping for consistent transformation
        const valueMap = new Map<number, number>();
        values.forEach((val, idx) => valueMap.set(val, transformedValues[idx]));

        // Update data with transformed values
        processedData.data = processedData.data.map(row => ({
          ...row,
          [column]: valueMap.get(Number(row[column])) ?? row[column]
        }));
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
          operation: 'mean-median-drift'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      toast.success('Data transformations applied successfully');
      setDataset(processedData);
      
      // Recalculate drift stats
      analyzeDistributions();
    } catch (error) {
      console.error('Error applying transformations:', error);
      toast.error('Failed to apply transformations');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Mean vs Median Drift Analysis"
      description="Identify and handle skewed distributions in your numeric features."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Drift Threshold</h3>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={driftThreshold}
              onChange={(e) => setDriftThreshold(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm font-medium">{driftThreshold}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Columns with drift above this threshold will be highlighted
          </p>
        </div>

        <div>
          <button
            onClick={analyzeDistributions}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Analyze Distributions
          </button>
        </div>

        {driftStats.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Distribution Analysis</h3>
            {driftStats.map((stat) => {
              const isDrifting = stat.drift > driftThreshold;
              return (
                <div
                  key={stat.column}
                  className={`p-4 rounded-lg ${
                    isDrifting ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{stat.column}</h4>
                      <p className="text-sm text-gray-500">
                        Mean: {stat.mean.toFixed(2)} | Median: {stat.median.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Drift: {(stat.drift * 100).toFixed(1)}% | 
                        Skewness: {stat.skewness.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`select-${stat.column}`}
                        checked={selectedColumns.includes(stat.column)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColumns([...selectedColumns, stat.column]);
                          } else {
                            setSelectedColumns(selectedColumns.filter(col => col !== stat.column));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`select-${stat.column}`} className="text-sm text-gray-700">
                        Transform
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedColumns.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Transformation Method</h3>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={transformationType}
                onChange={(e) => setTransformationType(e.target.value as 'log' | 'sqrt' | 'boxcox')}
              >
                <option value="log">Logarithmic</option>
                <option value="sqrt">Square Root</option>
                <option value="boxcox">Box-Cox</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Select the transformation method to reduce skewness
              </p>
            </div>

            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `Transform Selected Features (${selectedColumns.length})`}
            </button>
          </div>
        )}
      </div>
    </BasePreprocessingPage>
  );
}
