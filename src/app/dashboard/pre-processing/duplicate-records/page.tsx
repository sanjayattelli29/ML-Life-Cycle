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

export default function DuplicateRecords() {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [keepStrategy, setKeepStrategy] = useState<string>('first');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);

  const findDuplicates = (data: Record<string, string | number>[], columns: string[]): Set<number> => {
    const seen = new Map<string, number>();
    const duplicates = new Set<number>();

    data.forEach((row, index) => {
      const key = columns
        .map(col => row[col]?.toString() || '')
        .join('|');

      if (seen.has(key)) {
        duplicates.add(index);
      } else {
        seen.set(key, index);
      }
    });

    return duplicates;
  };

  const handleProcess = async () => {
    if (!dataset || selectedColumns.length === 0) {
      toast.error('Please select at least one column');
      return;
    }

    setIsProcessing(true);
    try {
      // Find duplicate indices
      const duplicateIndices = findDuplicates(dataset.data, selectedColumns);
      setDuplicateCount(duplicateIndices.size);

      if (duplicateIndices.size === 0) {
        toast.success('No duplicates found in the selected columns');
        setIsProcessing(false);
        return;
      }

      const processedData = { ...dataset };
      const uniqueMap = new Map<string, number>();

      // Create a map of unique records based on selected columns
      dataset.data.forEach((row, index) => {
        const key = selectedColumns
          .map(col => row[col]?.toString() || '')
          .join('|');

        if (keepStrategy === 'first' && !uniqueMap.has(key)) {
          uniqueMap.set(key, index);
        } else if (keepStrategy === 'last') {
          uniqueMap.set(key, index);
        }
      });

      // Filter data to keep only unique records
      processedData.data = dataset.data.filter((_, index) => 
        Array.from(uniqueMap.values()).includes(index)
      );

      // Save processed data
      const response = await fetch('/api/datasets/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId: dataset._id,
          processedData,
          operation: 'duplicate-records'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      toast.success(`Removed ${duplicateIndices.size} duplicate records`);
      setDataset(processedData);
    } catch (error) {
      console.error('Error processing duplicates:', error);
      toast.error('Failed to process duplicate records');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Remove Duplicate Records"
      description="Identify and remove duplicate records based on selected columns."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Columns for Comparison</h3>
          <p className="text-sm text-gray-500 mb-4">
            Choose the columns to consider when identifying duplicate records. 
            Records with the same values in all selected columns will be considered duplicates.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dataset?.columns.map((column) => (
              <div key={column.name} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={column.name}
                  value={column.name}
                  checked={selectedColumns.includes(column.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedColumns([...selectedColumns, column.name]);
                    } else {
                      setSelectedColumns(selectedColumns.filter(col => col !== column.name));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={column.name} className="text-sm text-gray-700">
                  {column.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Duplicate Handling Strategy</h3>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={keepStrategy}
            onChange={(e) => setKeepStrategy(e.target.value)}
          >
            <option value="first">Keep First Occurrence</option>
            <option value="last">Keep Last Occurrence</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Choose which record to keep when duplicates are found
          </p>
        </div>

        {duplicateCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              Found {duplicateCount} duplicate records based on selected columns
            </p>
          </div>
        )}

        <div>
          <button
            onClick={handleProcess}
            disabled={isProcessing || selectedColumns.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Remove Duplicates'}
          </button>
        </div>
      </div>
    </BasePreprocessingPage>
  );
}
