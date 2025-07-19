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

interface VarianceStats {
  column: string;
  variance: number;
  std: number;
  uniqueCount: number;
  totalCount: number;
  uniqueRatio: number;
}

export default function LowVariance() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [varianceStats, setVarianceStats] = useState<VarianceStats[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [varianceThreshold, setVarianceThreshold] = useState<number>(0.01);
  const [uniqueRatioThreshold, setUniqueRatioThreshold] = useState<number>(0.01);

  const calculateVarianceStats = (data: Record<string, string | number>[], column: string): VarianceStats => {
    const values = data.map(row => row[column]);
    const uniqueValues = new Set(values);
    
    // For numeric columns, calculate variance and std
    const numericValues = values
      .map(val => Number(val))
      .filter(val => !isNaN(val));

    if (numericValues.length > 0) {
      const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
      const std = Math.sqrt(variance);

      return {
        column,
        variance,
        std,
        uniqueCount: uniqueValues.size,
        totalCount: values.length,
        uniqueRatio: uniqueValues.size / values.length
      };
    }

    // For non-numeric columns, use unique ratio as variance measure
    return {
      column,
      variance: uniqueValues.size / values.length,
      std: Math.sqrt(uniqueValues.size / values.length),
      uniqueCount: uniqueValues.size,
      totalCount: values.length,
      uniqueRatio: uniqueValues.size / values.length
    };
  };

  const analyzeVariance = () => {
    if (!dataset) return;

    const stats: VarianceStats[] = dataset.columns.map(col => 
      calculateVarianceStats(dataset.data, col.name)
    );

    setVarianceStats(stats.sort((a, b) => a.variance - b.variance));
  };

  const handleProcess = async () => {
    if (!dataset || selectedColumns.length === 0) {
      toast.error('Please select at least one column to remove');
      return;
    }

    setIsProcessing(true);
    try {
      const processedData = { ...dataset };
      
      // Remove selected low-variance columns
      processedData.columns = processedData.columns.filter(
        col => !selectedColumns.includes(col.name)
      );

      // Remove column data
      processedData.data = processedData.data.map(row => {
        const newRow = { ...row };
        selectedColumns.forEach(col => delete newRow[col]);
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
          operation: 'low-variance'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      toast.success('Low variance features removed successfully');
      setDataset(processedData);
      setVarianceStats([]);
      setSelectedColumns([]);
    } catch (error) {
      console.error('Error removing low variance features:', error);
      toast.error('Failed to remove features');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Low Variance Features"
      description="Identify and remove features with low variance or near-constant values."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Variance Threshold</h3>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.001"
                value={varianceThreshold}
                onChange={(e) => setVarianceThreshold(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm font-medium">{varianceThreshold}</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unique Ratio Threshold</h3>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.001"
                value={uniqueRatioThreshold}
                onChange={(e) => setUniqueRatioThreshold(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm font-medium">{uniqueRatioThreshold}</span>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={analyzeVariance}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Analyze Variance
          </button>
        </div>

        {varianceStats.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Feature Analysis</h3>
            {varianceStats.map((stat) => {
              const isLowVariance = stat.variance < varianceThreshold || 
                                  stat.uniqueRatio < uniqueRatioThreshold;
              return (
                <div
                  key={stat.column}
                  className={`p-4 rounded-lg ${
                    isLowVariance ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{stat.column}</h4>
                      <p className="text-sm text-gray-500">
                        Variance: {stat.variance.toFixed(4)} | 
                        Std: {stat.std.toFixed(4)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Unique Values: {stat.uniqueCount} / {stat.totalCount} 
                        ({(stat.uniqueRatio * 100).toFixed(1)}%)
                      </p>
                    </div>
                    {isLowVariance && (
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
                          Remove
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedColumns.length > 0 && (
          <div>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `Remove Selected Features (${selectedColumns.length})`}
            </button>
          </div>
        )}
      </div>
    </BasePreprocessingPage>
  );
}
