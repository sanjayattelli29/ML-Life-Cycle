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

interface TypeConversion {
  column: string;
  targetType: 'numeric' | 'text' | 'date';
  format?: string;
}

export default function DataTypeMismatch() {
  const [conversions, setConversions] = useState<TypeConversion[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const detectDataType = (value: any): 'numeric' | 'text' | 'date' => {
    if (value === null || value === undefined || value === '') return 'text';
    
    // Check if numeric
    if (!isNaN(Number(value))) return 'numeric';
    
    // Check if date
    const date = new Date(value);
    if (date instanceof Date && !isNaN(date.getTime())) return 'date';
    
    return 'text';
  };

  const convertValue = (value: any, targetType: 'numeric' | 'text' | 'date', format?: string): string | number => {
    if (value === null || value === undefined || value === '') return '';

    try {
      switch (targetType) {
        case 'numeric':
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        
        case 'date':
          const date = new Date(value);
          if (format === 'iso') return date.toISOString();
          if (format === 'unix') return date.getTime();
          return date.toISOString().split('T')[0];
        
        case 'text':
          return String(value);
        
        default:
          return value;
      }
    } catch (error) {
      console.error('Conversion error:', error);
      return '';
    }
  };

  const handleAddConversion = (column: Column) => {
    if (!conversions.find(conv => conv.column === column.name)) {
      setConversions([...conversions, {
        column: column.name,
        targetType: column.type,
        format: column.type === 'date' ? 'iso' : undefined
      }]);
    }
  };

  const handleRemoveConversion = (columnName: string) => {
    setConversions(conversions.filter(conv => conv.column !== columnName));
  };

  const handleProcess = async () => {
    if (!dataset || conversions.length === 0) {
      toast.error('Please select at least one column for conversion');
      return;
    }

    setIsProcessing(true);
    try {
      const processedData = { ...dataset };
      
      // Apply conversions
      processedData.data = processedData.data.map(row => {
        const newRow = { ...row };
        conversions.forEach(conv => {
          newRow[conv.column] = convertValue(row[conv.column], conv.targetType, conv.format);
        });
        return newRow;
      });

      // Update column types
      processedData.columns = processedData.columns.map(col => {
        const conversion = conversions.find(conv => conv.column === col.name);
        return conversion ? { ...col, type: conversion.targetType } : col;
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
          operation: 'data-type-mismatch'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save processed data');
      }

      toast.success('Data types converted successfully');
      setDataset(processedData);
    } catch (error) {
      console.error('Error converting data types:', error);
      toast.error('Failed to convert data types');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BasePreprocessingPage
      title="Fix Data Type Mismatches"
      description="Convert columns to the correct data type and ensure consistency across your dataset."
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Columns to Convert</h3>
          <p className="text-sm text-gray-500 mb-4">Choose columns and their target data types</p>
          
          <div className="space-y-4">
            {dataset?.columns.map((column) => (
              <div key={column.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{column.name}</h4>
                  <p className="text-sm text-gray-500">Current type: {column.type}</p>
                </div>
                
                {conversions.find(conv => conv.column === column.name) ? (
                  <div className="flex items-center space-x-4">
                    <select
                      className="p-2 border border-gray-300 rounded-md"
                      value={conversions.find(conv => conv.column === column.name)?.targetType}
                      onChange={(e) => {
                        setConversions(conversions.map(conv =>
                          conv.column === column.name
                            ? { ...conv, targetType: e.target.value as 'numeric' | 'text' | 'date' }
                            : conv
                        ));
                      }}
                    >
                      <option value="numeric">Numeric</option>
                      <option value="text">Text</option>
                      <option value="date">Date</option>
                    </select>
                    
                    {conversions.find(conv => conv.column === column.name)?.targetType === 'date' && (
                      <select
                        className="p-2 border border-gray-300 rounded-md"
                        value={conversions.find(conv => conv.column === column.name)?.format}
                        onChange={(e) => {
                          setConversions(conversions.map(conv =>
                            conv.column === column.name
                              ? { ...conv, format: e.target.value }
                              : conv
                          ));
                        }}
                      >
                        <option value="iso">ISO Format</option>
                        <option value="date">Date Only</option>
                        <option value="unix">Unix Timestamp</option>
                      </select>
                    )}
                    
                    <button
                      onClick={() => handleRemoveConversion(column.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddConversion(column)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Conversion
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <button
            onClick={handleProcess}
            disabled={isProcessing || conversions.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Convert Data Types'}
          </button>
        </div>
      </div>
    </BasePreprocessingPage>
  );
}
