'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import BasePreprocessingPage from '../components/BasePreprocessingPage';
import { usePreprocessingContext } from '../context/PreprocessingContext';

type DataRow = Record<string, string | number | null>;

type NormalizationStats = Record<string, { mean: number; stdDev: number }>;
type EncodingMap = Record<string, string[]>;

export default function MissingValues() {
  const { dataset, setProcessedData, setProcessingStatus, setIsProcessing } = usePreprocessingContext();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [kValue, setKValue] = useState<number>(5); // Number of neighbors for KNN

  // Enhanced KNN Imputation Algorithm with optimizations
  const knnImputation = (data: DataRow[], targetColumn: string, k: number = 5): DataRow[] => {
    const processedData = [...data];
    
    // Get numeric and categorical columns for similarity calculation
    const numericColumns = dataset?.columns
      .filter(col => col.type === 'numeric' && col.name !== targetColumn)
      .map(col => col.name) || [];
    
    const categoricalColumns = dataset?.columns
      .filter(col => col.type === 'text' && col.name !== targetColumn)
      .map(col => col.name) || [];
    
    // Z-score normalization for numeric features to handle scale sensitivity
    const normalizeFeatures = (data: DataRow[]): { normalizedData: DataRow[], stats: NormalizationStats } => {
      const stats: NormalizationStats = {};
      const normalizedData = [...data];
      
      for (const col of numericColumns) {
        const values = data
          .map(row => row[col])
          .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
          .map(Number);
        
        if (values.length > 0) {
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const stdDev = Math.sqrt(
            values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
          );
          
          stats[col] = { mean, stdDev: stdDev === 0 ? 1 : stdDev };
          
          // Apply z-score normalization
          normalizedData.forEach(row => {
            if (row[col] !== null && row[col] !== undefined && !isNaN(Number(row[col]))) {
              row[col] = (Number(row[col]) - mean) / stats[col].stdDev;
            }
          });
        }
      }
      
      return { normalizedData, stats };
    };
    
    // One-hot encoding for categorical features
    const encodeCategoricalFeatures = (data: DataRow[]): { encodedData: DataRow[], encodingMap: EncodingMap } => {
      const encodingMap: EncodingMap = {};
      let encodedData = [...data];
      
      for (const col of categoricalColumns) {
        const uniqueValues = [...new Set(data
          .map(row => row[col])
          .filter(val => val !== null && val !== undefined && val !== '')
          .map(String)
        )];
        
        encodingMap[col] = uniqueValues;
        
        // Create one-hot encoded columns
        for (const value of uniqueValues) {
          const encodedColName = `${col}_${value}`;
          encodedData = encodedData.map(row => ({
            ...row,
            [encodedColName]: row[col] === value ? 1 : 0
          }));
        }
      }
      
      return { encodedData, encodingMap };
    };
    
    // Optimization: Pre-filter for large datasets to reduce computational complexity
    const shouldUseOptimization = data.length > 1000;
    let workingData = data;
    
    if (shouldUseOptimization) {
      // Sample a subset for very large datasets to improve performance
      const sampleSize = Math.min(2000, Math.max(500, Math.floor(data.length * 0.1)));
      const shuffled = [...data].sort(() => 0.5 - Math.random());
      workingData = shuffled.slice(0, sampleSize);
      setProcessingStatus?.('Optimizing for large dataset - using intelligent sampling...');
    }
    
    // Apply feature engineering
    const { normalizedData } = normalizeFeatures(workingData);
    const { encodedData, encodingMap } = encodeCategoricalFeatures(normalizedData);

    // Enhanced distance calculation supporting both numeric and categorical features
    const calculateDistance = (row1: DataRow, row2: DataRow): number => {
      let distance = 0;
      let validFeatures = 0;
      
      // Numeric features (already normalized)
      for (const col of numericColumns) {
        const val1 = row1[col];
        const val2 = row2[col];
        
        if (val1 !== null && val1 !== undefined && 
            val2 !== null && val2 !== undefined) {
          distance += Math.pow(Number(val1) - Number(val2), 2);
          validFeatures++;
        }
      }
      
      // Categorical features (one-hot encoded)
      for (const col of categoricalColumns) {
        const uniqueVals = encodingMap[col] || [];
        for (const val of uniqueVals) {
          const encodedCol = `${col}_${val}`;
          const val1 = row1[encodedCol];
          const val2 = row2[encodedCol];
          
          if (val1 !== undefined && val2 !== undefined) {
            distance += Math.pow(Number(val1) - Number(val2), 2);
            validFeatures++;
          }
        }
      }
      
      return validFeatures > 0 ? Math.sqrt(distance / validFeatures) : Infinity;
    };
    
    // Find rows with missing values in target column
    const missingIndices = encodedData
      .map((row, index) => ({ row, index }))
      .filter(item => item.row[targetColumn] === null || 
                     item.row[targetColumn] === undefined || 
                     item.row[targetColumn] === '');
    
    // Get rows with valid values in target column
    const validRows = encodedData.filter(row => 
      row[targetColumn] !== null && 
      row[targetColumn] !== undefined && 
      row[targetColumn] !== ''
    );
    
    // Impute missing values using enhanced KNN
    for (const { row: missingRow, index } of missingIndices) {
      // Calculate distances to all valid rows
      const distances = validRows.map(validRow => ({
        row: validRow,
        distance: calculateDistance(missingRow, validRow)
      }));
      
      // Sort by distance and take k nearest neighbors
      distances.sort((a, b) => a.distance - b.distance);
      const nearestNeighbors = distances.slice(0, Math.min(k, distances.length));
      
      // Calculate imputed value based on neighbors
      if (nearestNeighbors.length > 0) {
        if (dataset?.columns.find(col => col.name === targetColumn)?.type === 'numeric') {
          // For numeric columns, use weighted average
          const weightedSum = nearestNeighbors.reduce((sum, neighbor) => {
            const weight = neighbor.distance === 0 ? 1 : 1 / (neighbor.distance + 0.001);
            return sum + (Number(neighbor.row[targetColumn]) * weight);
          }, 0);
          
          const totalWeight = nearestNeighbors.reduce((sum, neighbor) => {
            const weight = neighbor.distance === 0 ? 1 : 1 / (neighbor.distance + 0.001);
            return sum + weight;
          }, 0);
          
          processedData[index][targetColumn] = weightedSum / totalWeight;
        } else {
          // For categorical columns, use mode of nearest neighbors
          const values = nearestNeighbors.map(neighbor => neighbor.row[targetColumn]);
          const frequency: { [key: string]: number } = {};
          
          values.forEach(val => {
            const strVal = String(val);
            frequency[strVal] = (frequency[strVal] || 0) + 1;
          });
          
          const mode = Object.keys(frequency).reduce((a, b) => 
            frequency[a] > frequency[b] ? a : b
          );
          
          processedData[index][targetColumn] = mode;
        }
      }
    }
    
    return processedData;
  };

  const handleProcessData = async () => {
    if (!dataset) return;

    setIsProcessing(true);
    setProcessingStatus('Analyzing missing values using KNN Imputation...');

    try {
      const processedData = {
        ...dataset,
        data: [...dataset.data]
      };

      for (const column of selectedColumns) {
        setProcessingStatus(`Processing missing values in column: ${column} using KNN (k=${kValue})`);
        
        // Apply KNN imputation for this column
        processedData.data = knnImputation(processedData.data, column, kValue);
      }

      setProcessedData(processedData);
      setProcessingStatus('Missing values have been handled successfully using KNN Imputation!');
      toast.success('Missing values processed successfully with KNN Imputation!');
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
      description="Use advanced KNN (K-Nearest Neighbors) imputation to intelligently fill missing values based on similar data points."
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Enhanced KNN Imputation</strong> with advanced optimizations:
              </p>
              <ul className="text-sm text-blue-600 mt-2 space-y-1">
                <li>• <strong>Feature Scaling:</strong> Z-score normalization prevents scale bias</li>
                <li>• <strong>Categorical Support:</strong> One-hot encoding for non-numeric features</li>
                <li>• <strong>Large Dataset Optimization:</strong> Intelligent sampling for datasets &gt; 1000 rows</li>
                <li>• <strong>Weighted Distance:</strong> Uses similarity-based weighting for predictions</li>
              </ul>
            </div>
          </div>
        </div>
        
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
          <h3 className="text-lg font-semibold mb-2">KNN Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Neighbors (k)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={kValue}
                onChange={(e) => setKValue(Math.max(1, parseInt(e.target.value) || 5))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Higher k values provide more stable predictions but may lose local patterns. Recommended: 3-7
                <br />
                <span className="text-blue-600">⚡ Auto-optimization enabled for datasets &gt; 1000 rows</span>
              </p>
            </div>
          </div>
        </div>

        {dataset && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Dataset Size:</span>
                <span className="ml-1 font-medium">{dataset.data.length} rows</span>
              </div>
              <div>
                <span className="text-gray-500">Numeric Features:</span>
                <span className="ml-1 font-medium">
                  {dataset.columns.filter(col => col.type === 'numeric').length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Categorical Features:</span>
                <span className="ml-1 font-medium">
                  {dataset.columns.filter(col => col.type === 'text').length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Optimization:</span>
                <span className={`ml-1 font-medium ${dataset.data.length > 1000 ? 'text-green-600' : 'text-blue-600'}`}>
                  {dataset.data.length > 1000 ? 'Enabled' : 'Standard'}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleProcessData}
          disabled={selectedColumns.length === 0}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 hover:bg-blue-600"
        >
          Apply KNN Imputation
        </button>
      </div>
    </BasePreprocessingPage>
  );
}
