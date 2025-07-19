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
        processedData.data = oversampleData(dataset.data, targetColumn);
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
      description="Handle imbalanced classes in your target variable using undersampling or oversampling techniques."
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
            <option value="oversample">Oversampling (increase minority class)</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {balanceMethod === 'undersample' 
              ? 'Reduces majority classes to match the minority class size'
              : 'Increases minority classes to match the majority class size'}
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
