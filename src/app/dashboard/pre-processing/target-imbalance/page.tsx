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

interface ClassDistribution {
  [key: string]: number;
}

export default function TargetImbalance() {
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [balanceMethod, setBalanceMethod] = useState<string>('undersample');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [distribution, setDistribution] = useState<ClassDistribution | null>(null);

  const calculateDistribution = (data: Record<string, string | number>[], column: string): ClassDistribution => {
    const dist: ClassDistribution = {};
    data.forEach(row => {
      const value = row[column]?.toString() || 'unknown';
      dist[value] = (dist[value] || 0) + 1;
    });
    return dist;
  };

  const handleColumnSelect = (columnName: string) => {
    setTargetColumn(columnName);
    if (dataset) {
      const dist = calculateDistribution(dataset.data, columnName);
      setDistribution(dist);
    }
  };

  const undersampleData = (data: Record<string, string | number>[], column: string): Record<string, string | number>[] => {
    const classCounts = calculateDistribution(data, column);
    const minCount = Math.min(...Object.values(classCounts));
    
    // Group records by class
    const classGroups: { [key: string]: Record<string, string | number>[] } = {};
    data.forEach(row => {
      const classValue = row[column]?.toString() || 'unknown';
      if (!classGroups[classValue]) {
        classGroups[classValue] = [];
      }
      classGroups[classValue].push(row);
    });

    // Randomly sample minCount records from each class
    const balancedData: Record<string, string | number>[] = [];
    Object.values(classGroups).forEach(group => {
      const shuffled = [...group].sort(() => 0.5 - Math.random());
      balancedData.push(...shuffled.slice(0, minCount));
    });

    return balancedData;
  };

  const euclideanDistance = (point1: number[], point2: number[]): number => {
    return Math.sqrt(
      point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0)
    );
  };

  const findKNearestNeighbors = (sample: number[], samples: number[][], k: number = 5): number[][] => {
    const distances = samples.map((s, idx) => ({
      sample: s,
      distance: euclideanDistance(sample, s),
      index: idx
    }));
    
    // Sort by distance and exclude the sample itself
    distances.sort((a, b) => a.distance - b.distance);
    const neighbors = distances.slice(1, k + 1); // Exclude the sample itself
    
    return neighbors.map(n => n.sample);
  };

  const generateSyntheticSample = (sample: number[], neighbor: number[]): number[] => {
    const syntheticSample: number[] = [];
    const lambda = Math.random(); // Random value between 0 and 1
    
    for (let i = 0; i < sample.length; i++) {
      syntheticSample[i] = sample[i] + lambda * (neighbor[i] - sample[i]);
    }
    
    return syntheticSample;
  };

  const smoteOversample = (data: Record<string, string | number>[], column: string): Record<string, string | number>[] => {
    const classCounts = calculateDistribution(data, column);
    const maxCount = Math.max(...Object.values(classCounts));
    
    // Get numeric columns for SMOTE (excluding the target column)
    const numericColumns = dataset?.columns
      .filter(col => col.type === 'numeric' && col.name !== column)
      .map(col => col.name) || [];
    
    if (numericColumns.length === 0) {
      // Fallback to simple oversampling if no numeric columns
      return oversampleData(data, column);
    }

    // Group records by class
    const classGroups: { [key: string]: Record<string, string | number>[] } = {};
    data.forEach(row => {
      const classValue = row[column]?.toString() || 'unknown';
      if (!classGroups[classValue]) {
        classGroups[classValue] = [];
      }
      classGroups[classValue].push(row);
    });

    const balancedData: Record<string, string | number>[] = [...data];

    // Apply SMOTE to minority classes
    Object.entries(classGroups).forEach(([className, classData]) => {
      const currentCount = classData.length;
      const needCount = maxCount - currentCount;
      
      if (needCount <= 0) return; // Skip if already balanced or majority class

      // Convert to numeric vectors for SMOTE
      const numericVectors = classData.map(row => 
        numericColumns.map(col => {
          const val = row[col];
          return typeof val === 'number' ? val : parseFloat(val?.toString() || '0');
        })
      );

      if (numericVectors.length < 2) {
        // Fallback to simple duplication if not enough samples
        for (let i = 0; i < needCount; i++) {
          const randomSample = classData[Math.floor(Math.random() * classData.length)];
          balancedData.push({ ...randomSample });
        }
        return;
      }

      // Generate synthetic samples
      for (let i = 0; i < needCount; i++) {
        // Select random sample from minority class
        const randomIndex = Math.floor(Math.random() * numericVectors.length);
        const selectedSample = numericVectors[randomIndex];
        
        // Find k nearest neighbors
        const neighbors = findKNearestNeighbors(selectedSample, numericVectors, 5);
        
        if (neighbors.length > 0) {
          // Select random neighbor
          const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
          
          // Generate synthetic sample
          const syntheticVector = generateSyntheticSample(selectedSample, randomNeighbor);
          
          // Create new record with synthetic numeric values and original categorical values
          const originalRecord = classData[randomIndex];
          const syntheticRecord: Record<string, string | number> = { ...originalRecord };
          
          numericColumns.forEach((col, idx) => {
            syntheticRecord[col] = syntheticVector[idx];
          });
          
          balancedData.push(syntheticRecord);
        }
      }
    });

    return balancedData;
  };

  const oversampleData = (data: Record<string, string | number>[], column: string): Record<string, string | number>[] => {
    const classCounts = calculateDistribution(data, column);
    const maxCount = Math.max(...Object.values(classCounts));
    
    // Group records by class
    const classGroups: { [key: string]: Record<string, string | number>[] } = {};
    data.forEach(row => {
      const classValue = row[column]?.toString() || 'unknown';
      if (!classGroups[classValue]) {
        classGroups[classValue] = [];
      }
      classGroups[classValue].push(row);
    });

    // Oversample each class to match the majority class
    const balancedData: Record<string, string | number>[] = [];
    Object.entries(classGroups).forEach(([_, group]) => {
      while (group.length < maxCount) {
        // Add random copies from the same class
        const randomIndex = Math.floor(Math.random() * group.length);
        group.push({ ...group[randomIndex] });
      }
      balancedData.push(...group);
    });

    return balancedData;
  };

  const handleProcess = async () => {
    if (!dataset || !targetColumn) {
      toast.error('Please select a target column');
      return;
    }

    setIsProcessing(true);
    try {
      const processedData = { ...dataset };
      
      if (balanceMethod === 'undersample') {
        processedData.data = undersampleData(dataset.data, targetColumn);
      } else {
        processedData.data = smoteOversample(dataset.data, targetColumn);
      }

      // Save processed data
      const response = await fetch('/api/datasets/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId: dataset._id,
          processedData,
          operation: 'target-imbalance'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      const newDist = calculateDistribution(processedData.data, targetColumn);
      setDistribution(newDist);
      setDataset(processedData);
      toast.success('Target classes balanced successfully');
    } catch (error) {
      console.error('Error balancing target classes:', error);
      toast.error('Failed to balance target classes');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Balance Target Classes"
      description="Handle imbalanced classes in your target variable using undersampling or SMOTE oversampling techniques."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Target Column</h3>
          <p className="text-sm text-gray-500 mb-4">Choose the column containing class labels</p>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={targetColumn}
            onChange={(e) => handleColumnSelect(e.target.value)}
          >
            <option value="">Select a column</option>
            {dataset?.columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </div>

        {distribution && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Current Class Distribution</h4>
            <div className="space-y-2">
              {Object.entries(distribution).map(([className, count]) => (
                <div key={className} className="flex justify-between">
                  <span className="text-sm">{className}:</span>
                  <span className="text-sm font-medium">{count} records</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Balance Method</h3>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={balanceMethod}
            onChange={(e) => setBalanceMethod(e.target.value)}
          >
            <option value="undersample">Undersampling (reduce majority class)</option>
            <option value="oversample">SMOTE Oversampling (generate synthetic samples)</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {balanceMethod === 'undersample' 
              ? 'Reduces majority classes to match the minority class size'
              : 'Uses SMOTE to generate synthetic samples for minority classes based on nearest neighbors'}
          </p>
        </div>

        <div>
          <button
            onClick={handleProcess}
            disabled={isProcessing || !targetColumn}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Balance Classes'}
          </button>
        </div>
      </div>
    </BasePreprocessingPage>
  );
}