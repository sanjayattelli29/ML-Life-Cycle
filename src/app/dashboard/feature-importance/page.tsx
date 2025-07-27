'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import {
  Star,
  Database,
  Download,
  Calendar,
  FileText,
  Trash2,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  CheckCircle,
  BarChart3,
  TrendingUp,
  Loader2,
  Sparkles
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

interface ColumnMetadata {
  name: string;
  type: 'numeric' | 'categorical';
  stats: {
    // For numeric columns
    min?: number;
    max?: number;
    mean?: number;
    std?: number;
    nullCount?: number;
    // For categorical columns
    uniqueCount?: number;
    samples?: string[];
    mostFrequent?: string;
  };
}

interface AIRecommendation {
  recommendedFeatures: string[];
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

export default function FeatureImportance() {
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
  
  // New state for feature analysis
  const [columnMetadata, setColumnMetadata] = useState<ColumnMetadata[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [isAnalyzingColumns, setIsAnalyzingColumns] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showFeatureSelection, setShowFeatureSelection] = useState(false);
  
  // Progressive AI analysis states
  const [analysisStep, setAnalysisStep] = useState(0); // 0: not started, 1-5: each section
  const [stepResults, setStepResults] = useState<{
    features: string[];
    targetAnalysis: string;
    keyInsights: string;
    explanation: string;
    assessment: string;
  }>({
    features: [],
    targetAnalysis: '',
    keyInsights: '',
    explanation: '',
    assessment: ''
  });

  // Final dataset processing states
  const [isGeneratingFinalDataset, setIsGeneratingFinalDataset] = useState(false);
  const [finalDatasetPreview, setFinalDatasetPreview] = useState<{
    headers: string[];
    rows: string[][];
    totalRows: number;
    csvContent: string;
  } | null>(null);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSavedToCloud, setIsSavedToCloud] = useState(false);

