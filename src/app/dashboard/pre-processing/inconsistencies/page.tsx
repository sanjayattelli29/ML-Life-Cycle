'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import BasePreprocessingPage from '../components/BasePreprocessingPage';
import { usePreprocessingContext } from '../context/PreprocessingContext';

interface Inconsistency {
  column: string;
  value: string;
  count: number;
  standardized: string;
  pattern: string;
}

export default function Inconsistencies() {
  const { dataset, setProcessedData, setProcessingStatus, setIsProcessing } = usePreprocessingContext();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [isProcessing, setLocalIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Dynamic pattern detection - adapts to any data format
  const detectPatternType = (value: string): { type: string; pattern: RegExp | null; confidence: number } => {
    const trimmedValue = value.trim();
    
    // Phone-like patterns (any sequence with digits, spaces, dashes, parentheses)
    if (/^[\d\s\-\(\)\+\.]{7,}$/.test(trimmedValue) && /\d{3,}/.test(trimmedValue)) {
      return { type: 'Phone-like', pattern: /^[\d\s\-\(\)\+\.]+$/, confidence: 0.8 };
    }
    
    // Email-like patterns
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
      return { type: 'Email-like', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, confidence: 0.9 };
    }
    
    // Date-like patterns (various separators and formats)
    if (/^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})$/.test(trimmedValue) || /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return { type: 'Date-like', pattern: /^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})$|^\d{4}-\d{2}-\d{2}$/, confidence: 0.85 };
    }
    
    // Currency-like patterns (numbers with currency symbols)
    if (/^[\$\€\£\¥\₹]?[\d,\s]+\.?\d*$|^\d+\.?\d*\s?[\$\€\£\¥\₹]$/.test(trimmedValue)) {
      return { type: 'Currency-like', pattern: /^[\$\€\£\¥\₹]?[\d,\s]+\.?\d*$|^\d+\.?\d*\s?[\$\€\£\¥\₹]$/, confidence: 0.7 };
    }
    
    // Numeric patterns with separators
    if (/^[\d,\s]+\.?\d*$/.test(trimmedValue) && (trimmedValue.includes(',') || trimmedValue.includes(' '))) {
      return { type: 'Numeric-formatted', pattern: /^[\d,\s]+\.?\d*$/, confidence: 0.6 };
    }
    
    // Code-like patterns (letters and numbers with separators)
    if (/^[A-Za-z0-9\-\s]{3,}$/.test(trimmedValue) && /[A-Za-z]/.test(trimmedValue) && /\d/.test(trimmedValue)) {
      return { type: 'Code-like', pattern: /^[A-Za-z0-9\-\s]+$/, confidence: 0.5 };
    }
    
    // Name-like patterns (alphabetic with common separators)
    if (/^[A-Za-z\s\-\'\.]+$/.test(trimmedValue) && trimmedValue.length > 2) {
      return { type: 'Name-like', pattern: /^[A-Za-z\s\-\'\.]+$/, confidence: 0.4 };
    }
    
    // Boolean-like patterns
    if (/^(yes|no|true|false|y|n|1|0|on|off|enabled|disabled)$/i.test(trimmedValue)) {
      return { type: 'Boolean-like', pattern: /^(yes|no|true|false|y|n|1|0|on|off|enabled|disabled)$/i, confidence: 0.9 };
    }
    
    // URL-like patterns
    if (/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i.test(trimmedValue)) {
      return { type: 'URL-like', pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i, confidence: 0.8 };
    }
    
    return { type: 'Text', pattern: null, confidence: 0.1 };
  };

  // Generic standardization based on detected patterns
  const standardizeValue = (value: string, patternType: string): string => {
    const trimmedValue = value.trim();
    
    switch (patternType) {
      case 'Phone-like':
        const phoneClean = trimmedValue.replace(/[\s\-\(\)\+\.]/g, '');
        if (phoneClean.length === 10) return `(${phoneClean.slice(0,3)}) ${phoneClean.slice(3,6)}-${phoneClean.slice(6)}`;
        if (phoneClean.length === 11 && phoneClean.startsWith('1')) {
          const number = phoneClean.slice(1);
          return `+1 (${number.slice(0,3)}) ${number.slice(3,6)}-${number.slice(6)}`;
        }
        return phoneClean;
        
      case 'Email-like':
        return trimmedValue.toLowerCase();
        
      case 'Date-like':
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) return trimmedValue;
        const match = trimmedValue.match(/^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})$/);
        if (match) {
          const [, part1, part2, part3] = match;
          if (part1.length === 4) return `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
          if (part3.length === 4) return `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        return trimmedValue;
        
      case 'Currency-like':
        const currencyClean = trimmedValue.replace(/[^\d\.]/g, '');
        const number = parseFloat(currencyClean);
        return isNaN(number) ? trimmedValue : `$${number.toFixed(2)}`;
        
      case 'Numeric-formatted':
        const numericClean = trimmedValue.replace(/[,\s]/g, '');
        const num = parseFloat(numericClean);
        return isNaN(num) ? trimmedValue : num.toString();
        
      case 'Code-like':
        return trimmedValue.toUpperCase().replace(/\s+/g, '-');
        
      case 'Name-like':
        return trimmedValue.toLowerCase()
          .split(' ')
          .map(word => {
            if (word.includes("'")) {
              return word.split("'").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("'");
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
          })
          .join(' ');
          
      case 'Boolean-like':
        const normalized = trimmedValue.toLowerCase();
        if (['yes', 'y', 'true', '1', 'on', 'enabled'].includes(normalized)) return 'true';
        if (['no', 'n', 'false', '0', 'off', 'disabled'].includes(normalized)) return 'false';
        return trimmedValue;
        
      case 'URL-like':
        let url = trimmedValue.toLowerCase();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        return url;
        
      default:
        // Generic text standardization - remove extra spaces, normalize case
        return trimmedValue.replace(/\s+/g, ' ');
    }
  };

  const findInconsistentFormats = (values: string[]): Inconsistency[] => {
    const inconsistencies: Inconsistency[] = [];
    const frequency: Record<string, number> = {};
    
    // Filter out null, undefined, empty values, and calculate frequency
    const cleanValues = values.filter(val => val !== null && val !== undefined && val.toString().trim() !== '');
    
    cleanValues.forEach(val => {
      const stringVal = val.toString().trim();
      frequency[stringVal] = (frequency[stringVal] || 0) + 1;
    });

    // Skip if we have less than 2 unique values
    if (Object.keys(frequency).length < 2) return inconsistencies;

    // Group values by their detected pattern and standardized format
    const standardizedGroups: Record<string, { 
      values: string[], 
      pattern: string, 
      confidence: number,
      originalTypes: Set<string>
    }> = {};

    Object.keys(frequency).forEach(value => {
      // Detect what type of pattern this value matches
      const detectedPattern = detectPatternType(value);
      
      // Only process if we have reasonable confidence in the pattern
      if (detectedPattern.confidence > 0.3) {
        const standardized = standardizeValue(value, detectedPattern.type);
        
        // Only suggest standardization if the value actually changes
        if (standardized !== value) {
          const groupKey = `${detectedPattern.type}:${standardized}`;
          
          if (!standardizedGroups[groupKey]) {
            standardizedGroups[groupKey] = {
              values: [],
              pattern: detectedPattern.type,
              confidence: detectedPattern.confidence,
              originalTypes: new Set()
            };
          }
          
          standardizedGroups[groupKey].values.push(value);
          standardizedGroups[groupKey].originalTypes.add(detectedPattern.type);
        }
      }
    });

    // Find groups with multiple original formats (indicating inconsistencies)
    Object.entries(standardizedGroups).forEach(([groupKey, group]) => {
      if (group.values.length > 0) {
        const standardized = groupKey.split(':').slice(1).join(':'); // Remove type prefix
        
        // Sort by frequency to prioritize the most common variant
        const sortedValues = group.values.sort((a, b) => frequency[b] - frequency[a]);
        
        sortedValues.forEach(originalValue => {
          inconsistencies.push({
            column: selectedColumns[0],
            value: originalValue,
            count: frequency[originalValue],
            standardized: standardized,
            pattern: group.pattern
          });
        });
      }
    });

    // Advanced inconsistency detection: Look for similar patterns
    detectSimilarPatterns(frequency, inconsistencies);

    // Sort inconsistencies by count (most frequent first) for better UX
    return inconsistencies.sort((a, b) => b.count - a.count);
  };

  // Detect similar patterns that might be inconsistent (e.g., different casings, spacing)
  const detectSimilarPatterns = (frequency: Record<string, number>, inconsistencies: Inconsistency[]) => {
    const values = Object.keys(frequency);
    const processedPairs = new Set<string>();

    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const val1 = values[i];
        const val2 = values[j];
        const pairKey = [val1, val2].sort().join('|');
        
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const similarity = calculateSimilarity(val1, val2);
        
        // If values are very similar (likely same data in different formats)
        if (similarity > 0.7) {
          const moreFrequent = frequency[val1] >= frequency[val2] ? val1 : val2;
          const lessFrequent = frequency[val1] < frequency[val2] ? val1 : val2;
          
          // Suggest standardizing to the more frequent format
          if (!inconsistencies.some(inc => inc.value === lessFrequent)) {
            inconsistencies.push({
              column: selectedColumns[0],
              value: lessFrequent,
              count: frequency[lessFrequent],
              standardized: moreFrequent,
              pattern: 'Similar Format'
            });
          }
        }
      }
    }
  };

  // Calculate similarity between two strings using Levenshtein distance
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');
    
    if (s1 === s2) return 1;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance calculation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const findInconsistencies = () => {
    if (!dataset || selectedColumns.length === 0) {
      toast.error('Please select a dataset and column');
      return;
    }

    const column = selectedColumns[0];
    
    // Validate that the column exists in the dataset
    if (!dataset.columns.find(col => col.name === column)) {
      toast.error('Selected column not found in dataset');
      return;
    }

    try {
      setProcessingStatus('Analyzing column data...');
      
      const values = dataset.data
        .map(row => row[column]?.toString() || '')
        .filter(val => val.trim() !== '');

      if (values.length === 0) {
        toast.error('No data found in the selected column');
        setProcessingStatus('');
        return;
      }

      if (values.length < 2) {
        toast.error('Need at least 2 values to detect inconsistencies');
        setProcessingStatus('');
        return;
      }

      setProcessingStatus('Detecting patterns and inconsistencies...');
      
      // Use setTimeout to allow UI to update
      setTimeout(() => {
        try {
          const found = findInconsistentFormats(values);
          
          if (found.length === 0) {
            toast.success('No format inconsistencies found in this column');
          } else {
            toast.success(`Found ${found.length} format inconsistencies that can be standardized`);
          }
          
          setInconsistencies(found);
        } catch (error) {
          console.error('Error in pattern detection:', error);
          toast.error('Error occurred while analyzing patterns');
        } finally {
          setProcessingStatus('');
        }
      }, 100);
      
    } catch (error) {
      console.error('Error finding inconsistencies:', error);
      toast.error('Error occurred while analyzing the data');
      setProcessingStatus('');
    }
  };

  const handleAddReplacement = (original: string, replacement: string) => {
    setReplacements(prev => ({
      ...prev,
      [original]: replacement
    }));
    toast.success(`Added replacement: ${original} → ${replacement}`);
  };

  const handleRemoveReplacement = (original: string) => {
    setReplacements(prev => {
      const newReplacements = { ...prev };
      delete newReplacements[original];
      return newReplacements;
    });
    toast.success(`Removed replacement for: ${original}`);
  };

  const getColumnStats = () => {
    if (!dataset || selectedColumns.length === 0) return null;
    
    const column = selectedColumns[0];
    const values = dataset.data
      .map(row => row[column]?.toString() || '')
      .filter(val => val.trim() !== '');
    
    const uniqueValues = new Set(values);
    
    // Analyze pattern diversity
    const patternTypes = new Set();
    values.forEach(value => {
      const pattern = detectPatternType(value);
      if (pattern.confidence > 0.3) {
        patternTypes.add(pattern.type);
      }
    });
    
    return {
      totalValues: values.length,
      uniqueValues: uniqueValues.size,
      nullValues: dataset.data.length - values.length,
      duplicateValues: values.length - uniqueValues.size,
      detectedPatterns: Array.from(patternTypes).join(', ') || 'Mixed/Text'
    };
  };

  // Auto-suggest column type based on analysis
  const getColumnTypeRecommendation = () => {
    if (!dataset || selectedColumns.length === 0) return null;
    
    const column = selectedColumns[0];
    const values = dataset.data
      .map(row => row[column]?.toString() || '')
      .filter(val => val.trim() !== '')
      .slice(0, 100); // Sample first 100 values for performance
    
    const patternCounts: Record<string, number> = {};
    
    values.forEach(value => {
      const pattern = detectPatternType(value);
      if (pattern.confidence > 0.3) {
        patternCounts[pattern.type] = (patternCounts[pattern.type] || 0) + 1;
      }
    });
    
    const dominantPattern = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (dominantPattern && dominantPattern[1] > values.length * 0.6) {
      return dominantPattern[0];
    }
    
    return 'Mixed';
  };

  const handleProcess = async () => {
    if (!dataset || Object.keys(replacements).length === 0) {
      toast.error('Please select replacements for inconsistent values');
      return;
    }

    setLocalIsProcessing(true);
    setIsProcessing(true);
    setProcessingStatus('Applying standardization to inconsistent formats...');
    
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

      setProcessedData(processedData);
      toast.success('Inconsistencies resolved successfully');
      setInconsistencies([]);
      setReplacements({});
    } catch (error) {
      console.error('Error resolving inconsistencies:', error);
      toast.error('Failed to resolve inconsistencies');
    } finally {
      setLocalIsProcessing(false);
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <BasePreprocessingPage
      title="Smart Inconsistency Detection"
      description="AI-powered detection and standardization of inconsistent formats in any dataset. The system automatically learns patterns and suggests standardizations for any data type."
    >
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">🤖 Intelligent Data Standardization</h3>
          <p className="text-sm text-gray-600 mb-3">
            This tool automatically detects and standardizes inconsistent formats in any type of data. 
            It learns patterns from your data and suggests the best standardization approach.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <strong className="text-blue-700">Handles any format:</strong>
              <div className="text-gray-600 mt-1">
                • Dates: 01/15/2023 → 2023-01-15<br/>
                • Phone: (555) 123 4567 → (555) 123-4567<br/>
                • Names: john DOE → John Doe<br/>
                • Codes: abc-123 → ABC-123
              </div>
            </div>
            <div>
              <strong className="text-blue-700">Smart detection:</strong>
              <div className="text-gray-600 mt-1">
                • Similar values with different formatting<br/>
                • Mixed case inconsistencies<br/>
                • Spacing and punctuation variations<br/>
                • Custom business codes and IDs
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Column</h3>
          <p className="text-sm text-gray-500 mb-4">Choose a column to check for format inconsistencies</p>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedColumns[0] || ''}
            onChange={(e) => {
              setSelectedColumns([e.target.value]);
              setInconsistencies([]);
              setReplacements({});
            }}
          >
            <option value="">Select a column</option>
            {dataset?.columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name} ({column.type})
              </option>
            ))}
          </select>
        </div>

        {selectedColumns.length > 0 && getColumnStats() && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-blue-900 mb-2">Column Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Total Values:</span>
                <span className="ml-2">{getColumnStats()?.totalValues}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Unique Values:</span>
                <span className="ml-2">{getColumnStats()?.uniqueValues}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Null/Empty:</span>
                <span className="ml-2">{getColumnStats()?.nullValues}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Duplicates:</span>
                <span className="ml-2">{getColumnStats()?.duplicateValues}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-blue-600 font-medium">Detected Patterns:</span>
                <span className="ml-2">{getColumnStats()?.detectedPatterns}</span>
              </div>
              {getColumnTypeRecommendation() && getColumnTypeRecommendation() !== 'Mixed' && (
                <div className="md:col-span-3">
                  <span className="text-blue-600 font-medium">Recommended Type:</span>
                  <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    {getColumnTypeRecommendation()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedColumns.length > 0 && (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>How it works:</strong> Our AI system will automatically detect patterns in your data and identify inconsistent formats. 
                It works with any data type including dates, phone numbers, emails, names, codes, and more - no manual configuration needed!
              </p>
            </div>
            <button
              onClick={findInconsistencies}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              🔍 Smart Pattern Analysis & Inconsistency Detection
            </button>
          </div>
        )}

        {inconsistencies.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Found Format Inconsistencies</h3>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {inconsistencies.length} inconsistencies found
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Review the suggestions below and select which standardizations to apply. 
              The system has automatically detected patterns and suggested standardized formats.
            </p>
            {inconsistencies.map((inc, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">&ldquo;{inc.value}&rdquo;</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                        {inc.pattern}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">({inc.count} occurrences in dataset)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 p-3 bg-green-50 rounded border">
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Suggested standardized format: </span>
                    <span className="font-medium text-green-700">&ldquo;{inc.standardized}&rdquo;</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddReplacement(inc.value, inc.standardized)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        replacements[inc.value] === inc.standardized
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                      }`}
                    >
                      {replacements[inc.value] === inc.standardized ? '✓ Selected' : 'Select'}
                    </button>
                    {replacements[inc.value] === inc.standardized && (
                      <button
                        onClick={() => handleRemoveReplacement(inc.value)}
                        className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(replacements).length > 0 && (
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900">Selected Standardizations</h4>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {Object.keys(replacements).length} replacements
              </span>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg mb-4 space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(replacements).map(([original, replacement]) => (
                <div key={original} className="text-sm flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <span className="text-gray-600">&ldquo;{original}&rdquo;</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-blue-700 font-medium">&ldquo;{replacement}&rdquo;</span>
                  </div>
                  <button
                    onClick={() => handleRemoveReplacement(original)}
                    className="ml-2 text-red-500 hover:text-red-700 text-xs"
                    title="Remove this replacement"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                {showPreview ? 'Hide Preview' : 'Preview Changes'}
              </button>
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Apply Standardizations'
                )}
              </button>
              <button
                onClick={() => setReplacements({})}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            {showPreview && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Preview: What will change</h5>
                <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                  {dataset && Object.entries(replacements).map(([original, replacement]) => {
                    const affectedCount = dataset.data.filter(row => 
                      row[selectedColumns[0]]?.toString() === original
                    ).length;
                    return (
                      <div key={original} className="flex justify-between">
                        <span>{affectedCount} cells: &ldquo;{original}&rdquo; → &ldquo;{replacement}&rdquo;</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-blue-600">
                  Total changes: {Object.keys(replacements).reduce((sum, original) => {
                    return sum + (dataset?.data.filter(row => 
                      row[selectedColumns[0]]?.toString() === original
                    ).length || 0);
                  }, 0)} cells will be updated
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BasePreprocessingPage>
  );
}