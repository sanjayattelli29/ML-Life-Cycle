'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { PreprocessingContext } from './context/PreprocessingContext';
import { 
  CheckCircleIcon, 
  CogIcon, 
  ArrowDownTrayIcon, 
  PlayIcon, 
  ChartBarIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SparklesIcon,
  BeakerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, string | number>[];
}

const FLASK_API_URL = 'http://127.0.0.1:1290/preprocess';

const flaskPreprocessingOptions = [
  { 
    id: 'missing_values', 
    title: 'Missing Values', 
    description: 'Handle missing data using MICE (Multiple Imputation by Chained Equations)',
    icon: '🔍',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  { 
    id: 'duplicates', 
    title: 'Duplicate Records', 
    description: 'Remove duplicate records using bloom filter approach',
    icon: '🔄',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700'
  },
  { 
    id: 'invalid_data', 
    title: 'Invalid Data', 
    description: 'Fix invalid data using statistical tests (Chi-square)',
    icon: '⚠️',
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-50',
    textColor: 'text-yellow-700'
  },
  { 
    id: 'outliers', 
    title: 'Outliers', 
    description: 'Handle outliers using Isolation Forest',
    icon: '📊',
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-700'
  },
  { 
    id: 'inconsistent_formats', 
    title: 'Inconsistent Formats', 
    description: 'Standardize formats using regex validation',
    icon: '📝',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700'
  },
  { 
    id: 'cardinality', 
    title: 'Cardinality/Uniqueness', 
    description: 'Manage high cardinality using probabilistic counting',
    icon: '🎯',
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-700'
  },
  { 
    id: 'class_imbalance', 
    title: 'Class Imbalance', 
    description: 'Balance classes using SMOTE',
    icon: '⚖️',
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    textColor: 'text-pink-700'
  },
  { 
    id: 'data_type_mismatch', 
    title: 'Data Type Mismatch', 
    description: 'Fix data types using schema enforcement',
    icon: '🔧',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  },
  { 
    id: 'feature_correlation', 
    title: 'Feature Correlation', 
    description: 'Remove highly correlated features using Pearson correlation',
    icon: '🔗',
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    textColor: 'text-teal-700'
  },
  { 
    id: 'low_variance', 
    title: 'Low Variance Features', 
    description: 'Remove low variance features using VarianceThreshold',
    icon: '📉',
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    textColor: 'text-cyan-700'
  },
  { 
    id: 'mean_median_drift', 
    title: 'Mean-Median Drift', 
    description: 'Handle skewed distributions using percentage drift analysis',
    icon: '📈',
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-700'
  },
  { 
    id: 'range_violations', 
    title: 'Range Violations', 
    description: 'Fix range violations using domain-specific rules',
    icon: '🎚️',
    color: 'bg-violet-500',
    lightColor: 'bg-violet-50',
    textColor: 'text-violet-700'
  },
];

// Types for stats objects
type MissingValuesStats = { before: number; after: number; columns_dropped: number };
type DuplicatesStats = { before_count: number; after_count: number; removed: number };
type InvalidDataStats = { invalid_values_fixed: number };
type OutliersStats = { outliers_detected: number; method: string };
type InconsistentFormatsStats = { columns_fixed: number };
type CardinalityStats = { high_cardinality_columns: number; columns_modified: string[] };
type ClassImbalanceStats = { original_ratio: number; method: string; original_shape: number; new_shape: number };
type DataTypeMismatchStats = { columns_converted: number };
type FeatureCorrelationStats = { features_removed: number; removed_features: string[] };
type LowVarianceStats = { features_removed: number; removed_features: string[] };
type MeanMedianDriftStats = { columns_with_drift: number; transformed_columns: string[] };
type RangeViolationsStats = { violations_fixed: number };
type InfoType = {
  shape?: [number, number];
  numeric_columns?: string[] | string;
  categorical_columns?: string[] | string;
  datetime_columns?: string[] | string;
  missing_values?: number;
  data_types?: Record<string, string>;
};

export default function PreProcessing() {
  const { data: session } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [allFactors, setAllFactors] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCSV, setProcessedCSV] = useState<string | null>(null);
  const [preprocessingReport, setPreprocessingReport] = useState<Record<string, unknown> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentSummaryIndex, setCurrentSummaryIndex] = useState(0);
  const [showPreprocessedPreview, setShowPreprocessedPreview] = useState(false);
  const [preprocessedDataForPreview, setPreprocessedDataForPreview] = useState<{
    columns: Array<{name: string; type: string}>;
    data: Array<Record<string, unknown>>;
  } | null>(null);
  const [aiInsights, setAiInsights] = useState<Array<{
    factorName: string;
    beforeScore: string;
    afterScore: string;
    aiOpinion: string;
    suggestion: string;
  }>>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiProgress, setAiProgress] = useState(0);
  const [isUploadingToTransformation, setIsUploadingToTransformation] = useState(false);

  React.useEffect(() => {
    const fetchDatasets = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/datasets');
          if (!response.ok) {
            throw new Error('Failed to fetch datasets');
          }
          const data = await response.json();
          setDatasets(data);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to fetch datasets');
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchDatasets();
  }, [session?.user?.id]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      setError('');
      setProcessedCSV(null);
      setPreprocessingReport(null);
      setSelectedOptions([]);
      setAllFactors(false);
      setCurrentSummaryIndex(0); // Reset summary index when dataset changes
    } else {
      setCurrentDataset(null);
    }
  };

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleAllFactorsToggle = () => {
    setAllFactors(val => {
      if (!val) setSelectedOptions([]);
      return !val;
    });
  };

  function datasetToCSV(dataset: Dataset): string {
    const headers = dataset.columns.map(col => col.name).join(',');
    const rows = dataset.data.map(row =>
      dataset.columns.map(col => row[col.name]).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  const handlePreprocess = async () => {
    if (!currentDataset) return;
    if (!allFactors && selectedOptions.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('Preparing data...');
    setProcessedCSV(null);
    setPreprocessingReport(null);
    try {
      // Convert dataset to CSV
      const csvData = datasetToCSV(currentDataset);
      setProcessingStatus('Sending data to backend...');
      const payload: { csvData: string; config: Record<string, boolean> } = {
        csvData,
        config: {},
      };
      if (allFactors) {
        // No need to filter config, use all
      } else {
        // Only enable selected factors in config
        flaskPreprocessingOptions.forEach(opt => {
          payload.config[opt.id] = selectedOptions.includes(opt.id);
        });
      }
      // Optionally, add targetColumn if needed
      // payload.targetColumn = ...
      const response = await fetch(FLASK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to preprocess dataset');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Preprocessing failed');
      }
      setProcessingStatus('Processing complete!');
      setProcessedCSV(result.processed_data);
      setPreprocessingReport(result.preprocessing_report);
      toast.success('Preprocessing complete!');
    } catch (err) {
      setProcessingStatus('');
      setProcessedCSV(null);
      setPreprocessingReport(null);
      toast.error(err instanceof Error ? err.message : 'Preprocessing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadProcessedData = () => {
    if (!processedCSV) return;
    const blob = new Blob([processedCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_${currentDataset?.name || 'dataset'}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Download started!');
  };

  // Parse processed CSV for preview
  const parseProcessedCSV = (csvData: string) => {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(',');
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      return row;
    });

    // Infer column types from data
    const columns = headers.map(header => {
      const sampleValues = dataRows.slice(0, 10).map(row => row[header]);
      let type = 'string';
      
      // Check if all non-empty values are numbers
      const nonEmptyValues = sampleValues.filter(val => val !== '' && val !== null && val !== undefined);
      if (nonEmptyValues.length > 0) {
        const allNumbers = nonEmptyValues.every(val => !isNaN(Number(val)));
        if (allNumbers) {
          type = 'number';
        }
      }
      
      return { name: header, type };
    });

    return { columns, data: dataRows };
  };

  // Show preprocessed data preview
  const showPreprocessedDataPreview = () => {
    if (!processedCSV) {
      toast.error('No processed data available');
      return;
    }

    const parsedData = parseProcessedCSV(processedCSV);
    if (!parsedData) {
      toast.error('Failed to parse processed data');
      return;
    }

    setPreprocessedDataForPreview(parsedData);
    setShowPreprocessedPreview(true);
    toast.success('Showing preprocessed data preview');
  };

  // Download preprocessing report
  const downloadPreprocessingReport = () => {
    if (!preprocessingReport) return;
    const reportContent = JSON.stringify(preprocessingReport, null, 2);
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preprocessing_report_${currentDataset?.name || 'dataset'}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Preprocessing report downloaded!');
  };

  // Download AI insights report
  const downloadAIInsights = () => {
    if (!aiInsights.length) return;
    const reportContent = aiInsights.map((insight, index) => 
      `${index + 1}. ${insight.factorName}\n\nBefore Score: ${insight.beforeScore}\nAfter Score: ${insight.afterScore}\n\nAI Opinion:\n${insight.aiOpinion}\n\nSuggestion:\n${insight.suggestion}\n\n${'='.repeat(80)}\n`
    ).join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_insights_${currentDataset?.name || 'dataset'}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('AI insights downloaded!');
  };

  // Strip markdown formatting
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/[#*_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-+*]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .trim();
  };

  // Mistral API call for a single factor with Groq fallback
  const getSingleFactorInsight = async (
    factorName: string,
    beforeStats: Record<string, unknown>,
    afterStats: Record<string, unknown>,
    description: string
  ): Promise<{
    factorName: string;
    beforeScore: string;
    afterScore: string;
    aiOpinion: string;
    suggestion: string;
  }> => {
    const prompt = `You are an expert data scientist. For the preprocessing factor "${factorName}", provide insights based on the before and after statistics.

Factor Description: ${description}
Before Stats: ${JSON.stringify(beforeStats)}
After Stats: ${JSON.stringify(afterStats)}

Please provide your response in exactly this format:
FACTOR_NAME: ${factorName}
BEFORE_SCORE: [extract key metric from before stats]
AFTER_SCORE: [extract key metric from after stats]
AI_OPINION: [your professional opinion on the improvement]
SUGGESTION: [actionable suggestions for future preprocessing]`;

    // Try Mistral API first
    try {
      const mistralApiKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY;
      
      if (!mistralApiKey) {
        throw new Error('Mistral API key not found');
      }

      console.log('Making Mistral API request for factor:', factorName);
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralApiKey}`,
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          temperature: 0.3,
          max_tokens: 600,
          messages: [
            { role: 'system', content: 'You are an expert data scientist. Provide clear, actionable, and concise insights.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      console.log('Mistral API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mistral API error:', errorText);
        throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Mistral API response:', data);
      
      const content = stripMarkdown(data.choices?.[0]?.message?.content || '');
      
      if (!content) {
        throw new Error('No content received from Mistral API');
      }
      
      return parseAIResponse(content, factorName);
      
    } catch (mistralError) {
      console.error('Mistral API failed, trying Groq fallback:', mistralError);
      
      // Fallback to Groq API
      try {
        const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        
        if (!groqApiKey) {
          throw new Error('Both Mistral and Groq API keys not found');
        }

        console.log('Making Groq API request for factor:', factorName);
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            temperature: 0.3,
            max_tokens: 600,
            messages: [
              { role: 'system', content: 'You are an expert data scientist. Provide clear, actionable, and concise insights.' },
              { role: 'user', content: prompt }
            ]
          })
        });

        console.log('Groq API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Groq API error:', errorText);
          throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Groq API response:', data);
        
        const content = stripMarkdown(data.choices?.[0]?.message?.content || '');
        
        if (!content) {
          throw new Error('No content received from Groq API');
        }
        
        return parseAIResponse(content, factorName);
        
      } catch (groqError) {
        console.error('Both Mistral and Groq APIs failed:', groqError);
        throw new Error(`AI APIs failed: ${mistralError.message} | ${groqError.message}`);
      }
    }
  };

  // Helper function to parse AI response
  const parseAIResponse = (content: string, factorName: string) => {
    // Parse the structured response
    const lines = content.split('\n').filter(line => line.trim());
    const factorNameParsed = factorName;
    let beforeScore = 'N/A';
    let afterScore = 'N/A';
    let aiOpinion = 'No opinion provided';
    let suggestion = 'No suggestions provided';

    lines.forEach(line => {
      if (line.includes('BEFORE_SCORE:')) {
        beforeScore = line.split('BEFORE_SCORE:')[1]?.trim() || 'N/A';
      } else if (line.includes('AFTER_SCORE:')) {
        afterScore = line.split('AFTER_SCORE:')[1]?.trim() || 'N/A';
      } else if (line.includes('AI_OPINION:')) {
        aiOpinion = line.split('AI_OPINION:')[1]?.trim() || 'No opinion provided';
      } else if (line.includes('SUGGESTION:')) {
        suggestion = line.split('SUGGESTION:')[1]?.trim() || 'No suggestions provided';
      }
    });

    // If structured parsing fails, provide fallback content
    if (beforeScore === 'N/A' && afterScore === 'N/A' && aiOpinion === 'No opinion provided') {
      const sentences = content.split('.').filter(s => s.trim());
      if (sentences.length > 0) {
        aiOpinion = sentences.slice(0, 2).join('. ') + '.';
        suggestion = sentences.slice(-2).join('. ') + '.';
        beforeScore = 'Processing started';
        afterScore = 'Improved';
      }
    }

    return {
      factorName: factorNameParsed,
      beforeScore,
      afterScore,
      aiOpinion,
      suggestion
    };
  };

  // Get AI Insights for all selected factors
  const getAIInsights = async () => {
    if (!preprocessingReport || !currentDataset) {
      toast.error('No preprocessing results available');
      return;
    }
    
    const selectedFactors = getSelectedFactorKeys();
    if (selectedFactors.length === 0) {
      toast.error('No preprocessing factors were selected');
      return;
    }
    
    setLoadingAI(true);
    setAiError('');
    setAiInsights([]);
    setAiProgress(0);

    console.log('Starting AI insights generation for factors:', selectedFactors);

    try {
      const stats = preprocessingReport.preprocessing_stats as Record<string, Record<string, unknown>>;
      const insights: Array<{
        factorName: string;
        beforeScore: string;
        afterScore: string;
        aiOpinion: string;
        suggestion: string;
      }> = [];

      for (let i = 0; i < selectedFactors.length; i++) {
        const factorKey = selectedFactors[i];
        const factorOption = flaskPreprocessingOptions.find(opt => opt.id === factorKey);
        const factorStats = stats[factorKey];

        console.log(`Processing factor ${i + 1}/${selectedFactors.length}: ${factorKey}`, { factorOption, factorStats });

        if (factorOption && factorStats) {
          setAiProgress(i + 1);
          
          try {
            const insight = await getSingleFactorInsight(
              factorOption.title,
              { before: 'Processing started' },
              factorStats,
              factorOption.description
            );
            
            insights.push(insight);
            console.log(`Successfully generated insight for ${factorOption.title}:`, insight);
          } catch (factorError) {
            console.error(`Failed to generate insight for ${factorOption.title}:`, factorError);
            // Add a fallback insight
            insights.push({
              factorName: factorOption.title,
              beforeScore: 'N/A',
              afterScore: 'Processed',
              aiOpinion: `Processing applied successfully for ${factorOption.title}.`,
              suggestion: 'Consider monitoring the results and adjusting parameters if needed.'
            });
          }
        } else {
          console.warn(`Missing data for factor: ${factorKey}`, { factorOption, factorStats });
        }
        
        // Small delay to avoid rate limiting
        if (i < selectedFactors.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setAiInsights(insights);
      toast.success(`AI Insights generated for ${insights.length} factors!`);
    } catch (err) {
      console.error('Error in getAIInsights:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI insights';
      setAiError(errorMessage);
      toast.error('Failed to get AI insights: ' + errorMessage);
    } finally {
      setLoadingAI(false);
      setAiProgress(0);
    }
  };

  // Proceed to Data Transformation
  const proceedToDataTransformation = async () => {
    if (!processedCSV || !currentDataset || !preprocessingReport) {
      toast.error('No processed data available');
      return;
    }

    setIsUploadingToTransformation(true);

    try {
      // Get selected processing steps
      const selectedFactors = getSelectedFactorKeys();
      
      console.log('About to upload dataset:', {
        csvDataLength: processedCSV.length,
        datasetName: currentDataset.name,
        selectedFactors,
        hasReport: !!preprocessingReport
      });
      
      // Ensure CSV data is properly formatted (remove any BOM or special characters)
      const cleanCsvData = processedCSV.replace(/^\ufeff/, ''); // Remove BOM if present
      
      // Upload to R2 and save to MongoDB
      const response = await fetch('/api/transformed-datasets/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies for authentication
        body: JSON.stringify({
          csvData: cleanCsvData,
          originalDatasetName: currentDataset.name,
          processingSteps: selectedFactors,
          preprocessingReport: preprocessingReport
        }),
      });

      if (!response.ok) {
        // Try to get detailed error information
        let errorMessage = 'Failed to upload dataset to cloud storage';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('Upload API error response:', errorData);
          
          // Provide more specific error messages
          if (errorMessage.includes('MongoDB connection is not ready')) {
            errorMessage = 'Database connection issue - please try again in a moment';
          } else if (errorMessage.includes('timeout')) {
            errorMessage = 'Connection timeout - please check your internet and try again';
          } else if (errorMessage.includes('Database connection failed')) {
            errorMessage = 'Database error - please try again or contact support';
          }
        } catch {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            console.error('Upload API error text:', errorText);
            if (errorText.includes('timeout')) {
              errorMessage = 'Database connection timeout - please try again';
            } else if (errorText.includes('MongoDB')) {
              errorMessage = 'Database error - please check your connection';
            } else if (errorText.includes('500')) {
              errorMessage = 'Server error - please try again in a moment';
            }
          } catch {
            console.error('Could not parse error response');
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Dataset uploaded to cloud storage successfully!');
        
        // Navigate to Data Transformation page
        window.location.href = '/dashboard/data-transformation';
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload dataset');
    } finally {
      setIsUploadingToTransformation(false);
    }
  };

  // Helper to get selected factor keys
  const getSelectedFactorKeys = () => {
    if (allFactors) {
      return flaskPreprocessingOptions.map(opt => opt.id);
    }
    return selectedOptions;
  };

  // Helper to get summary data for each factor
  const getSummaryTables = () => {
    if (!preprocessingReport) return [];
    type SummaryObj = Record<string, string | number | string[] | number[] | undefined>;
    const stats = (preprocessingReport.preprocessing_stats || {}) as SummaryObj;
    const log = (preprocessingReport.preprocessing_log || []) as string[];
    const info = (preprocessingReport.final_dataset_info || {}) as InfoType;
    const factorKeys = getSelectedFactorKeys();
    const tables: Array<{ title: string; rows: Array<{ label: string; value: string | number | undefined }> }> = [];
    for (const key of factorKeys) {
      let title = '';
      let rows: Array<{ label: string; value: string | number | undefined }> = [];
      switch (key) {
        case 'missing_values':
          title = 'Missing Values Summary';
          if (stats['missing_values']) {
            const mv = stats['missing_values'] as unknown as MissingValuesStats;
            rows = [
              { label: 'Missing Before', value: mv.before },
              { label: 'Missing After', value: mv.after },
              { label: 'Columns Dropped', value: mv.columns_dropped },
            ];
          }
          break;
        case 'duplicates':
          title = 'Duplicate Records Summary';
          if (stats['duplicates']) {
            const d = stats['duplicates'] as unknown as DuplicatesStats;
            rows = [
              { label: 'Before Count', value: d.before_count },
              { label: 'After Count', value: d.after_count },
              { label: 'Removed', value: d.removed },
            ];
          }
          break;
        case 'invalid_data':
          title = 'Invalid Data Summary';
          if (stats['invalid_data']) {
            const id = stats['invalid_data'] as unknown as InvalidDataStats;
            rows = [
              { label: 'Invalid Values Fixed', value: id.invalid_values_fixed },
            ];
          }
          break;
        case 'outliers':
          title = 'Outliers Summary';
          if (stats['outliers']) {
            const o = stats['outliers'] as unknown as OutliersStats;
            rows = [
              { label: 'Outliers Detected', value: o.outliers_detected },
              { label: 'Method', value: o.method },
            ];
          }
          break;
        case 'inconsistent_formats':
          title = 'Inconsistent Formats Summary';
          if (stats['inconsistent_formats']) {
            const inc = stats['inconsistent_formats'] as unknown as InconsistentFormatsStats;
            rows = [
              { label: 'Columns Fixed', value: inc.columns_fixed },
            ];
          }
          break;
        case 'cardinality':
          title = 'Cardinality/Uniqueness Summary';
          if (stats['cardinality']) {
            const c = stats['cardinality'] as unknown as CardinalityStats;
            rows = [
              { label: 'High Cardinality Columns', value: c.high_cardinality_columns },
              { label: 'Columns Modified', value: Array.isArray(c.columns_modified) ? c.columns_modified.join(', ') : String(c.columns_modified) },
            ];
          }
          break;
        case 'class_imbalance':
          title = 'Class Imbalance Summary';
          if (stats['class_imbalance']) {
            const ci = stats['class_imbalance'] as unknown as ClassImbalanceStats;
            rows = [
              { label: 'Original Ratio', value: ci.original_ratio },
              { label: 'Method', value: ci.method },
              { label: 'Original Shape', value: ci.original_shape },
              { label: 'New Shape', value: ci.new_shape },
            ];
          }
          break;
        case 'data_type_mismatch':
          title = 'Data Type Mismatch Summary';
          if (stats['data_type_mismatch']) {
            const dtm = stats['data_type_mismatch'] as unknown as DataTypeMismatchStats;
            rows = [
              { label: 'Columns Converted', value: dtm.columns_converted },
            ];
          }
          break;
        case 'feature_correlation':
          title = 'Feature Correlation Summary';
          if (stats['feature_correlation']) {
            const fc = stats['feature_correlation'] as unknown as FeatureCorrelationStats;
            rows = [
              { label: 'Features Removed', value: fc.features_removed },
              { label: 'Removed Features', value: Array.isArray(fc.removed_features) ? fc.removed_features.join(', ') : String(fc.removed_features) },
            ];
          }
          break;
        case 'low_variance':
          title = 'Low Variance Features Summary';
          if (stats['low_variance']) {
            const lv = stats['low_variance'] as unknown as LowVarianceStats;
            rows = [
              { label: 'Features Removed', value: lv.features_removed },
              { label: 'Removed Features', value: Array.isArray(lv.removed_features) ? lv.removed_features.join(', ') : String(lv.removed_features) },
            ];
          }
          break;
        case 'mean_median_drift':
          title = 'Mean-Median Drift Summary';
          if (stats['mean_median_drift']) {
            const mmd = stats['mean_median_drift'] as unknown as MeanMedianDriftStats;
            rows = [
              { label: 'Columns With Drift', value: mmd.columns_with_drift },
              { label: 'Transformed Columns', value: Array.isArray(mmd.transformed_columns) ? mmd.transformed_columns.join(', ') : String(mmd.transformed_columns) },
            ];
          }
          break;
        case 'range_violations':
          title = 'Range Violations Summary';
          if (stats['range_violations']) {
            const rv = stats['range_violations'] as unknown as RangeViolationsStats;
            rows = [
              { label: 'Violations Fixed', value: rv.violations_fixed },
            ];
          }
          break;
        default:
          title = key;
          rows = [];
      }
      // Add log lines for this factor
      const logLines = log.filter((l: string) => l.toLowerCase().includes(key.replace(/_/g, ' ')));
      if (logLines.length > 0) {
        rows.push({ label: 'Log', value: logLines.join('; ') });
      }
      tables.push({ title, rows });
    }
    // Always add a final dataset info table at the end
    tables.push({
      title: 'Final Dataset Info',
      rows: [
        { label: 'Rows', value: info.shape ? info.shape[0] : '' },
        { label: 'Columns', value: info.shape ? info.shape[1] : '' },
        { label: 'Numeric Columns', value: Array.isArray(info.numeric_columns) ? info.numeric_columns.join(', ') : String(info.numeric_columns || '') },
        { label: 'Categorical Columns', value: Array.isArray(info.categorical_columns) ? info.categorical_columns.join(', ') : String(info.categorical_columns || '') },
        { label: 'Datetime Columns', value: Array.isArray(info.datetime_columns) ? info.datetime_columns.join(', ') : String(info.datetime_columns || '') },
        { label: 'Missing Values', value: info.missing_values },
        { label: 'Data Types', value: info.data_types ? Object.entries(info.data_types).map(([k, v]) => `${k}: ${v}`).join('; ') : '' },
      ],
    });
    return tables;
  };

  const summaryTables = getSummaryTables();
  const showSlider = summaryTables.length > 1;

  // Render summary tables UI
  const renderSummaryTables = () => {
    if (!preprocessingReport) return null;
    
    if (showSlider) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
              onClick={() => setCurrentSummaryIndex(i => Math.max(0, i - 1))}
              disabled={currentSummaryIndex === 0}
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Previous
            </button>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                {summaryTables[currentSummaryIndex]?.title}
              </h3>
              <div className="flex items-center justify-center space-x-1">
                {summaryTables.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentSummaryIndex ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <button
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
              onClick={() => setCurrentSummaryIndex(i => Math.min(summaryTables.length - 1, i + 1))}
              disabled={currentSummaryIndex === summaryTables.length - 1}
            >
              Next
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryTables[currentSummaryIndex]?.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 text-center text-sm text-gray-500">
            {currentSummaryIndex + 1} of {summaryTables.length} summaries
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-lg text-gray-800 mb-4">
            {summaryTables[0]?.title}
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryTables[0]?.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
            <h2 className="text-lg font-semibold text-gray-800">Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const contextValue = {
    dataset: currentDataset,
    setProcessedData: () => {},
    setProcessingStatus,
    setIsProcessing
  };

  return (
    <PreprocessingContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <BeakerIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Data Preprocessing</h1>
                <p className="text-gray-600 mt-1">Transform your data with intelligent preprocessing techniques</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Dataset Selection Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <DocumentMagnifyingGlassIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Select Dataset</h2>
                <p className="text-gray-600 text-sm">Choose your dataset to begin preprocessing</p>
              </div>
            </div>
            
            <select
              className="w-full p-3 border border-gray-300 rounded-md text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              onChange={handleDatasetChange}
              value={currentDataset?._id || ''}
            >
              <option value="" className="text-gray-500">Select a dataset to get started</option>
              {datasets.map((dataset) => (
                <option key={dataset._id} value={dataset._id} className="text-gray-700">
                  {dataset.name} ({dataset.data.length} rows, {dataset.columns.length} columns)
                </option>
              ))}
            </select>
          </div>
          {/* Preprocessing Options */}
          {currentDataset && (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <CogIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">Preprocessing Options</h2>
                      <p className="text-gray-600 text-sm">Select preprocessing techniques to optimize your data</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="all-factors"
                      checked={allFactors}
                      onChange={handleAllFactorsToggle}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="all-factors" className="text-sm font-medium text-gray-700">
                      Apply All Factors (Recommended)
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {flaskPreprocessingOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        allFactors 
                          ? 'bg-blue-50 border-blue-200 opacity-75' 
                          : selectedOptions.includes(option.id)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => !allFactors && handleOptionToggle(option.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={allFactors || selectedOptions.includes(option.id)}
                          disabled={allFactors}
                          onChange={() => {}}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">{option.icon}</span>
                            <h3 className="font-medium text-gray-900">{option.title}</h3>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Status and Action Section */}
                <div className="space-y-4">
                  {processingStatus && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <ClockIcon className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-blue-800 font-medium">{processingStatus}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center text-gray-600">
                      <SparklesIcon className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {allFactors 
                          ? 'All 12 factors selected' 
                          : `${selectedOptions.length} factor${selectedOptions.length !== 1 ? 's' : ''} selected`
                        }
                      </span>
                    </div>
                    
                    <div className="flex gap-3">
                      {processedCSV && (
                        <>
                          <button
                            onClick={downloadProcessedData}
                            className="flex items-center px-4 py-2 bg-white border border-green-500 text-green-600 font-medium rounded-md hover:bg-green-50 transition-colors"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            Download CSV
                          </button>
                          <button
                            onClick={showPreprocessedDataPreview}
                            className="flex items-center px-4 py-2 bg-white border border-purple-500 text-purple-600 font-medium rounded-md hover:bg-purple-50 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            Preview
                          </button>
                        </>
                      )}
                      
                      {preprocessingReport && (
                        <button
                          onClick={downloadPreprocessingReport}
                          className="flex items-center px-4 py-2 bg-white border border-blue-500 text-blue-600 font-medium rounded-md hover:bg-blue-50 transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                          Download Report
                        </button>
                      )}
                      
                      <button
                        onClick={handlePreprocess}
                        disabled={(!allFactors && selectedOptions.length === 0) || isProcessing}
                        className={`flex items-center px-6 py-2 font-medium rounded-md transition-colors ${
                          (!allFactors && selectedOptions.length === 0) || isProcessing
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <PlayIcon className="w-4 h-4 mr-2" />
                            Preprocess Dataset
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proceed to Data Transformation Button */}
              {preprocessingReport && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-3 rounded-lg mr-4">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">Ready for Data Transformation</h3>
                        <p className="text-gray-600 text-sm">Your data has been preprocessed successfully. Take it to the next level with advanced transformations.</p>
                      </div>
                    </div>
                    <button
                      onClick={proceedToDataTransformation}
                      disabled={isUploadingToTransformation}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingToTransformation ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading to Cloud...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Proceed to Data Transformation
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {preprocessingReport && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-lg mr-3">
                        <ChartBarIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">Preprocessing Results</h2>
                        <p className="text-gray-600 text-sm">Detailed analysis of data transformations applied</p>
                      </div>
                    </div>
                    <div className="flex items-center bg-white rounded-lg px-3 py-2 border border-green-200">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-green-700">Processing Complete!</span>
                    </div>
                  </div>
                  
                  {renderSummaryTables()}
                </div>
              )}

              {/* AI Insights Section */}
              {preprocessingReport && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">AI Insights</h2>
                        <p className="text-gray-600 text-sm">Get expert analysis of your preprocessing results</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={getAIInsights}
                        disabled={loadingAI}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingAI ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating... ({aiProgress}/{getSelectedFactorKeys().length})
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate AI Insights
                          </>
                        )}
                      </button>
                      {aiInsights.length > 0 && (
                        <button
                          onClick={downloadAIInsights}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                          Download Report
                        </button>
                      )}
                    </div>
                  </div>

                  {aiError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-red-700 font-medium">Error generating insights:</span>
                      </div>
                      <p className="text-red-600 mt-1">{aiError}</p>
                    </div>
                  )}

                  {aiInsights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {aiInsights.map((insight, index) => (
                        <div key={index} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800 text-lg">{insight.factorName}</h3>
                            <div className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">
                              #{index + 1}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Before</p>
                                <p className="text-sm text-red-800 font-semibold mt-1">{insight.beforeScore}</p>
                              </div>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">After</p>
                                <p className="text-sm text-green-800 font-semibold mt-1">{insight.afterScore}</p>
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">AI Opinion</p>
                              <p className="text-sm text-blue-800 leading-relaxed">{insight.aiOpinion}</p>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide mb-2">Suggestion</p>
                              <p className="text-sm text-yellow-800 leading-relaxed">{insight.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !loadingAI && (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No AI Insights Generated</h3>
                      <p className="text-gray-600 mb-4">Click &quot;Generate AI Insights&quot; to get expert analysis of your preprocessing results</p>
                    </div>
                  )}
                </div>
              )}

              {/* Dataset Preview */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <EyeIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">Dataset Preview</h2>
                      <p className="text-gray-600 text-sm">Explore your data structure and content</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 px-3 py-1 rounded-md">
                      <span className="text-xs font-medium text-gray-700">
                        {currentDataset.data.length} rows
                      </span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-md">
                      <span className="text-xs font-medium text-gray-700">
                        {currentDataset.columns.length} columns
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {currentDataset.columns.map((column) => (
                          <th
                            key={column.name}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                          >
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                              {column.name}
                              <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                {column.type}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentDataset.data.slice(currentPage * 10, (currentPage * 10) + 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {currentDataset.columns.map((column) => (
                            <td
                              key={column.name}
                              className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-r border-gray-100 last:border-r-0"
                            >
                              <div 
                                className="max-w-xs truncate" 
                                title={row[column.name]?.toString() || 'N/A'}
                              >
                                {row[column.name]?.toString() || (
                                  <span className="text-gray-400 italic">N/A</span>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Simple Pagination Controls */}
                <div className="flex items-center justify-between mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600">
                    <DocumentMagnifyingGlassIcon className="w-4 h-4 text-gray-500 mr-2" />
                    <span>
                      Showing {(currentPage * 10) + 1} to {Math.min((currentPage * 10) + 10, currentDataset.data.length)} of {currentDataset.data.length} entries
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.ceil(currentDataset.data.length / 10) }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`w-8 h-8 text-sm font-medium rounded-md transition-colors ${
                            currentPage === i
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      )).slice(
                        Math.max(0, currentPage - 2),
                        Math.min(Math.ceil(currentDataset.data.length / 10), currentPage + 3)
                      )}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(currentDataset.data.length / 10) - 1, currentPage + 1))}
                      disabled={currentPage >= Math.ceil(currentDataset.data.length / 10) - 1}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRightIcon className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Preprocessed Dataset Preview */}
              {showPreprocessedPreview && preprocessedDataForPreview && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-lg mr-3">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">Preprocessed Dataset Preview</h2>
                        <p className="text-gray-600 text-sm">View your transformed data after preprocessing</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShowPreprocessedPreview(false)}
                        className="flex items-center px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Close Preview
                      </button>
                      <div className="bg-green-100 px-3 py-1 rounded-md">
                        <span className="text-xs font-medium text-green-700">
                          {preprocessedDataForPreview.data.length} rows
                        </span>
                      </div>
                      <div className="bg-green-100 px-3 py-1 rounded-md">
                        <span className="text-xs font-medium text-green-700">
                          {preprocessedDataForPreview.columns.length} columns
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-green-50">
                        <tr>
                          {preprocessedDataForPreview.columns.map((column) => (
                            <th
                              key={column.name}
                              className="px-4 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider border-r border-green-200 last:border-r-0"
                            >
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                {column.name}
                                <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                                  {column.type}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {preprocessedDataForPreview.data.slice(currentPage * 10, (currentPage * 10) + 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-green-50">
                            {preprocessedDataForPreview.columns.map((column) => (
                              <td
                                key={column.name}
                                className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-r border-gray-100 last:border-r-0"
                              >
                                <div 
                                  className="max-w-xs truncate" 
                                  title={row[column.name]?.toString() || 'N/A'}
                                >
                                  {row[column.name]?.toString() || (
                                    <span className="text-gray-400 italic">N/A</span>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Preprocessed Data */}
                  <div className="flex items-center justify-between mt-6 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center text-sm text-green-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-600 mr-2" />
                      <span>
                        Showing {(currentPage * 10) + 1} to {Math.min((currentPage * 10) + 10, preprocessedDataForPreview.data.length)} of {preprocessedDataForPreview.data.length} processed entries
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.ceil(preprocessedDataForPreview.data.length / 10) }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-8 h-8 text-sm font-medium rounded-md transition-colors ${
                              currentPage === i
                                ? 'bg-green-600 text-white'
                                : 'text-green-700 bg-white border border-green-300 hover:bg-green-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        )).slice(
                          Math.max(0, currentPage - 2),
                          Math.min(Math.ceil(preprocessedDataForPreview.data.length / 10), currentPage + 3)
                        )}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(Math.ceil(preprocessedDataForPreview.data.length / 10) - 1, currentPage + 1))}
                        disabled={currentPage >= Math.ceil(preprocessedDataForPreview.data.length / 10) - 1}
                        className="flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PreprocessingContext.Provider>
  );
}
