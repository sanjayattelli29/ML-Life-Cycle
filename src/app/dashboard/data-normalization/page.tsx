 'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import {
  Target,
  Database,
  Download,
  Calendar,
  FileText,
  Trash2,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Play,
  CheckCircle,
  Star
} from 'lucide-react';

interface TransformedDataset {
  id: string;
  originalName: string;
  transformedName: string;
  url: string;
  fileSize: number;
  rowCount?: number;
  columnCount?: number;
  processingSteps: string[];
  uploadedAt: string;
  preprocessingReport?: Record<string, unknown>;
}

interface DataPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  sampleSize: number;
}

interface ColumnStats {
  min: string;
  max: string;
  mean: string;
  median: string;
  count: number;
  nonNumericCount: number;
  isNumeric: boolean;
}

export default function DataNormalization() {
  const { data: session } = useSession();
  const [datasets, setDatasets] = useState<TransformedDataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<TransformedDataset | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const fetchDatasets = React.useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsRefreshing(true);
      console.log('Fetching normalization datasets from R2 for user:', session.user.id);
      const response = await fetch('/api/normalization-datasets');
      
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      
      const data = await response.json();
      console.log('Normalization datasets response:', data);
      setDatasets(data.datasets || []);
      setError('');
    } catch (err) {
      console.error('Fetch normalization datasets error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch datasets');
      toast.error('Failed to load datasets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleDelete = async (_datasetId: string) => {
    // Disabled for R2-only storage - can be implemented later if needed
    toast.error('Delete functionality temporarily disabled for R2-only storage');
    return;
  };

  const handleDownload = async (dataset: TransformedDataset) => {
    try {
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      const csvText = await response.text();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.transformedName}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download started!');
    } catch (err) {
      toast.error('Failed to download dataset');
      console.error('Download error:', err);
    }
  };

  const loadDataPreview = async (dataset: TransformedDataset) => {
    setIsLoadingPreview(true);
    try {
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, { 
        header: false,
        skipEmptyLines: true
      });
      
      if (parsed.errors.length > 0) {
        throw new Error(`Failed to parse CSV: ${parsed.errors[0].message}`);
      }
      
      const allRows = parsed.data as string[][];
      const headers = allRows[0] || [];
      const dataRows = allRows.slice(1);
      const sampleRows = dataRows.slice(0, 10); // Show first 10 rows
      
      setDataPreview({
        headers,
        rows: sampleRows,
        totalRows: dataRows.length,
        sampleSize: sampleRows.length
      });
      
      setShowPreview(true);
    } catch (err) {
      toast.error('Failed to load dataset preview');
      console.error('Preview error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleStartNormalization = () => {
    if (selectedDataset) {
      loadDataPreview(selectedDataset);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your datasets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
            <h2 className="text-lg font-semibold text-gray-800">Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDatasets}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Data Normalization</h1>
                <p className="text-gray-600 mt-1">Normalize and standardize your datasets for better analysis</p>
              </div>
            </div>
            <button
              onClick={fetchDatasets}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {datasets.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Datasets Available</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You need to have processed datasets to normalize. Start by processing a dataset in the Data Transformation section.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span>Go to</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">Data Transformation</span>
              <ArrowRight className="w-4 h-4" />
              <span>Process Dataset</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">Return for Normalization</span>
            </div>
          </div>
        ) : (
          // Dataset Selection and Normalization
          <div className="space-y-6">
            {/* Step 1: Dataset Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Select Dataset for Normalization</h2>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 truncate mr-4">
                    {selectedDataset ? selectedDataset.transformedName : 'Choose a dataset to normalize...'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {datasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        onClick={() => {
                          setSelectedDataset(dataset);
                          setShowDropdown(false);
                          setShowPreview(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-medium text-gray-800 truncate">{dataset.transformedName}</p>
                            <p className="text-sm text-gray-500 truncate">From: {dataset.originalName}</p>
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            {formatFileSize(dataset.fileSize)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Dataset Info (shown when dataset is selected) */}
            {selectedDataset && !showPreview && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <span className="text-green-600 font-bold text-sm">2</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">Dataset Information</h2>
                  </div>
                </div>

                {/* Dataset Info Layout */}
                <div className="border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start justify-between">
                    {/* Left Section - Dataset Info */}
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="bg-blue-100 p-3 rounded-lg flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-lg mb-2 truncate">
                          {selectedDataset.transformedName}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4 truncate">
                          From: {selectedDataset.originalName}
                        </p>
                        
                        {/* Stats in 2 rows */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-600">Size:</span>
                            <span className="font-medium text-blue-600">{formatFileSize(selectedDataset.fileSize)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-gray-600">Dimensions:</span>
                            <span className="font-medium text-purple-600">
                              {selectedDataset.rowCount || 'Unknown'} × {selectedDataset.columnCount || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Processing Steps */}
                        {selectedDataset.processingSteps && selectedDataset.processingSteps.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                              Previous Processing Steps
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {selectedDataset.processingSteps.slice(0, 4).map((step, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                                >
                                  {step.replace(/_/g, ' ')}
                                </span>
                              ))}
                              {selectedDataset.processingSteps.length > 4 && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                                  +{selectedDataset.processingSteps.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Time and Actions */}
                    <div className="flex flex-col items-end space-y-3 flex-shrink-0">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(selectedDataset.uploadedAt)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleDownload(selectedDataset)}
                          className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(selectedDataset.id)}
                          className="flex items-center justify-center p-2 bg-red-100 text-red-600 text-sm font-medium rounded-md hover:bg-red-200 transition-colors"
                          title="Delete dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Start Normalization */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <span className="text-blue-600 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Ready for Normalization</h3>
                        <p className="text-gray-600 text-sm">Preview and normalize your dataset</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleStartNormalization}
                      disabled={isLoadingPreview}
                      className="flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {isLoadingPreview ? 'Loading...' : 'Start Normalization'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Data Preview (shown after clicking normalization) */}
            {showPreview && dataPreview && selectedDataset && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {/* Existing Preview UI */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Dataset Preview</h2>
                      <p className="text-sm text-gray-600">
                        Showing {dataPreview.sampleSize} of {dataPreview.totalRows} rows • {dataPreview.headers.length} columns
                      </p>
                    </div>
                  </div>
                </div>
                {/* CSV Table Preview */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {dataPreview.headers.map((header, index) => (
                            <th
                              key={index}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dataPreview.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                              >
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Note about preview */}
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-yellow-800">
                        <strong>Preview Mode:</strong> This shows the first {dataPreview.sampleSize} rows of your dataset.
                        The complete dataset contains {dataPreview.totalRows} rows and will be processed in full during normalization.
                      </p>
                    </div>
                  </div>
                </div>
                {/* --- New: Normalization Step --- */}
                <NormalizationStep
                  headers={dataPreview.headers}
                  dataset={selectedDataset}
                  onNormalizationComplete={fetchDatasets}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NormalizationStep({ headers, dataset, onNormalizationComplete }) {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [method, setMethod] = useState('minmax');
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [normalizedPreview, setNormalizedPreview] = useState(null);
  const [error, setError] = useState('');
  const [columnStats, setColumnStats] = useState<Record<string, ColumnStats>>({}); // New: Column statistics
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>(''); // AI range suggestion
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingToFeatureImportance, setIsSavingToFeatureImportance] = useState(false);
  const [featureImportanceSaveSuccess, setFeatureImportanceSaveSuccess] = useState(false);

  const normalizationMethods = [
    {
      value: 'minmax',
      label: 'Min-Max Scaling',
      desc: 'Scales values to a specified range (default 0-1). Best for image pixel data or bounded inputs.',
      example: 'Example: Age data (18-80) → scaled to (0-1)'
    },
    {
      value: 'zscore',
      label: 'Z-Score Standardization',
      desc: 'Centers data to mean 0 and standard deviation 1. Use for algorithms assuming normal distribution like SVM or KNN.',
      example: 'Example: Height/Weight data with different units'
    },
    {
      value: 'robust',
      label: 'Robust Scaling',
      desc: 'Scales data using median and IQR, robust to outliers. Useful when the dataset has many outliers.',
      example: 'Example: Income data with extreme high earners'
    }
  ];

  // New: Load column statistics when columns are selected
  const loadColumnStatistics = React.useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, { 
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });
      
      if (parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }
      
      const stats: Record<string, ColumnStats> = {};
      
      selectedColumns.forEach(column => {
        const values = parsed.data
          .map(row => parseFloat(row[column]))
          .filter(val => !isNaN(val));
        
        if (values.length > 0) {
          const sorted = [...values].sort((a, b) => a - b);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const median = sorted[Math.floor(sorted.length / 2)];
          
          // Count non-numeric values
          const totalRows = parsed.data.length;
          const numericRows = values.length;
          const nonNumericCount = totalRows - numericRows;
          
          stats[column] = {
            min: min.toFixed(2),
            max: max.toFixed(2),
            mean: mean.toFixed(2),
            median: median.toFixed(2),
            count: numericRows,
            nonNumericCount,
            isNumeric: nonNumericCount === 0
          };
        }
      });
      
      setColumnStats(stats);
    } catch (err) {
      console.error('Failed to load column statistics:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedColumns, dataset.url]);

  useEffect(() => {
    if (selectedColumns.length > 0) {
      loadColumnStatistics();
    }
  }, [selectedColumns, loadColumnStatistics]);

  const handleColumnChange = (col) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  // New: AI-powered range suggestion using Groq API
  const getAIRangeSuggestion = async () => {
    if (selectedColumns.length === 0 || Object.keys(columnStats).length === 0) return;
    
    setIsLoadingAI(true);
    try {
      // Prepare detailed column statistics for AI analysis
      const columnDetails = selectedColumns.map(col => {
        const stats = columnStats[col];
        if (!stats) return `${col}: No statistics available`;
        
        const range = parseFloat(stats.max) - parseFloat(stats.min);
        const isSmallRange = range <= 10;
        const isLargeRange = range >= 100;
        
        return `Column "${col}": 
        - Current range: ${stats.min} to ${stats.max} (span: ${range.toFixed(2)})
        - Average value: ${stats.mean}
        - Data points: ${stats.count}
        - Data characteristics: ${isSmallRange ? 'Small range data (like ratings, scores)' : isLargeRange ? 'Large range data (like prices, quantities)' : 'Medium range data'}`;
      }).join('\n\n');
      
      const prompt = `You are a data normalization expert. Analyze these column statistics and suggest the MOST APPROPRIATE Min-Max scaling range:

${columnDetails}

Context: User is normalizing data for analysis. Consider:
1. PRESERVE MEANINGFUL RANGES: If data is CGPA (1-10), suggest ranges that make sense like 0-10 or 1-10, NOT 0-1
2. DATA TYPE CONTEXT: 
   - Academic scores (CGPA, grades): Keep original scale or use 0-100
   - Age data: Could use 0-100 or maintain actual range
   - Financial data: Consider 0-1000, 0-10000 based on scale
   - Percentages: Use 0-100
   - Image data: Use 0-255
3. PRACTICAL USE: The normalized range should be meaningful for the data domain

Respond EXACTLY in this format:
Min: [number], Max: [number]
Reason: [One clear sentence explaining why this range fits the data characteristics and use case]

Do NOT default to 0-1 unless it's specifically appropriate for the data type.`;

      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const result = await response.json();
        const suggestion = result.suggestion || 'Unable to generate suggestion';
        setAiSuggestion(suggestion);
        
        // Try to extract min/max values from AI response with better parsing
        const minMatch = suggestion.match(/Min:\s*(-?\d+\.?\d*)/i);
        const maxMatch = suggestion.match(/Max:\s*(-?\d+\.?\d*)/i);
        
        if (minMatch && maxMatch) {
          const suggestedMin = parseFloat(minMatch[1]);
          const suggestedMax = parseFloat(maxMatch[1]);
          
          if (!isNaN(suggestedMin) && !isNaN(suggestedMax) && suggestedMin < suggestedMax) {
            setMinValue(suggestedMin);
            setMaxValue(suggestedMax);
          }
        }
      } else {
        setAiSuggestion('AI suggestion service temporarily unavailable');
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      setAiSuggestion('Unable to get AI suggestion at this time');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // New: Get smart recommendations based on data characteristics
  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const allStats = Object.values(columnStats);
    
    if (allStats.length === 0) return recommendations;
    
    // Check for potential outliers (large range differences)
    const hasLargeRanges = allStats.some(stats => {
      const range = parseFloat(stats.max) - parseFloat(stats.min);
      return range > 1000;
    });
    
    // Check for mixed scales
    const ranges = allStats.map(stats => parseFloat(stats.max) - parseFloat(stats.min));
    const maxRange = Math.max(...ranges);
    const minRange = Math.min(...ranges);
    const hasMixedScales = maxRange / minRange > 10;
    
    if (hasLargeRanges) {
      recommendations.push("🎯 Robust Scaling recommended: Large value ranges detected, may contain outliers");
    } else if (hasMixedScales) {
      recommendations.push("⚖️ Z-Score recommended: Mixed scales detected between columns");
    } else {
      recommendations.push("📏 Min-Max Scaling recommended: Consistent scales, good for bounded outputs");
    }
    
    return recommendations;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setNormalizedPreview(null);
    setSaveSuccess(false);
    
    const requestData = {
      datasetUrl: dataset.url,
      columns: selectedColumns,
      method,
      min: minValue,
      max: maxValue
    };
    
    console.log('Sending normalization request:', requestData);
    
    try {
      const res = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      const result = await res.json();
      console.log('API response:', { status: res.status, result });
      
      if (!res.ok) {
        throw new Error(result.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      setNormalizedPreview(result.preview);
      // Optionally, update datasets list or show download link
      if (onNormalizationComplete) onNormalizationComplete();
    } catch (err) {
      console.error('Normalization error:', err);
      setError(err.message || 'Normalization failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // New: Save normalized dataset to R2 and MongoDB
  const handleSaveNormalizedDataset = async () => {
    console.log('💾 NORMALIZATION SAVE BUTTON CLICKED - Starting save to normalization folder');
    
    if (!normalizedPreview) return;

    setIsSaving(true);
    setError('');
    
    try {
      // Get normalized CSV data directly from API (no temporary storage)
      const requestData = {
        datasetUrl: dataset.url,
        columns: selectedColumns,
        method,
        min: minValue,
        max: maxValue,
        returnFullCSV: true // Request full CSV data directly
      };
      
      console.log('Normalizing for save with full CSV:', requestData);
      
      const normalizeResponse = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (!normalizeResponse.ok) {
        const errorResult = await normalizeResponse.json();
        throw new Error(errorResult.error || 'Failed to normalize data for saving');
      }
      
      const normalizeResult = await normalizeResponse.json();
      
      // Get CSV data directly from response (no downloadUrl needed)
      if (!normalizeResult.fullCSV) {
        throw new Error('Full CSV data not received from normalization API');
      }
      
      const csvData = normalizeResult.fullCSV;
      
      // Save to R2 using the normalization datasets upload endpoint (R2-only, no MongoDB)
      const saveResponse = await fetch('/api/normalization-datasets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvData,
          originalDatasetName: dataset.originalName || dataset.transformedName,
          transformedName: `${dataset.transformedName}_normalized`,
          processingSteps: [
            ...(dataset.processingSteps || []),
            "data_normalization",
            `method: ${method}`,
            `columns: ${selectedColumns.join(', ')}`,
            ...(method === 'minmax' ? [`range: ${minValue}-${maxValue}`] : [])
          ]
        })
      });

      if (!saveResponse.ok) {
        throw new Error(`Failed to save normalized dataset: ${saveResponse.status} ${saveResponse.statusText}`);
      }

      const saveResult = await saveResponse.json();
      console.log('Save successful:', saveResult);

      setSaveSuccess(true);
      toast.success('Normalized dataset saved successfully!');
      
      // Refresh the datasets list
      if (onNormalizationComplete) onNormalizationComplete();
      
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save normalized dataset');
      toast.error('Failed to save normalized dataset');
    } finally {
      setIsSaving(false);
    }
  };

  // New: Save normalized dataset to Feature Importance folder in R2
  const handleSaveToFeatureImportance = async () => {
    console.log('🚀 FEATURE IMPORTANCE SAVE BUTTON CLICKED - Starting save to feature-importance folder');
    
    if (!normalizedPreview) return;

    setIsSavingToFeatureImportance(true);
    setError('');
    setFeatureImportanceSaveSuccess(false);
    
    try {
      // Get normalized CSV data directly from API (no temporary storage)
      const requestData = {
        datasetUrl: dataset.url,
        columns: selectedColumns,
        method,
        min: minValue,
        max: maxValue,
        returnFullCSV: true // Request full CSV data directly
      };
      
      console.log('Normalizing for feature-importance save with full CSV:', requestData);
      
      const normalizeResponse = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (!normalizeResponse.ok) {
        const errorResult = await normalizeResponse.json();
        throw new Error(errorResult.error || 'Failed to normalize data for saving');
      }
      
      const normalizeResult = await normalizeResponse.json();
      
      // Get CSV data directly from response (no downloadUrl needed)
      if (!normalizeResult.fullCSV) {
        throw new Error('Full CSV data not received from normalization API');
      }
      
      const csvData = normalizeResult.fullCSV;
      
      // Save to R2 using the feature-importance datasets upload endpoint (R2-only, no MongoDB)
      console.log('📤 Calling feature-importance upload API...');
      const saveResponse = await fetch('/api/feature-importance-datasets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvData,
          originalDatasetName: dataset.originalName || dataset.transformedName,
          transformedName: `${dataset.transformedName}_normalized_for_feature_importance`,
          processingSteps: [
            ...(dataset.processingSteps || []),
            "data_normalization",
            `method: ${method}`,
            `columns: ${selectedColumns.join(', ')}`,
            ...(method === 'minmax' ? [`range: ${minValue}-${maxValue}`] : []),
            "prepared_for_feature_importance"
          ]
        })
      });

      if (!saveResponse.ok) {
        throw new Error(`Failed to save to feature-importance folder: ${saveResponse.status} ${saveResponse.statusText}`);
      }

      const saveResult = await saveResponse.json();
      console.log('Feature-importance save successful:', saveResult);

      setFeatureImportanceSaveSuccess(true);
      toast.success('Normalized dataset saved to Feature Importance folder successfully!');
      
      // Auto-redirect to feature-importance page after successful save
      setTimeout(() => {
        console.log('🚀 Auto-redirecting to feature-importance page...');
        window.location.href = '/dashboard/feature-importance';
      }, 2000); // Wait 2 seconds to show success message before redirecting
      
    } catch (err) {
      console.error('Feature-importance save error:', err);
      setError(err.message || 'Failed to save to feature importance folder');
      toast.error('Failed to save to feature importance folder');
    } finally {
      setIsSavingToFeatureImportance(false);
    }
  };

  // Handle "Analyze Feature Importance" button - save dataset and redirect
  const handleAnalyzeFeatureImportance = async () => {
    console.log('🔍 ANALYZE FEATURE IMPORTANCE BUTTON CLICKED');
    
    // If there's a normalized preview, save it first, then redirect
    if (normalizedPreview) {
      console.log('📊 Normalized data available - saving to feature-importance folder first');
      await handleSaveToFeatureImportance();
      // handleSaveToFeatureImportance already handles the redirect after save
    } else {
      // No normalized data, just redirect to feature-importance page
      console.log('🚀 No normalized data - redirecting directly to feature-importance page');
      window.location.href = '/dashboard/feature-importance';
    }
  };

  // New: Handle CSV download without relying on temporary storage
  const handleDownloadNormalizedCSV = async () => {
    if (!normalizedPreview) return;

    try {
      // Get normalized CSV data directly from API
      const requestData = {
        datasetUrl: dataset.url,
        columns: selectedColumns,
        method,
        min: minValue,
        max: maxValue,
        returnFullCSV: true // Request full CSV data directly
      };
      
      console.log('Getting CSV for download:', requestData);
      
      const normalizeResponse = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (!normalizeResponse.ok) {
        const errorResult = await normalizeResponse.json();
        throw new Error(errorResult.error || 'Failed to get normalized data for download');
      }
      
      const normalizeResult = await normalizeResponse.json();
      
      // Get CSV data directly from response
      if (!normalizeResult.fullCSV) {
        throw new Error('Full CSV data not received from normalization API');
      }
      
      const csvData = normalizeResult.fullCSV;
      
      // Create blob and download
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.transformedName}_normalized.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download started!');
      
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download normalized dataset');
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 4: Select Columns to Normalize</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Select columns to normalize:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {headers.map((col) => (
              <label key={col} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={col}
                  checked={selectedColumns.includes(col)}
                  onChange={() => handleColumnChange(col)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 truncate">{col}</span>
              </label>
            ))}
          </div>
          
          {/* Column Statistics Display */}
          {selectedColumns.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-700">Column Statistics:</h5>
                {isLoadingStats && (
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    Loading stats...
                  </div>
                )}
              </div>
              <div className="grid gap-3">
                {selectedColumns.map(column => {
                  const stats = columnStats[column];
                  return (
                    <div key={column} className="bg-gray-50 rounded-lg p-3 border">
                      <h6 className="font-medium text-gray-800 mb-2">{column}</h6>
                      {stats ? (
                        <div>
                          {stats.isNumeric ? (
                            <div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Min</span>
                                  <span className="font-medium text-blue-600">{stats.min}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Max</span>
                                  <span className="font-medium text-blue-600">{stats.max}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Mean</span>
                                  <span className="font-medium text-green-600">{stats.mean}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Count</span>
                                  <span className="font-medium text-gray-600">{stats.count}</span>
                                </div>
                              </div>
                              
                              {/* Data Type Hints */}
                              <div className="mt-2 text-xs">
                                {(() => {
                                  const min = parseFloat(stats.min);
                                  const max = parseFloat(stats.max);
                                  const range = max - min;
                                  
                                  if (min >= 0 && max <= 10 && range <= 10) {
                                    return (
                                      <div className="flex items-center text-blue-600 bg-blue-50 rounded px-2 py-1">
                                        <span className="mr-1">📊</span>
                                        <span>Looks like rating/score data (0-10 scale)</span>
                                      </div>
                                    );
                                  } else if (min >= 0 && max <= 100 && range <= 100) {
                                    return (
                                      <div className="flex items-center text-green-600 bg-green-50 rounded px-2 py-1">
                                        <span className="mr-1">📈</span>
                                        <span>Appears to be percentage/score data (0-100)</span>
                                      </div>
                                    );
                                  } else if (min >= 0 && max <= 255) {
                                    return (
                                      <div className="flex items-center text-purple-600 bg-purple-50 rounded px-2 py-1">
                                        <span className="mr-1">🎨</span>
                                        <span>Could be image/RGB data (0-255)</span>
                                      </div>
                                    );
                                  } else if (range >= 1000) {
                                    return (
                                      <div className="flex items-center text-orange-600 bg-orange-50 rounded px-2 py-1">
                                        <span className="mr-1">💰</span>
                                        <span>Large scale data (financial/quantity)</span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="flex items-center text-gray-600 bg-gray-50 rounded px-2 py-1">
                                        <span className="mr-1">📋</span>
                                        <span>Custom range data</span>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center text-xs text-amber-600">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Contains {stats.nonNumericCount} non-numeric values. Normalization will treat these as 0.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Loading statistics...</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Step 5: Choose Normalization Method</h4>
          <div className="space-y-3">
            {normalizationMethods.map((m) => (
              <div key={m.value} className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                method === m.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="method"
                    value={m.value}
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="form-radio h-4 w-4 text-blue-600 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-800">{m.label}</span>
                      {method === m.value && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{m.desc}</p>
                    <p className="text-xs text-blue-600 italic">{m.example}</p>
                  </div>
                </label>
              </div>
            ))}
          </div>
          
          {/* Dynamic recommendations based on selected columns */}
          {selectedColumns.length > 0 && Object.keys(columnStats).length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h6 className="font-medium text-blue-800 mb-2">💡 Recommendations for your data:</h6>
              <div className="space-y-1 text-xs text-blue-700">
                {getRecommendations().map((rec, index) => (
                  <p key={index}>{rec}</p>
                ))}
              </div>
            </div>
          )}
        </div>
        {method === 'minmax' && (
          <div className="space-y-6">
            {/* AI Range Suggestion Section */}
            {selectedColumns.length > 0 && Object.keys(columnStats).length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <span className="text-purple-600 font-bold text-sm">🤖</span>
                    </div>
                    <h6 className="font-medium text-purple-800">AI Range Suggestion</h6>
                  </div>
                  <button
                    type="button"
                    onClick={getAIRangeSuggestion}
                    disabled={isLoadingAI}
                    className="flex items-center px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingAI ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-1"></div>
                    ) : (
                      <span className="mr-1">✨</span>
                    )}
                    {isLoadingAI ? 'Analyzing...' : 'Get AI Suggestion'}
                  </button>
                </div>
                
                {aiSuggestion && (
                  <div className="bg-white rounded-md p-4 border border-purple-200 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="bg-purple-100 p-2 rounded-full flex-shrink-0">
                        <span className="text-purple-600 text-lg">🎯</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-800 mb-2">
                          AI-Recommended Range:
                        </p>
                        <div className="bg-purple-50 rounded-md p-3 mb-2">
                          <p className="text-sm font-mono text-purple-900">
                            {aiSuggestion.split('\n')[0]}
                          </p>
                        </div>
                        {aiSuggestion.includes('Reason:') && (
                          <div className="text-xs text-purple-700">
                            <span className="font-medium">💡 Why this range: </span>
                            {aiSuggestion.split('Reason:')[1]?.trim()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Range Input Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h6 className="font-medium text-gray-800">Configure Range Values</h6>
                <button
                  type="button"
                  onClick={() => setShowCustomRange(!showCustomRange)}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showCustomRange ? 'Hide Custom' : 'Show Custom'}
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-2 font-medium">Quick Presets:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setMinValue(0); setMaxValue(1); }}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      minValue === 0 && maxValue === 1 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <div className="font-medium">0-1 (Standard)</div>
                    <div className="text-xs opacity-75">Machine Learning</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinValue(-1); setMaxValue(1); }}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      minValue === -1 && maxValue === 1 
                        ? 'bg-green-600 text-white' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <div className="font-medium">-1 to 1</div>
                    <div className="text-xs opacity-75">Centered Data</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinValue(0); setMaxValue(100); }}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      minValue === 0 && maxValue === 100 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    <div className="font-medium">0-100 (%)</div>
                    <div className="text-xs opacity-75">Percentages</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinValue(0); setMaxValue(255); }}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      minValue === 0 && maxValue === 255 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    <div className="font-medium">0-255 (RGB)</div>
                    <div className="text-xs opacity-75">Image Processing</div>
                  </button>
                </div>
              </div>

              {/* Custom Range Inputs */}
              {showCustomRange && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-600 mb-3 font-medium">Custom Range:</p>
                  <div className="flex space-x-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Value</label>
                      <input
                        type="number"
                        step="0.01"
                        value={minValue}
                        onChange={e => setMinValue(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter min value"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Maximum Value</label>
                      <input
                        type="number"
                        step="0.01"
                        value={maxValue}
                        onChange={e => setMaxValue(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter max value"
                      />
                    </div>
                  </div>
                  
                  {/* Range validation and preview */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Range: {maxValue - minValue} units
                    </div>
                    {minValue >= maxValue && (
                      <div className="flex items-center text-xs text-red-600">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Min must be less than Max
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Current Range Display */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-600">Current Range:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {minValue} to {maxValue}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Span: {(maxValue - minValue).toFixed(2)}
                  </div>
                </div>
                
                {/* Visual range indicator */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Min: {minValue}</span>
                    <span>Max: {maxValue}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Validation warning */}
            {minValue >= maxValue && (
              <div className="flex items-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Warning: Min value should be less than Max value for proper scaling</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-4">
          <button
            type="submit"
            disabled={isSubmitting || selectedColumns.length === 0 || (method === 'minmax' && minValue >= maxValue)}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Normalizing...
              </div>
            ) : (
              `Normalize ${selectedColumns.length} Column${selectedColumns.length !== 1 ? 's' : ''}`
            )}
          </button>
          
          {/* Validation messages */}
          {selectedColumns.length === 0 && (
            <p className="text-sm text-amber-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Please select at least one column to normalize
            </p>
          )}
          
          {method === 'minmax' && minValue >= maxValue && (
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Min value must be less than Max value for Min-Max scaling
            </p>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}
        </div>
      </form>
      {/* Normalized Preview Table */}
      {normalizedPreview && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-md font-semibold text-gray-800">✅ Normalization Complete!</h4>
              <p className="text-sm text-gray-600">
                Preview showing {normalizedPreview.sampleSize} of {normalizedPreview.totalRows} rows
              </p>
            </div>
            <div className="flex items-center text-xs text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              {selectedColumns.length} column(s) normalized
            </div>
          </div>
          
          {/* Legend for normalized columns */}
          <div className="mb-3 flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
              <span className="text-gray-600">Normalized columns</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded mr-1"></div>
              <span className="text-gray-600">Original columns</span>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {normalizedPreview.headers.map((header, index) => (
                    <th
                      key={index}
                      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-r border-gray-200 last:border-r-0 ${
                        selectedColumns.includes(header)
                          ? 'bg-green-100 text-green-800 font-semibold'
                          : 'text-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{header}</span>
                        {selectedColumns.includes(header) && (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {normalizedPreview.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => {
                      const header = normalizedPreview.headers[cellIndex];
                      const isNormalized = selectedColumns.includes(header);
                      return (
                        <td
                          key={cellIndex}
                          className={`px-4 py-3 text-sm border-r border-gray-200 last:border-r-0 ${
                            isNormalized
                              ? 'bg-green-50 text-green-900 font-medium'
                              : 'text-gray-900'
                          }`}
                        >
                          {cell || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Enhanced save and download section */}
          <div className="mt-4 space-y-4">
            {/* Success message for saved dataset */}
            {saveSuccess && (
              <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-green-800">Dataset Saved to Normalization Storage!</h5>
                  <p className="text-sm text-green-600">
                    Your normalized dataset has been saved to cloud storage and updated in your dataset library.
                  </p>
                </div>
              </div>
            )}

            {/* Success message for feature importance save */}
            {featureImportanceSaveSuccess && (
              <div className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-purple-800">Dataset Saved to Feature Importance Storage!</h5>
                  <p className="text-sm text-purple-600">
                    Your normalized dataset is now available in the Feature Importance analysis section.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <h5 className="font-medium text-green-800">✅ Normalization Complete!</h5>
                <p className="text-sm text-green-600">
                  Your normalized dataset is ready. All {normalizedPreview.totalRows} rows have been processed.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Save to Normalization Storage - HIDDEN 
                <button
                  onClick={handleSaveNormalizedDataset}
                  disabled={isSaving || saveSuccess}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm ${
                    saveSuccess 
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : isSaving
                        ? 'bg-blue-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Saved to Norm
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Save to Normalization
                    </>
                  )}
                </button>
                */}

                {/* NEW: Save to Feature Importance Storage */}
                <button
                  onClick={handleSaveToFeatureImportance}
                  disabled={isSavingToFeatureImportance || featureImportanceSaveSuccess}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm ${
                    featureImportanceSaveSuccess 
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : isSavingToFeatureImportance
                        ? 'bg-purple-400 text-white cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isSavingToFeatureImportance ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving & Redirecting...
                    </>
                  ) : featureImportanceSaveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Saved! Redirecting...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Save to Storage
                    </>
                  )}
                </button>

                {/* Download Button */}
                <button
                  onClick={handleDownloadNormalizedCSV}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Feature Importance Section */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
              <div className="text-center">
                <div className="flex justify-center items-center mb-4">
                  <div className="bg-purple-100 p-3 rounded-full mr-4">
                    <Star className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-purple-900 mb-2">🚀 Next Step: Feature Importance Analysis</h4>
                    <p className="text-purple-700 text-sm max-w-2xl">
                      Discover which features contribute most to your model&apos;s predictions and optimize your dataset for better performance.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleAnalyzeFeatureImportance}
                  disabled={isSavingToFeatureImportance}
                  className={`inline-flex items-center px-8 py-4 text-white text-lg font-semibold rounded-xl transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl ${
                    isSavingToFeatureImportance
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                  }`}
                >
                  {isSavingToFeatureImportance ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                      Saving & Redirecting...
                    </>
                  ) : (
                    <>
                      <Star className="w-6 h-6 mr-3" />
                      Analyze Feature Importance
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
                
                <div className="mt-3 text-xs text-purple-600">
                  {featureImportanceSaveSuccess ? (
                    <>✅ Dataset saved to Feature Importance • Redirecting...</>
                  ) : normalizedPreview ? (
                    <>💾 Save normalized data & analyze • Identify key features • Improve model accuracy</>
                  ) : (
                    <>Identify key features • Reduce dimensionality • Improve model accuracy</>
                  )}
                </div>
              </div>
            </div>

            {/* Additional info for saved dataset */}
            {saveSuccess && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">💡 Next Steps:</span> Your normalized dataset is now available in your 
                  <span className="font-medium"> Data Transformation</span> section and can be used for further analysis or machine learning.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