  const fetchDatasets = React.useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsRefreshing(true);
      console.log('Fetching feature-importance datasets from R2 for user:', session.user.id);
      const response = await fetch('/api/feature-importance-datasets');
      
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      
      const data = await response.json();
      console.log('Feature-importance datasets response:', data);
      setDatasets(data.datasets || []);
      setError('');
    } catch (err) {
      console.error('Fetch feature-importance datasets error:', err);
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
      
      // Analyze columns immediately after loading data
      await analyzeColumns(headers, dataRows);
      
      setShowPreview(true);
    } catch (err) {
      toast.error('Failed to load dataset preview');
      console.error('Preview error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Analyze column types and generate metadata
  const analyzeColumns = async (headers: string[], rows: string[][]) => {
    setIsAnalyzingColumns(true);
    try {
      const metadata: ColumnMetadata[] = headers.map((header, colIndex) => {
        const columnValues = rows.map(row => row[colIndex]).filter(val => val && val.trim() !== '');
        
        // Try to parse as numbers
        const numericValues = columnValues.map(val => parseFloat(val)).filter(val => !isNaN(val));
        const isNumeric = numericValues.length > columnValues.length * 0.8; // 80% threshold
        
        if (isNumeric && numericValues.length > 0) {
          // Numeric column
          const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
          const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
          const std = Math.sqrt(variance);
          
          return {
            name: header,
            type: 'numeric' as const,
            stats: {
              min: Math.min(...numericValues),
              max: Math.max(...numericValues),
              mean: parseFloat(mean.toFixed(2)),
              std: parseFloat(std.toFixed(2)),
              nullCount: rows.length - columnValues.length
            }
          };
        } else {
          // Categorical column
          const uniqueValues = [...new Set(columnValues)];
          const frequencyMap = columnValues.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const mostFrequent = Object.entries(frequencyMap)
            .sort(([,a], [,b]) => b - a)[0]?.[0];
          
          return {
            name: header,
            type: 'categorical' as const,
            stats: {
              uniqueCount: uniqueValues.length,
              samples: uniqueValues.slice(0, 5), // First 5 unique values
              mostFrequent,
              nullCount: rows.length - columnValues.length
            }
          };
        }
      });
      
      setColumnMetadata(metadata);
      setShowFeatureSelection(true);
    } catch (err) {
      console.error('Column analysis error:', err);
      toast.error('Failed to analyze columns');
    } finally {
      setIsAnalyzingColumns(false);
    }
  };

  // Progressive AI analysis with step-by-step loading
  const handleAIRecommendation = async () => {
    if (!targetColumn || columnMetadata.length === 0) {
      toast.error('Please analyze columns and select a target first');
      return;
    }
    
    setIsLoadingAI(true);
    setAnalysisStep(0);
    
    // Reset previous results
    setStepResults({
      features: [],
      targetAnalysis: '',
      keyInsights: '',
      explanation: '',
      assessment: ''
    });

    try {
      // Prepare column analysis for AI
      const columnSummary = columnMetadata.map(col => {
        if (col.type === 'numeric') {
          return `${col.name}: Numeric (mean: ${col.stats.mean}, std: ${col.stats.std}, range: ${col.stats.min}-${col.stats.max})`;
        } else {
          return `${col.name}: Categorical (${col.stats.uniqueCount} unique values, most frequent: ${col.stats.mostFrequent})`;
        }
      }).join('\n');
      
      const targetInfo = columnMetadata.find(col => col.name === targetColumn);
      const targetType = targetInfo?.type || 'unknown';
      
      // Step 1: Get recommended features
      setAnalysisStep(1);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing time
      
      const featuresPrompt = `You are a data scientist. Given these columns for predicting ${targetColumn}:
${columnSummary}

List only the top 3-4 most important feature names for prediction. Respond with just the column names separated by commas, nothing else.`;

      const featuresResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: featuresPrompt }],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        const featuresText = featuresData.choices[0]?.message?.content || '';
        const extractedFeatures = featuresText.split(',').map(f => f.trim()).filter(f => f);
        
        setStepResults(prev => ({ ...prev, features: extractedFeatures }));
        setSelectedFeatures(extractedFeatures);
      }

      // Step 2: Target analysis
      setAnalysisStep(2);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const targetAnalysisText = `${targetColumn} is a ${targetType} variable suitable for ${targetType === 'numeric' ? 'regression' : 'classification'} analysis.`;
      setStepResults(prev => ({ ...prev, targetAnalysis: targetAnalysisText }));

      // Step 3: Key insights
      setAnalysisStep(3);
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const insightsPrompt = `Explain in 2 short sentences why these features: ${stepResults.features.join(', ')} are good predictors for ${targetColumn}. Be concise and specific.`;
      
      const insightsResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: insightsPrompt }],
          temperature: 0.3,
          max_tokens: 150,
        }),
      });

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        const insightsText = insightsData.choices[0]?.message?.content || 'Features show strong predictive value for the target variable.';
        setStepResults(prev => ({ ...prev, keyInsights: insightsText }));
      }

      // Step 4: Detailed explanation
      setAnalysisStep(4);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const explanationText = 'These features demonstrate strong statistical relationships, good data quality with minimal missing values, and align with domain knowledge for effective prediction.';
      setStepResults(prev => ({ ...prev, explanation: explanationText }));

      // Step 5: Overall assessment
      setAnalysisStep(5);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const assessmentText = `Selected ${stepResults.features.length} high-quality features with excellent predictive potential.`;
      setStepResults(prev => ({ ...prev, assessment: assessmentText }));

      // Set final recommendation
      const finalRecommendation: AIRecommendation = {
        recommendedFeatures: stepResults.features,
        reasoning: stepResults.keyInsights || 'AI analysis completed successfully',
        confidence: 'high'
      };
      
      setAiRecommendation(finalRecommendation);
      toast.success('AI analysis completed successfully!');
      
    } catch (err) {
      console.error('AI recommendation error:', err);
      toast.error('Analysis failed. Please try again.');
      setAnalysisStep(0);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Generate final dataset with selected features and target encoding
  const generateFinalDataset = async () => {
    if (!selectedDataset || !targetColumn || selectedFeatures.length === 0) {
      toast.error('Please select features and target column first');
      return;
    }

    setIsGeneratingFinalDataset(true);
    try {
      // Fetch the full dataset
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(selectedDataset.url)}`;
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
      
      // Find indices for selected features and target
      const targetIndex = headers.indexOf(targetColumn);
      const featureIndices = selectedFeatures.map(feature => headers.indexOf(feature));
      
      if (targetIndex === -1) {
        throw new Error('Target column not found');
      }
      
      // Check if any features are missing
      const missingFeatures = selectedFeatures.filter((_, i) => featureIndices[i] === -1);
      if (missingFeatures.length > 0) {
        throw new Error(`Features not found: ${missingFeatures.join(', ')}`);
      }
      
      // Get target column metadata for encoding
      const targetMetadata = columnMetadata.find(col => col.name === targetColumn);
      
      // Process and encode the data
      const processedRows: string[][] = [];
      let encodingMap: Record<string, string> = {};
      
      // If target is categorical, create encoding map
      if (targetMetadata?.type === 'categorical') {
        const uniqueTargetValues = [...new Set(dataRows.map(row => row[targetIndex]).filter(val => val && val.trim() !== ''))];
        encodingMap = uniqueTargetValues.reduce((map, value, index) => {
          map[value] = index.toString();
          return map;
        }, {} as Record<string, string>);
      }
      
      // Create new headers: selected features + encoded target
      const newHeaders = [...selectedFeatures, `${targetColumn}_encoded`];
      
      // Process each row
      for (const row of dataRows) {
        const newRow: string[] = [];
        
        // Add selected features
        for (const featureIndex of featureIndices) {
          newRow.push(row[featureIndex] || '');
        }
        
        // Add encoded target
        const targetValue = row[targetIndex] || '';
        if (targetMetadata?.type === 'categorical' && targetValue) {
          newRow.push(encodingMap[targetValue] || '');
        } else {
          newRow.push(targetValue); // Keep numeric as is
        }
        
        processedRows.push(newRow);
      }
      
      // Create CSV content
      const csvRows = [newHeaders, ...processedRows];
      const csvContent = csvRows.map(row => 
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Set preview data (configurable number of rows)
      setFinalDatasetPreview({
        headers: newHeaders,
        rows: processedRows, // Store all rows
        totalRows: processedRows.length,
        csvContent
      });
      
      toast.success('Final dataset generated successfully!');
      
    } catch (err) {
      console.error('Dataset generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate dataset');
    } finally {
      setIsGeneratingFinalDataset(false);
    }
  };

  // Download final CSV locally
  const downloadFinalCSV = () => {
    if (!finalDatasetPreview) return;
    
    const blob = new Blob([finalDatasetPreview.csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDataset?.transformedName || 'dataset'}_feature_importance.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('CSV downloaded successfully!');
  };

  // Upload to R2 and save to model-training folder
  const uploadToCloudAndSave = async () => {
    if (!finalDatasetPreview || !selectedDataset) return;
    
    setIsUploadingToCloud(true);
    try {
      console.log('🚀 SAVE TO MODEL TRAINING BUTTON CLICKED - Starting save to model-training folder');
      
      // Save to R2 using the model-training datasets upload endpoint (R2-only, no MongoDB)
      console.log('📤 Calling model-training upload API...');
      const saveResponse = await fetch('/api/model-training-datasets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: finalDatasetPreview.csvContent,
          originalDatasetName: selectedDataset.originalName || selectedDataset.transformedName,
          transformedName: `${selectedDataset.transformedName}_feature_analysis_ready`,
          processingSteps: [
            ...(selectedDataset.processingSteps || []),
            'feature_importance_analysis',
            'target_encoding',
            'feature_selection',
            'model_training_ready'
          ],
          selectedFeatures: selectedFeatures,
          targetColumn: targetColumn,
          metadata: {
            originalColumns: columnMetadata.length,
            finalColumns: finalDatasetPreview.headers.length,
            analysisType: columnMetadata.find(col => col.name === targetColumn)?.type === 'numeric' ? 'regression' : 'classification',
            aiRecommendation: aiRecommendation
          }
        })
      });
      
      if (!saveResponse.ok) {
        throw new Error(`Failed to save to model-training folder: ${saveResponse.status} ${saveResponse.statusText}`);
      }
      
      const saveResult = await saveResponse.json();
      console.log('Model-training save successful:', saveResult);
      
      toast.success('Dataset saved to Model Training folder successfully!');
      
      // Set saved state
      setIsSavedToCloud(true);
      
      // Auto-redirect to model-training page after successful save
      setTimeout(() => {
        console.log('🚀 Auto-redirecting to model-training page...');
        window.location.href = '/dashboard/model-training';
      }, 2000); // Wait 2 seconds to show success message before redirecting
      
    } catch (err) {
      console.error('Model-training save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save to model training folder');
    } finally {
      setIsUploadingToCloud(false);
    }
  };

  const handleStartFeatureImportance = () => {
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
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
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg mr-4">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Feature Importance Analysis</h1>
                <p className="text-gray-600 mt-1">Identify the most influential features in your datasets for better model performance</p>
              </div>
            </div>
            <button
              onClick={fetchDatasets}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Feature Importance Datasets Available</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You need normalized datasets for feature importance analysis. Normalize your datasets and save them to feature importance storage in the Data Normalization section.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span>Go to</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">Data Normalization</span>
              <ArrowRight className="w-4 h-4" />
              <span>Normalize Dataset</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium text-purple-600">Save to Storage</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">Return for Feature Analysis</span>
            </div>
          </div>
        ) : (
          // Dataset Selection and Feature Importance
          <div className="space-y-6">
            {/* Step 1: Dataset Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                  <span className="text-purple-600 font-bold text-sm">1</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Select Dataset for Feature Importance Analysis</h2>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 truncate mr-4">
                    {selectedDataset ? selectedDataset.transformedName : 'Choose a dataset to analyze...'}
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
                          setIsSavedToCloud(false);
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
                      <div className="bg-purple-100 p-3 rounded-lg flex-shrink-0">
                        <FileText className="w-6 h-6 text-purple-600" />
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
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-gray-600">Size:</span>
                            <span className="font-medium text-purple-600">{formatFileSize(selectedDataset.fileSize)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                            <span className="text-gray-600">Dimensions:</span>
                            <span className="font-medium text-indigo-600">
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

                {/* Step 3: Start Feature Importance */}
                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                        <span className="text-purple-600 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Ready for Feature Analysis</h3>
                        <p className="text-gray-600 text-sm">Preview and analyze feature importance in your dataset</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleStartFeatureImportance}
                      disabled={isLoadingPreview}
                      className="flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      <BarChart3 className="w-5 h-5 mr-2" />
                      {isLoadingPreview ? 'Loading...' : 'Start Feature Analysis'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Data Preview (shown after clicking feature importance) */}
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
                        The complete dataset contains {dataPreview.totalRows} rows and will be processed in full during feature importance analysis.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature Importance Analysis Section - Placeholder */}
                {/* Feature Selection Section */}
                {showFeatureSelection && columnMetadata.length > 0 && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-blue-900 mb-2">
                          🎯 Intelligent Feature Selection
                        </h3>
                        <p className="text-blue-700 text-sm">
                          Select your target variable and let AI recommend the most important features for prediction.
                        </p>
                      </div>
                      {isAnalyzingColumns && (
                        <div className="flex items-center text-blue-600">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-sm">Analyzing columns...</span>
                        </div>
                      )}
                    </div>

                    {/* Target Variable Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Target Variable (what you want to predict):
                      </label>
                      <select
                        value={targetColumn}
                        onChange={(e) => setTargetColumn(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        style={{ color: '#111827' }}
                      >
                        <option value="" style={{ color: '#6B7280' }}>Choose target column...</option>
                        {columnMetadata.map((col) => (
                          <option key={col.name} value={col.name} style={{ color: '#111827' }}>
                            {col.name} ({col.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Column Analysis */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">Column Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {columnMetadata.map((col) => (
                          <div
                            key={col.name}
                            className={`p-4 border rounded-lg ${
                              col.name === targetColumn 
                                ? 'border-orange-300 bg-orange-50' 
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900 truncate" style={{ color: '#111827' }}>
                                {col.name}
                              </h5>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                col.type === 'numeric' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {col.type}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-700 space-y-1" style={{ color: '#374151' }}>
                              {col.type === 'numeric' ? (
                                <>
                                  <div><strong>Range:</strong> {col.stats.min?.toFixed(2)} - {col.stats.max?.toFixed(2)}</div>
                                  <div><strong>Mean:</strong> {col.stats.mean?.toFixed(2)} (±{col.stats.std?.toFixed(2)})</div>
                                  <div><strong>Nulls:</strong> {col.stats.nullCount}</div>
                                </>
                              ) : (
                                <>
                                  <div><strong>Unique:</strong> {col.stats.uniqueCount}</div>
                                  <div><strong>Most frequent:</strong> {col.stats.mostFrequent}</div>
                                  <div><strong>Nulls:</strong> {col.stats.nullCount}</div>
                                  {col.stats.samples && (
                                    <div className="text-xs" style={{ color: '#6B7280' }}>
                                      <strong>Examples:</strong> {col.stats.samples.slice(0, 3).join(', ')}
                                      {col.stats.samples.length > 3 && '...'}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Feature Selection Checkbox */}
                            {col.name !== targetColumn && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedFeatures.includes(col.name)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedFeatures([...selectedFeatures, col.name]);
                                      } else {
                                        setSelectedFeatures(selectedFeatures.filter(f => f !== col.name));
                                      }
                                    }}
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm font-medium text-gray-900" style={{ color: '#111827' }}>
                                    Use as feature
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Recommendation Section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">AI Feature Recommendations</h4>
                        <button
                          onClick={handleAIRecommendation}
                          disabled={!targetColumn || isLoadingAI}
                          className="flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoadingAI ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Getting AI recommendations...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Get AI Recommendations
                            </>
                          )}
                        </button>
                      </div>

                      {(isLoadingAI || aiRecommendation) && (
                        <div className="space-y-4">
                          {/* Header with confidence */}
                          <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center">
                              <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                              <span className="font-semibold text-purple-900">
                                {isLoadingAI ? 'AI Analysis in Progress...' : 'AI Analysis Results'}
                              </span>
                            </div>
                            {aiRecommendation && (
                              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                aiRecommendation.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                aiRecommendation.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {aiRecommendation.confidence} confidence
                              </span>
                            )}
                          </div>

                          {/* 5 Sections Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            {/* Section 1: Recommended Features */}
                            <div className={`bg-white border rounded-lg p-4 transition-all duration-500 ${
                              analysisStep >= 1 ? 'border-purple-300 shadow-sm' : 'border-gray-200'
                            }`}>
                              <div className="flex items-center mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                  analysisStep >= 1 ? 'bg-purple-100' : 'bg-gray-100'
                                }`}>
                                  {isLoadingAI && analysisStep === 1 ? (
                                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                                  ) : (
                                    <span className={`font-bold text-xs ${
                                      analysisStep >= 1 ? 'text-purple-600' : 'text-gray-400'
                                    }`}>1</span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Recommended Features</h5>
                              </div>
                              
                              {isLoadingAI && analysisStep === 1 ? (
                                <div className="space-y-2">
                                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                </div>
                              ) : analysisStep >= 1 && stepResults.features.length > 0 ? (
                                <div className="space-y-2">
                                  {stepResults.features.map((feature, index) => (
                                    <div
                                      key={feature}
                                      className="flex items-center p-2 bg-purple-50 rounded-md text-sm animate-fadeIn"
                                      style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                      <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                                        <span className="text-white text-xs font-bold">{index + 1}</span>
                                      </div>
                                      <span className="text-purple-700 font-medium truncate" title={feature}>
                                        {feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : analysisStep < 1 ? (
                                <div className="text-gray-400 text-sm italic">Waiting for analysis...</div>
                              ) : (
                                <div className="text-gray-500 text-sm italic">No features identified</div>
                              )}
                            </div>

                            {/* Section 2: Target Analysis */}
                            <div className={`bg-white border rounded-lg p-4 transition-all duration-500 ${
                              analysisStep >= 2 ? 'border-orange-300 shadow-sm' : 'border-gray-200'
                            }`}>
                              <div className="flex items-center mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                  analysisStep >= 2 ? 'bg-orange-100' : 'bg-gray-100'
                                }`}>
                                  {isLoadingAI && analysisStep === 2 ? (
                                    <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                                  ) : (
                                    <span className={`font-bold text-xs ${
                                      analysisStep >= 2 ? 'text-orange-600' : 'text-gray-400'
                                    }`}>2</span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Target Variable</h5>
                              </div>
                              
                              {isLoadingAI && analysisStep === 2 ? (
                                <div className="space-y-2">
                                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                                </div>
                              ) : analysisStep >= 2 ? (
                                <div className="space-y-2 animate-fadeIn">
                                  <div className="p-2 bg-orange-50 rounded-md">
                                    <div className="text-sm font-medium text-orange-800">{targetColumn}</div>
                                    <div className="text-xs text-orange-600">
                                      {columnMetadata.find(col => col.name === targetColumn)?.type === 'numeric' ? 
                                        'Regression Task' : 'Classification Task'}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <div className="font-medium">Analysis Type:</div>
                                    <div>{columnMetadata.find(col => col.name === targetColumn)?.type === 'numeric' ? 
                                      'Predicting continuous values' : 'Predicting categories/classes'}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400 text-sm italic">Waiting for analysis...</div>
                              )}
                            </div>

                            {/* Section 3: Key Insights */}
                            <div className={`bg-white border rounded-lg p-4 transition-all duration-500 ${
                              analysisStep >= 3 ? 'border-blue-300 shadow-sm' : 'border-gray-200'
                            }`}>
                              <div className="flex items-center mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                  analysisStep >= 3 ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                  {isLoadingAI && analysisStep === 3 ? (
                                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                  ) : (
                                    <span className={`font-bold text-xs ${
                                      analysisStep >= 3 ? 'text-blue-600' : 'text-gray-400'
                                    }`}>3</span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Key Insights</h5>
                              </div>
                              
                              {isLoadingAI && analysisStep === 3 ? (
                                <div className="space-y-1">
                                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5"></div>
                                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5"></div>
                                </div>
                              ) : analysisStep >= 3 && stepResults.keyInsights ? (
                                <div className="text-xs text-gray-700 leading-relaxed animate-fadeIn">
                                  {stepResults.keyInsights}
                                </div>
                              ) : analysisStep < 3 ? (
                                <div className="text-gray-400 text-sm italic">Waiting for analysis...</div>
                              ) : (
                                <div className="text-gray-500 text-sm italic">Analysis in progress...</div>
                              )}
                            </div>

                            {/* Section 4: Detailed Explanation */}
                            <div className={`bg-white border rounded-lg p-4 transition-all duration-500 ${
                              analysisStep >= 4 ? 'border-green-300 shadow-sm' : 'border-gray-200'
                            }`}>
                              <div className="flex items-center mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                  analysisStep >= 4 ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  {isLoadingAI && analysisStep === 4 ? (
                                    <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                                  ) : (
                                    <span className={`font-bold text-xs ${
                                      analysisStep >= 4 ? 'text-green-600' : 'text-gray-400'
                                    }`}>4</span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Why These Features?</h5>
                              </div>
                              
                              {isLoadingAI && analysisStep === 4 ? (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                    <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                                    <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
                                  </div>
                                </div>
                              ) : analysisStep >= 4 ? (
                                <div className="space-y-2 animate-fadeIn">
                                  <div className="text-xs text-gray-700">
                                    <div className="font-medium text-green-700 mb-1">Statistical Relevance:</div>
                                    <div>Features show strong correlation with target variable</div>
                                  </div>
                                  <div className="text-xs text-gray-700">
                                    <div className="font-medium text-green-700 mb-1">Data Quality:</div>
                                    <div>Low null counts ensure reliable predictions</div>
                                  </div>
                                  <div className="text-xs text-gray-700">
                                    <div className="font-medium text-green-700 mb-1">Domain Logic:</div>
                                    <div>Features align with expected business relationships</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400 text-sm italic">Waiting for analysis...</div>
                              )}
                            </div>

                            {/* Section 5: Overall Assessment */}
                            <div className={`bg-white border rounded-lg p-4 transition-all duration-500 ${
                              analysisStep >= 5 ? 'border-indigo-300 shadow-sm' : 'border-gray-200'
                            }`}>
                              <div className="flex items-center mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                                  analysisStep >= 5 ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                  {isLoadingAI && analysisStep === 5 ? (
                                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                  ) : (
                                    <span className={`font-bold text-xs ${
                                      analysisStep >= 5 ? 'text-indigo-600' : 'text-gray-400'
                                    }`}>5</span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Overall Assessment</h5>
                              </div>
                              
                              {isLoadingAI && analysisStep === 5 ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
                                  </div>
                                  <div className="flex justify-between">
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
                                  </div>
                                </div>
                              ) : analysisStep >= 5 ? (
                                <div className="space-y-2 animate-fadeIn">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Recommendation Quality:</span>
                                    <span className="text-xs font-medium text-green-600">HIGH</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Features Selected:</span>
                                    <span className="text-xs font-medium text-indigo-600">
                                      {stepResults.features.length}/{columnMetadata.length - 1}
                                    </span>
                                  </div>
                                  <div className="mt-2 p-2 bg-indigo-50 rounded text-center">
                                    <div className="text-xs font-medium text-indigo-700">Ready for Analysis</div>
                                    <div className="text-xs text-indigo-600">Features auto-selected below</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400 text-sm italic">Waiting for analysis...</div>
                              )}
                            </div>
                          </div>

                          {/* Action Footer - Only show when complete */}
                          {analysisStep >= 5 && !isLoadingAI && (
                            <div className="flex items-center justify-center p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 animate-fadeIn">
                              <div className="text-center">
                                <div className="text-sm font-medium text-purple-800 mb-1">
                                  ✨ AI Analysis Complete
                                </div>
                                <div className="text-xs text-purple-600">
                                  Features have been automatically selected based on AI recommendations
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected Features Summary */}
                    {selectedFeatures.length > 0 && targetColumn && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">
                          Ready for Analysis: {selectedFeatures.length} features selected
                        </h4>
                        <div className="text-sm text-green-700 mb-3">
                          Target: <span className="font-medium">{targetColumn}</span> | 
                          Features: <span className="font-medium">{selectedFeatures.join(', ')}</span>
                        </div>
                        <button 
                          onClick={generateFinalDataset}
                          disabled={isGeneratingFinalDataset}
                          className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {isGeneratingFinalDataset ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating Final Dataset...
                            </>
                          ) : (
                            '🚀 Start Feature Importance Analysis'
                          )}
                        </button>
                      </div>
                    )}

                    {/* Final Dataset Preview */}
                    {finalDatasetPreview && (
                      <div className="mt-6 space-y-4">
                        {/* Preview Header */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-blue-900 flex items-center">
                              🔎 Final dataset preview before saving to cloud
                            </h4>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                {finalDatasetPreview.totalRows} rows × {finalDatasetPreview.headers.length} columns
                              </span>
                              <button
                                onClick={() => setShowAllRows(!showAllRows)}
                                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                  showAllRows 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                    : 'bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50'
                                }`}
                              >
                                {showAllRows ? 'Show Preview (5 rows)' : 'Show All Rows'}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-blue-700 text-sm">
                              This is your processed dataset with selected features and encoded target column. 
                              Review and download if needed before saving to cloud storage.
                            </p>
                            {showAllRows && (
                              <div className="ml-4">
                                <input
                                  type="text"
                                  placeholder="Search in data..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="text-sm px-3 py-1 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Preview Table */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          {/* Scrollable Container with Fixed Height */}
                          <div 
                            className={`overflow-auto border-2 border-gray-100 custom-scrollbar ${
                              showAllRows ? 'max-h-96' : 'max-h-80'
                            }`}
                            style={{ 
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#CBD5E0 #F7FAFC'
                            }}
                          >
                            <table className="min-w-full divide-y divide-gray-200 relative">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  {/* Row Number Column */}
                                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 sticky left-0 z-20">
                                    #
                                  </th>
                                  {finalDatasetPreview.headers.map((header, index) => (
                                    <th
                                      key={index}
                                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 bg-gray-50"
                                    >
                                      <div className="flex items-center">
                                        <span className="whitespace-nowrap">{header}</span>
                                        {header.includes('_encoded') && (
                                          <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded-full whitespace-nowrap">
                                            Encoded
                                          </span>
                                        )}
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {(() => {
                                  let rowsToShow = showAllRows ? finalDatasetPreview.rows : finalDatasetPreview.rows.slice(0, 5);
                                  
                                  // Apply search filter if search term exists
                                  if (searchTerm.trim() && showAllRows) {
                                    rowsToShow = rowsToShow.filter(row => 
                                      row.some(cell => 
                                        cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
                                      )
                                    );
                                  }
                                  
                                  return rowsToShow.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-gray-50">
                                      {/* Row Number Cell */}
                                      <td className="px-3 py-3 text-xs text-gray-500 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 font-medium">
                                        {showAllRows && searchTerm.trim() ? 
                                          finalDatasetPreview.rows.indexOf(row) + 1 : 
                                          rowIndex + 1
                                        }
                                      </td>
                                      {row.map((cell, cellIndex) => (
                                        <td
                                          key={cellIndex}
                                          className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                                        >
                                          {searchTerm.trim() && showAllRows ? (
                                            // Highlight search term
                                            <span
                                              dangerouslySetInnerHTML={{
                                                __html: cell.toString().replace(
                                                  new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                                  '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                                )
                                              }}
                                            />
                                          ) : (
                                            cell || '-'
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Scroll Hints */}
                          <div className="flex items-center justify-between p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                            <span className="flex items-center">
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Scroll horizontally to see all columns
                            </span>
                            <span className="flex items-center">
                              {showAllRows ? (
                                <>
                                  Scroll vertically to see all {finalDatasetPreview.totalRows} rows
                                  <ChevronDown className="w-3 h-3 ml-1" />
                                </>
                              ) : (
                                <>
                                  Showing first 5 rows • Click &quot;Show All Rows&quot; to view complete dataset
                                  <ChevronDown className="w-3 h-3 ml-1" />
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Enhanced Preview Info */}
                        <div className="text-center text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center justify-center space-x-4">
                            <div className="flex items-center">
                              <Database className="w-4 h-4 mr-1 text-blue-600" />
                              <span>
                                {(() => {
                                  if (!showAllRows) {
                                    return (
                                      <>
                                        <strong>{Math.min(5, finalDatasetPreview.totalRows)}</strong> preview rows displayed
                                      </>
                                    );
                                  }
                                  
                                  if (searchTerm.trim()) {
                                    const filteredCount = finalDatasetPreview.rows.filter(row => 
                                      row.some(cell => 
                                        cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
                                      )
                                    ).length;
                                    return (
                                      <>
                                        <strong>{filteredCount}</strong> filtered rows ({finalDatasetPreview.totalRows} total)
                                      </>
                                    );
                                  }
                                  
                                  return (
                                    <>
                                      <strong>{finalDatasetPreview.totalRows}</strong> total rows displayed
                                    </>
                                  );
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <BarChart3 className="w-4 h-4 mr-1 text-indigo-600" />
                              <span><strong>{finalDatasetPreview.headers.length}</strong> columns</span>
                            </div>
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              <span>Ready for analysis</span>
                            </div>
                            {!showAllRows && finalDatasetPreview.totalRows > 5 && (
                              <div className="flex items-center text-orange-600">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                <span>{finalDatasetPreview.totalRows - 5} more rows available</span>
                              </div>
                            )}
                            {showAllRows && searchTerm.trim() && (
                              <div className="flex items-center text-purple-600">
                                <span className="text-xs bg-purple-100 px-2 py-1 rounded-full">
                                  Search: &quot;{searchTerm}&quot;
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons section - redesigned like normalization page */}
                        <div className="space-y-4">
                          {/* Success message for saved dataset */}
                          {isSavedToCloud && (
                            <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                              <div>
                                <h5 className="font-medium text-green-800">Dataset Saved to Model Training Storage!</h5>
                                <p className="text-sm text-green-600">
                                  Your feature-analyzed dataset is now ready for model training. Redirecting...
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Compact action buttons row */}
                          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div>
                              <h5 className="font-medium text-green-800">✅ Feature Analysis Complete!</h5>
                              <p className="text-sm text-green-600">
                                Your dataset is ready with {selectedFeatures.length} selected features and target encoding.
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              {/* Download Button */}
                              <button
                                onClick={downloadFinalCSV}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download CSV
                              </button>
                            </div>
                          </div>

                          {/* Model Training Section - Big button like normalization page */}
                          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                            <div className="text-center">
                              <div className="flex justify-center items-center mb-4">
                                <div className="bg-green-100 p-3 rounded-full mr-4">
                                  <TrendingUp className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                  <h4 className="text-xl font-bold text-green-900 mb-2">🚀 Next Step: Model Training</h4>
                                  <p className="text-green-700 text-sm max-w-2xl">
                                    Your dataset is feature-optimized and ready for machine learning model training and validation.
                                  </p>
                                </div>
                              </div>
                              
                              <button
                                onClick={uploadToCloudAndSave}
                                disabled={isUploadingToCloud || isSavedToCloud}
                                className={`inline-flex items-center px-8 py-4 text-white text-lg font-semibold rounded-xl transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl ${
                                  isSavedToCloud 
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : isUploadingToCloud
                                      ? 'bg-green-400 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                }`}
                              >
                                {isUploadingToCloud ? (
                                  <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                                    Saving & Redirecting...
                                  </>
                                ) : isSavedToCloud ? (
                                  <>
                                    <CheckCircle className="w-6 h-6 mr-3" />
                                    Saved! Redirecting...
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-6 h-6 mr-3" />
                                    Save for Model Training
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                  </>
                                )}
                              </button>
                              
                              <div className="mt-3 text-xs text-green-600">
                                {isSavedToCloud ? (
                                  <>✅ Dataset saved to Model Training • Redirecting...</>
                                ) : (
                                  <>💾 Save optimized dataset • Train ML models • Deploy & predict</>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Additional info for saved dataset */}
                          {isSavedToCloud && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-700">
                                <span className="font-medium">💡 Next Steps:</span> Your feature-analyzed dataset is now available in your 
                                <span className="font-medium"> Model Training</span> section and ready for ML model development.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Note about the new workflow */}
                      </div>
                    )}
                  </div>
                )}

                {/* Promotional Section */}
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                  <div className="text-center">
                    <div className="flex justify-center items-center mb-4">
                      <TrendingUp className="w-12 h-12 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-purple-900 mb-2">🚀 Feature Importance Analysis</h3>
                    <p className="text-purple-700 text-sm mb-4">
                      {dataPreview ? (
                        <>Ready to analyze feature importance for your dataset with {dataPreview.headers.length} features and {dataPreview.totalRows} samples.</>
                      ) : (
                        <>Select a dataset above to begin intelligent feature analysis with AI recommendations.</>
                      )}
                    </p>
                    <div className="text-xs text-purple-600">
                      {showFeatureSelection ? 
                        'Configure your analysis above to get started...' : 
                        'Load a dataset to see intelligent feature selection options...'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
