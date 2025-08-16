'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import {
  Database,
  RefreshCw,
  AlertCircle,
  Brain,
  Download,
  Eye,
  ChevronDown,
  Play,
  Zap,
  Settings,
  CheckCircle,
  Save,
  BarChart3,
  Activity,
  Target,
  Shield
} from 'lucide-react';

// Frontend Dataset Interface (from R2 storage - same as feature importance)
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

// Backend Dataset Interface (from Python API)
interface BackendDataset {
  filename: string;
  shape: [number, number]; // [rows, columns]
  size_mb: number;
  columns: string[];
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
    min?: number;
    max?: number;
    mean?: number;
    std?: number;
    nullCount?: number;
    uniqueCount?: number;
    samples?: string[];
    mostFrequent?: string;
  };
}

interface GanConfiguration {
  model_type: 'CTGAN' | 'GaussianCopula' | 'CopulaGAN';
  sample_size: number;
  target_column: string | null;
}

// Backend Response Interfaces (matching Python API)
interface GANGenerationResponse {
  message: string;
  synthetic_filename: string;
  report_filename: string;
  summary: {
    original_shape: [number, number];
    synthetic_shape: [number, number];
    overall_quality_score: number;
    processing_time_seconds: number;
  };
  full_report: {
    timestamp: string;
    filename: string;
    model_type: string;
    target_column: string | null;
    steps: {
      '1_analysis': Record<string, unknown>;
      '2_preprocessing': Record<string, unknown>;
      '3_generation': Record<string, unknown>;
      '4_evaluation': Record<string, unknown>;
      '5_saving': Record<string, unknown>;
    };
  };
}

interface QualityMetrics {
  overall_score: number;
  statistical_similarity: Record<string, {
    ks_statistic?: number;
    p_value?: number;
    similarity_score: number;
    error?: string;
  }>;
  distribution_similarity: Record<string, {
    jensen_shannon_divergence?: number;
    similarity_score: number;
    error?: string;
  }>;
  correlation_similarity: {
    correlation_coefficient?: number;
    similarity_score: number;
    error?: string;
  };
  privacy_metrics: {
    mean_min_distance?: number;
    std_min_distance?: number;
    privacy_score: number;
    error?: string;
  };
  utility_metrics: {
    tstr_accuracy?: number;
    trtr_accuracy?: number;
    utility_ratio?: number;
    utility_score: number;
    error?: string;
  };
}

interface SyntheticDataResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
  csvContent: string;
  quality: QualityMetrics;
  report: GANGenerationResponse;
}

interface AIInsight {
  question: string;
  answer: string;
  icon: string;
}

export default function GansSyntheticData() {
  const { data: session } = useSession();
  
  // Frontend datasets (from R2 storage - same as feature importance)
  const [datasets, setDatasets] = useState<TransformedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<TransformedDataset | null>(null);
  
  // Backend datasets (from Python API)
  const [backendDatasets, setBackendDatasets] = useState<BackendDataset[]>([]);
  const [selectedBackendDataset, setSelectedBackendDataset] = useState<BackendDataset | null>(null);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // GAN Configuration (synced with backend)
  const [ganConfig, setGanConfig] = useState<GanConfiguration>({
    model_type: 'CTGAN',
    sample_size: 1000,
    target_column: null
  });
  
  // Column analysis states
  const [columnMetadata, setColumnMetadata] = useState<ColumnMetadata[]>([]);
  const [isAnalyzingColumns, setIsAnalyzingColumns] = useState(false);
  const [showGanConfiguration, setShowGanConfiguration] = useState(false);
  const [targetColumnOptions, setTargetColumnOptions] = useState<string[]>([]);
  
  // Training and generation states (connected to backend)
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [syntheticData, setSyntheticData] = useState<SyntheticDataResult | null>(null);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [isSavedToCloud, setIsSavedToCloud] = useState(false);

  // AI Insights states
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions] = useState(6);

  // Backend API URL - Python Flask server
  const BACKEND_URL = 'http://localhost:4321';

  // AI Insights Generation Function - Sequential Question Processing
  const generateAIInsights = async () => {
    if (!syntheticData) return;
    
    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
      toast.error('GROQ API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to your environment variables.');
      return;
    }
    
    console.log('🚀 Starting AI insights generation with API key:', apiKey.substring(0, 20) + '...');
    
    setIsGeneratingInsights(true);
    setShowAiInsights(true);
    setAiInsights([]); // Clear previous insights
    setCurrentQuestionIndex(0);
    
    const questions = [
      {
        key: 'opinion',
        question: 'What is your overall assessment of this synthetic data generation?',
        icon: '🤖'
      },
      {
        key: 'quality',
        question: 'How would you rate the quality and statistical similarity of the generated data?',
        icon: '⭐'
      },
      {
        key: 'improvements',
        question: 'What are the key strengths and potential improvements for this synthetic dataset?',
        icon: '📊'
      },
      {
        key: 'usecases',
        question: 'What are the best use cases and applications for this synthetic data?',
        icon: '🎯'
      },
      {
        key: 'privacy',
        question: 'How well does this synthetic data protect privacy while maintaining utility?',
        icon: '🔒'
      },
      {
        key: 'recommendations',
        question: 'What are your recommendations for using or improving this synthetic data?',
        icon: '💡'
      }
    ];

    // Prepare comprehensive data summary for AI
    const dataSummary = {
      original_shape: syntheticData.report.summary.original_shape,
      synthetic_shape: syntheticData.report.summary.synthetic_shape,
      processing_time: syntheticData.report.summary.processing_time_seconds,
      model_type: syntheticData.report.full_report.model_type,
      target_column: syntheticData.report.full_report.target_column,
      overall_quality_score: syntheticData.quality.overall_score,
      statistical_similarity: syntheticData.quality.statistical_similarity,
      privacy_metrics: syntheticData.quality.privacy_metrics,
      utility_metrics: syntheticData.quality.utility_metrics
    };

    const tempInsights: AIInsight[] = [];

    try {
      // Process each question sequentially
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        setCurrentQuestionIndex(i + 1); // Update progress
        
        // Show which question we're currently processing
        console.log(`🤔 Processing question ${i + 1}/${questions.length}: ${question.question}`);
        
        // Add some delay to simulate AI thinking and avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const prompt = `You are an expert data scientist analyzing synthetic data generation results.

Data Summary:
- Original Dataset: ${dataSummary.original_shape[0]} rows × ${dataSummary.original_shape[1]} columns
- Synthetic Dataset: ${dataSummary.synthetic_shape[0]} rows × ${dataSummary.synthetic_shape[1]} columns  
- Model Used: ${dataSummary.model_type}
- Target Column: ${dataSummary.target_column || 'None (unsupervised)'}
- Overall Quality Score: ${(dataSummary.overall_quality_score * 100).toFixed(1)}%
- Processing Time: ${dataSummary.processing_time.toFixed(1)} seconds

Statistical Similarity Scores:
${Object.entries(dataSummary.statistical_similarity).map(([col, data]) => 
  `- ${col}: ${((data as { similarity_score: number }).similarity_score * 100).toFixed(1)}%`
).join('\n')}

Privacy Score: ${(dataSummary.privacy_metrics.privacy_score * 100).toFixed(1)}%

Question: ${question.question}

Provide a concise, expert analysis in 2-3 sentences. Be specific about the metrics shown and provide actionable insights.`;

        try {
          console.log(`🔄 Making API call for question ${i + 1}: ${question.question}`);
          
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192', // Updated to current supported model
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
              max_tokens: 150, // Reduced token limit
            }),
          });

          let answer = 'AI analysis temporarily unavailable. Please check your API configuration.';
          
          if (response.ok) {
            const aiData = await response.json();
            answer = aiData.choices[0]?.message?.content?.trim() || answer;
            console.log(`✅ Question ${i + 1} completed successfully`);
          } else {
            console.error(`❌ API Response Error for question ${i + 1}:`, response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            
            if (response.status === 401) {
              answer = 'API Authentication failed. Please check your GROQ API key configuration.';
            } else if (response.status === 429) {
              answer = 'API rate limit exceeded. Please try again in a few minutes.';
            } else {
              answer = `API Error (${response.status}): ${response.statusText}`;
            }
          }
          
          const newInsight: AIInsight = {
            question: question.question,
            answer: answer,
            icon: question.icon
          };
          
          tempInsights.push(newInsight);
          
          // Update insights immediately after each question
          setAiInsights([...tempInsights]);
          
          // Add a small delay between API calls to avoid rate limiting
          if (i < questions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (apiError) {
          console.error(`❌ AI API Error for question ${i + 1}:`, apiError);
          const errorInsight: AIInsight = {
            question: question.question,
            answer: `Network error occurred while processing this question. ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
            icon: question.icon
          };
          tempInsights.push(errorInsight);
          setAiInsights([...tempInsights]);
        }
      }

      toast.success(`All ${questions.length} AI insights generated successfully!`);
      
    } catch (error) {
      console.error('AI insights generation error:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setIsGeneratingInsights(false);
      setCurrentQuestionIndex(0);
    }
  };

  // Fetch R2 datasets (same as feature importance page)
  const fetchDatasets = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsRefreshing(true);
      console.log('🔄 Fetching R2 datasets for GANs from feature-importance-datasets API...');
      const response = await fetch('/api/feature-importance-datasets');
      
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      
      const data = await response.json();
      console.log('📦 R2 datasets response:', data);
      setDatasets(data.datasets || []);
      setError('');
      
      if (data.datasets && data.datasets.length > 0) {
        toast.success(`Loaded ${data.datasets.length} datasets from R2 storage`);
      }
    } catch (err) {
      console.error('❌ R2 fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch R2 datasets');
      toast.error('Failed to load datasets from R2 storage');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  // Fetch datasets from Python backend
  const fetchDatasetsFromBackend = useCallback(async () => {
    try {
      console.log('🔄 Fetching datasets from Python backend...');
      
      const response = await fetch(`${BACKEND_URL}/datasets`);
      
      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Backend datasets response:', data);
      
      setBackendDatasets(data.datasets || []);
      
      if (data.datasets && data.datasets.length > 0) {
        toast.success(`Connected to Python backend: ${data.datasets.length} datasets available`);
      }
      
    } catch (err) {
      console.error('❌ Backend fetch error:', err);
      toast.error('Failed to connect to Python backend. Make sure it\'s running on port 4321.');
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
    fetchDatasetsFromBackend();
  }, [fetchDatasets, fetchDatasetsFromBackend]);

  // Upload selected R2 dataset to Python backend
  const uploadDatasetToBackend = async (dataset: TransformedDataset) => {
    try {
      console.log('📤 Uploading dataset to Python backend:', dataset.transformedName);
      setTrainingLogs(prev => [...prev, `📤 Uploading ${dataset.transformedName} to Python backend...`]);
      
      // First, download the CSV from R2
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset from R2');
      }
      
      const csvContent = await response.text();
      
      // Create a FormData object to upload to backend
      const formData = new FormData();
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('file', csvBlob, `${dataset.transformedName}.csv`);
      
      // Upload to Python backend
      const uploadResponse = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to Python backend');
      }
      
      const uploadResult = await uploadResponse.json();
      console.log('✅ Upload successful:', uploadResult);
      setTrainingLogs(prev => [...prev, '✅ Dataset uploaded to Python backend successfully']);
      
      // Refresh backend datasets
      await fetchDatasetsFromBackend();
      
      // Find the uploaded dataset in backend list
      const backendDataset = backendDatasets.find(bd => bd.filename === `${dataset.transformedName}.csv`);
      if (backendDataset) {
        setSelectedBackendDataset(backendDataset);
        await loadDatasetAnalysis(backendDataset);
      }
      
      return uploadResult;
    } catch {
      console.error('❌ Upload error: Failed to upload to backend');
      setTrainingLogs(prev => [...prev, '❌ Upload failed: Unable to connect to backend']);
      throw new Error('Upload failed');
    }
  };

  // Load and analyze dataset for preview
  const loadDatasetAnalysis = async (dataset: BackendDataset) => {
    setIsLoadingPreview(true);
    setTrainingLogs([]);
    setIsAnalyzingColumns(true);
    
    try {
      console.log('🔍 Analyzing dataset:', dataset.filename);
      setTrainingLogs(prev => [...prev, `📊 Loading dataset: ${dataset.filename}`]);
      
      // Step 1: Analyze dataset structure via backend
      const analyzeResponse = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: dataset.filename })
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze dataset');
      }
      
      const analysisData = await analyzeResponse.json();
      console.log('📋 Dataset analysis:', analysisData);
      
      setTrainingLogs(prev => [...prev, '✅ Dataset analysis complete']);
      
      // Extract column metadata from analysis
      const analysis = analysisData.analysis;
      const columnAnalysis = analysis.column_analysis || {};
      
      const metadata: ColumnMetadata[] = Object.entries(columnAnalysis).map(([colName, colData]: [string, unknown]) => {
        const typedColData = colData as Record<string, unknown>;
        const isNumeric = typedColData.dtype && 
          (String(typedColData.dtype).includes('int') || String(typedColData.dtype).includes('float'));
        
        return {
          name: colName,
          type: isNumeric ? 'numeric' : 'categorical',
          stats: {
            ...(isNumeric ? {
              min: Number(typedColData.min) || 0,
              max: Number(typedColData.max) || 0,
              mean: Number(typedColData.mean) || 0,
              std: Number(typedColData.std) || 0,
              nullCount: Number(typedColData.null_count) || 0
            } : {
              uniqueCount: Number(typedColData.unique_count) || 0,
              samples: Object.keys((typedColData.top_values as Record<string, unknown>) || {}).slice(0, 5),
              mostFrequent: Object.keys((typedColData.top_values as Record<string, unknown>) || {})[0] || '',
              nullCount: Number(typedColData.null_count) || 0
            })
          }
        };
      });
      
      setColumnMetadata(metadata);
      setTargetColumnOptions(dataset.columns);
      
      // Create preview data structure
      setDataPreview({
        headers: dataset.columns,
        rows: [], // We'll show this info from analysis instead
        totalRows: dataset.shape[0],
        sampleSize: Math.min(10, dataset.shape[0])
      });
      
      setShowPreview(true);
      setShowGanConfiguration(true);
      setTrainingLogs(prev => [...prev, '🎯 Ready for GAN configuration']);
      
    } catch (err) {
      console.error('❌ Analysis error:', err);
      toast.error('Failed to analyze dataset');
      setTrainingLogs(prev => [...prev, `❌ Error: ${err instanceof Error ? err.message : 'Analysis failed'}`]);
    } finally {
      setIsLoadingPreview(false);
      setIsAnalyzingColumns(false);
    }
  };

  // Main GAN Training Function (connected to backend)
  const handleStartGanTraining = async () => {
    if (!selectedBackendDataset) {
      toast.error('Please select a dataset first');
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setSyntheticData(null);
    setTrainingLogs([]);

    try {
      console.log('🚀 Starting GAN training with config:', ganConfig);
      setTrainingLogs(prev => [...prev, `🚀 Starting ${ganConfig.model_type} training...`]);
      setTrainingLogs(prev => [...prev, `📊 Target samples: ${ganConfig.sample_size}`]);
      setTrainingLogs(prev => [...prev, `🎯 Target column: ${ganConfig.target_column || 'None (unsupervised)'}`]);

      // Simulate progress updates while backend processes
      const progressInterval = setInterval(() => {
        setTrainingProgress(prev => {
          if (prev >= 90) return prev; // Cap at 90% until backend responds
          return prev + Math.random() * 10;
        });
      }, 1000);

      // Call Python backend to generate synthetic data
      const generateResponse = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedBackendDataset.filename,
          model_type: ganConfig.model_type,
          sample_size: ganConfig.sample_size,
          target_column: ganConfig.target_column
        })
      });
      
      clearInterval(progressInterval);
      
      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || 'Generation failed');
      }
      
      const generationResult: GANGenerationResponse = await generateResponse.json();
      console.log('🎉 Generation successful:', generationResult);
      
      setTrainingProgress(100);
      setTrainingLogs(prev => [...prev, '✅ GAN training completed successfully!']);
      setTrainingLogs(prev => [...prev, `📊 Generated ${generationResult.summary.synthetic_shape[0]} synthetic samples`]);
      setTrainingLogs(prev => [...prev, `⭐ Quality Score: ${Math.round(generationResult.summary.overall_quality_score * 100)}%`]);
      
      // Parse the quality metrics from evaluation step
      const evaluation = generationResult.full_report.steps['4_evaluation'] as Record<string, unknown>;
      const qualityMetrics: QualityMetrics = {
        overall_score: Number(evaluation.overall_score) || 0,
        statistical_similarity: (evaluation.statistical_similarity as Record<string, { similarity_score: number }>) || {},
        distribution_similarity: (evaluation.distribution_similarity as Record<string, { similarity_score: number }>) || {},
        correlation_similarity: (evaluation.correlation_similarity as { similarity_score: number }) || { similarity_score: 0 },
        privacy_metrics: (evaluation.privacy_metrics as { privacy_score: number }) || { privacy_score: 0 },
        utility_metrics: (evaluation.utility_metrics as { utility_score: number }) || { utility_score: 0 }
      };
      
      // Download the generated synthetic data from backend
      const downloadResponse = await fetch(`${BACKEND_URL}/download/${generationResult.synthetic_filename}`);
      const csvContent = await downloadResponse.text();
      
      // Parse CSV to get headers and rows
      const parsed = Papa.parse(csvContent, { header: false, skipEmptyLines: true });
      const allRows = parsed.data as string[][];
      const headers = allRows[0] || [];
      const dataRows = allRows.slice(1);
      
      const syntheticResult: SyntheticDataResult = {
        headers,
        rows: dataRows,
        totalRows: dataRows.length,
        csvContent,
        quality: qualityMetrics,
        report: generationResult
      };
      
      setSyntheticData(syntheticResult);
      toast.success(`Successfully generated ${dataRows.length} synthetic samples with ${Math.round(qualityMetrics.overall_score * 100)}% quality!`);
      
    } catch (err) {
      console.error('❌ GAN training error:', err);
      setTrainingLogs(prev => [...prev, `❌ Error: ${err instanceof Error ? err.message : 'Training failed'}`]);
      toast.error(err instanceof Error ? err.message : 'GAN training failed');
      setTrainingProgress(0);
    } finally {
      setIsTraining(false);
    }
  };

  // Download synthetic CSV locally
  const downloadSyntheticCSV = () => {
    if (!syntheticData) return;
    
    const blob = new Blob([syntheticData.csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDataset?.transformedName || 'dataset'}_synthetic_gan.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Synthetic CSV downloaded successfully!');
  };

  // Upload to R2 and save to model-training folder
  const uploadToCloudAndSave = async () => {
    if (!syntheticData || !selectedDataset) return;
    
    setIsUploadingToCloud(true);
    try {
      console.log('🚀 SAVE TO MODEL TRAINING BUTTON CLICKED - Starting save to model-training folder');
      
      // Save to R2 using the model-training datasets upload endpoint (R2-only, no MongoDB)
      console.log('📤 Calling model-training upload API...');
      const saveResponse = await fetch('/api/model-training-datasets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: syntheticData.csvContent,
          originalDatasetName: selectedDataset.originalName || selectedDataset.transformedName,
          transformedName: `${selectedDataset.transformedName}_synthetic_gan`,
          processingSteps: [
            ...(selectedDataset.processingSteps || []),
            'gan_synthetic_generation',
            'data_augmentation',
            'model_training_ready'
          ],
          ganConfig: ganConfig,
          qualityMetrics: syntheticData.quality,
          metadata: {
            originalColumns: selectedBackendDataset?.shape[1] || 0,
            syntheticSamples: syntheticData.totalRows,
            generationType: 'GAN',
            qualityScore: syntheticData.quality.overall_score,
            backendReport: syntheticData.report
          }
        })
      });
      
      if (!saveResponse.ok) {
        throw new Error(`Failed to save to model-training folder: ${saveResponse.status} ${saveResponse.statusText}`);
      }
      
      const saveResult = await saveResponse.json();
      console.log('Model-training save successful:', saveResult);
      
      toast.success('Synthetic dataset saved to Model Training folder successfully!');
      
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

  const handleStartGanGeneration = async () => {
    if (selectedDataset) {
      try {
        // Upload the selected R2 dataset to Python backend
        await uploadDatasetToBackend(selectedDataset);
      } catch {
        toast.error('Failed to upload dataset to Python backend');
      }
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
          <p className="mt-4 text-gray-600">Loading datasets...</p>
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
            <h2 className="text-lg font-semibold text-gray-800">Connection Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDatasets}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
          >
            Retry Connection
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
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">GANs Generate Synthetic Data</h1>
                <p className="text-gray-600">Generate high-quality synthetic datasets using Generative Adversarial Networks</p>
              </div>
            </div>
            <button
              onClick={fetchDatasets}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Datasets
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
              No datasets found in R2 storage. Please upload datasets through the preprocessing pipeline first.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard/preprocessing'}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Data Preprocessing
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/feature-importance'}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Go to Feature Importance
              </button>
            </div>
          </div>
        ) : (
          // Dataset Selection and GAN Generation
          <div className="space-y-6">
            {/* Step 1: Dataset Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Step 1: Select Dataset for GAN Training</h2>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <span className="text-gray-700 break-words leading-5">
                    {selectedDataset ? (
                      selectedDataset.transformedName.length > 100 ? (
                        <>
                          <div>{selectedDataset.transformedName.substring(0, 100)}</div>
                          <div className="text-sm">{selectedDataset.transformedName.substring(100)}</div>
                        </>
                      ) : (
                        selectedDataset.transformedName
                      )
                    ) : (
                      'Choose a dataset to train GAN...'
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {datasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        onClick={() => {
                          setSelectedDataset(dataset);
                          setShowDropdown(false);
                          // Reset states when selecting new dataset
                          setShowPreview(false);
                          setShowGanConfiguration(false);
                          setSyntheticData(null);
                          setIsSavedToCloud(false);
                          setTrainingLogs([]);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 break-words leading-5 mb-1">
                          {dataset.transformedName.length > 80 ? (
                            <>
                              <div>{dataset.transformedName.substring(0, 80)}</div>
                              <div className="text-sm">{dataset.transformedName.substring(80)}</div>
                            </>
                          ) : (
                            dataset.transformedName
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dataset.rowCount} rows × {dataset.columnCount} columns • {formatFileSize(dataset.fileSize)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Processed: {formatDate(dataset.uploadedAt)}
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
                  <h2 className="text-lg font-semibold text-gray-800">Step 2: Dataset Information</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(selectedDataset.url, '_blank')}
                      className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download Original
                    </button>
                  </div>
                </div>

                {/* Dataset Info Layout */}
                <div className="border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dataset Name</label>
                      <p className="text-gray-900">{selectedDataset.transformedName}</p>
                    </div> */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                      <p className="text-gray-900">{selectedDataset.rowCount} rows × {selectedDataset.columnCount} columns</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">File Size</label>
                      <p className="text-gray-900">{formatFileSize(selectedDataset.fileSize)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Date</label>
                      <p className="text-gray-900">{formatDate(selectedDataset.uploadedAt)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Processing Steps</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedDataset.processingSteps.map((step, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 3: Start GAN Analysis */}
                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Brain className="w-6 h-6 text-purple-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Start GAN Analysis & Training</h3>
                      <p className="text-gray-600">Upload dataset to Python backend and analyze structure for GAN training</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStartGanGeneration}
                    disabled={isLoadingPreview}
                    className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingPreview ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Uploading to Backend...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Backend Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Data Preview and GAN Configuration */}
            {showPreview && dataPreview && selectedBackendDataset && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Step 3: Dataset Analysis & GAN Configuration</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Eye className="w-4 h-4" />
                    <span>{dataPreview.totalRows} total rows analyzed</span>
                  </div>
                </div>

                {/* Training Logs */}
                {trainingLogs.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-800 mb-2">Backend Processing Logs</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {trainingLogs.map((log, index) => (
                        <div key={index} className="text-sm text-gray-600 font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Column Analysis */}
                {isAnalyzingColumns ? (
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                      <span className="text-blue-700">Analyzing dataset structure via backend...</span>
                    </div>
                  </div>
                ) : columnMetadata.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Column Analysis (from Backend)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {columnMetadata.map((column, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{column.name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              column.type === 'numeric' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {column.type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            {column.type === 'numeric' ? (
                              <>
                                <div>Range: {column.stats.min} - {column.stats.max}</div>
                                <div>Mean: {column.stats.mean}</div>
                                <div>Std: {column.stats.std}</div>
                              </>
                            ) : (
                              <>
                                <div>Unique: {column.stats.uniqueCount}</div>
                                <div>Most frequent: {column.stats.mostFrequent}</div>
                              </>
                            )}
                            {column.stats.nullCount! > 0 && (
                              <div className="text-yellow-600">Nulls: {column.stats.nullCount}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GAN Configuration (synced with backend) */}
                {showGanConfiguration && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        GAN Configuration (Backend Parameters)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Model Type</label>
                          <select
                            value={ganConfig.model_type}
                            onChange={(e) => setGanConfig(prev => ({ ...prev, model_type: e.target.value as 'CTGAN' | 'GaussianCopula' | 'CopulaGAN' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                            style={{ fontSize: '14px' }}
                          >
                            <option value="CTGAN">CTGAN (Conditional Tabular GAN)</option>
                            <option value="GaussianCopula">Gaussian Copula</option>
                            <option value="CopulaGAN">Copula GAN</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sample Size</label>
                          <input
                            type="number"
                            value={ganConfig.sample_size}
                            onChange={(e) => setGanConfig(prev => ({ ...prev, sample_size: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                            min="100"
                            max="50000"
                            style={{ fontSize: '14px' }}
                          />
                          <div className="text-xs text-gray-500 mt-1">Current: {ganConfig.sample_size.toLocaleString()} samples</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Target Column (Optional)</label>
                          <select
                            value={ganConfig.target_column || ''}
                            onChange={(e) => setGanConfig(prev => ({ ...prev, target_column: e.target.value || null }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                            style={{ fontSize: '14px' }}
                          >
                            <option value="">None (Unsupervised)</option>
                            {targetColumnOptions.map((column) => (
                              <option key={column} value={column}>{column}</option>
                            ))}
                          </select>
                          <div className="text-xs text-gray-500 mt-1">
                            {ganConfig.target_column ? `Selected: ${ganConfig.target_column}` : 'No target column selected'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Model Information</h4>
                        <div className="text-sm text-blue-700">
                          {ganConfig.model_type === 'CTGAN' && (
                            <p>CTGAN is best for mixed data types with categorical features. Uses conditional generators.</p>
                          )}
                          {ganConfig.model_type === 'GaussianCopula' && (
                            <p>Gaussian Copula model works well for continuous data with correlations preserved.</p>
                          )}
                          {ganConfig.model_type === 'CopulaGAN' && (
                            <p>Copula-based GAN combines copulas and GANs for hybrid tabular data generation.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Start Training Button */}
                    <div className="bg-green-50 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                            <Zap className="w-5 h-5 mr-2 text-green-600" />
                            Start GAN Training (Backend)
                          </h3>
                          <p className="text-gray-600">Train the {ganConfig.model_type} model using Python backend</p>
                        </div>
                        <button
                          onClick={handleStartGanTraining}
                          disabled={isTraining}
                          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {isTraining ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              Training...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start Training
                            </>
                          )}
                        </button>
                      </div>

                      {/* Training Progress */}
                      {isTraining && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Backend Training Progress</span>
                            <span className="text-sm font-medium text-gray-900">{Math.round(trainingProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${trainingProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Synthetic Data Results (from backend) */}
                    {syntheticData && (
                      <div className="bg-white border-2 border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                              Synthetic Data Generated Successfully (Backend)
                            </h3>
                            <p className="text-gray-600">Generated {syntheticData.totalRows} synthetic samples using {ganConfig.model_type}</p>
                          </div>
                          <div className="flex space-x-3">
                            <button
  onClick={downloadSyntheticCSV}
  className="flex items-center px-4 py-2 border border-black text-white bg-black rounded-lg hover:bg-gray-900"
>
  <Download className="w-4 h-4 mr-2" />
  Download CSV
</button>

                            <button
                              onClick={uploadToCloudAndSave}
                              disabled={isUploadingToCloud || isSavedToCloud}
                              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                                isSavedToCloud
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              } disabled:opacity-50`}
                            >
                              {isUploadingToCloud ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                  Saving...
                                </>
                              ) : isSavedToCloud ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Saved to Model Training
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save to Model Training
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Quality Metrics from Backend */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{Math.round(syntheticData.quality.overall_score * 100)}%</div>
                            <div className="text-sm text-gray-600">Overall Quality</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {Object.keys(syntheticData.quality.statistical_similarity).length}
                            </div>
                            <div className="text-sm text-gray-600">Statistical Tests</div>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {Object.keys(syntheticData.quality.distribution_similarity).length}
                            </div>
                            <div className="text-sm text-gray-600">Distribution Tests</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {syntheticData.quality.utility_metrics && 
                               typeof (syntheticData.quality.utility_metrics as Record<string, unknown>).utility_score === 'number' 
                                ? Math.round(Number((syntheticData.quality.utility_metrics as Record<string, unknown>).utility_score) * 100) 
                                : 'N/A'}%
                            </div>
                            <div className="text-sm text-gray-600">Utility Score</div>
                          </div>
                        </div>

                        {/* Backend Report Summary */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                          <h4 className="font-medium text-black mb-3">Backend Report Summary</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="text-black">
                              <span className="font-semibold text-black">Processing Time:</span> {syntheticData.report.summary.processing_time_seconds.toFixed(1)}s
                            </div>
                            <div className="text-black">
                              <span className="font-semibold text-black">Original Shape:</span> {syntheticData.report.summary.original_shape[0]} × {syntheticData.report.summary.original_shape[1]}
                            </div>
                            <div className="text-black">
                              <span className="font-semibold text-black">Synthetic Shape:</span> {syntheticData.report.summary.synthetic_shape[0]} × {syntheticData.report.summary.synthetic_shape[1]}
                            </div>
                            {/* <div className="text-black">
                              <span className="font-semibold text-black">Backend File:</span> {syntheticData.report.synthetic_filename}
                            </div> */}
                          </div>
                        </div>

                        {/* Backend Processing Steps */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                          <h4 className="font-medium text-gray-800 mb-3">Backend Processing Pipeline</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {Object.entries(syntheticData.report.full_report.steps).map(([step, data]) => (
                              <div key={step} className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                  {step === '1_analysis' && <BarChart3 className="w-4 h-4 text-blue-500 mr-2" />}
                                  {step === '2_preprocessing' && <Settings className="w-4 h-4 text-yellow-500 mr-2" />}
                                  {step === '3_generation' && <Brain className="w-4 h-4 text-purple-500 mr-2" />}
                                  {step === '4_evaluation' && <Target className="w-4 h-4 text-green-500 mr-2" />}
                                  {step === '5_saving' && <Save className="w-4 h-4 text-gray-500 mr-2" />}
                                  <span className="text-xs font-medium text-gray-700">
                                    {step.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                </div>
                                <div className="text-xs text-black font-medium">
                                  {(() => {
                                    const stepData = data as Record<string, unknown>;
                                    // Check for success property or infer from error property
                                    if (stepData.success === true) return '✅ Completed';
                                    if (stepData.success === false || stepData.error) return '❌ Failed';
                                    // For steps without explicit success flag, check for error
                                    if (!stepData.error && Object.keys(stepData).length > 1) return '✅ Completed';
                                    return '❌ Failed';
                                  })()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                          {/* AI Insights Section */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-800 flex items-center">
                              <Brain className="w-5 h-5 mr-2 text-purple-600" />
                              AI Insights & Analysis
                            </h4>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
                                  console.log('API Key check:', apiKey ? 'Available' : 'Missing');
                                  
                                  if (!apiKey) {
                                    toast.error('API Key: Missing ❌');
                                    return;
                                  }
                                  
                                  // Test actual API call
                                  try {
                                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${apiKey}`,
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        model: 'llama3-70b-8192',
                                        messages: [{ role: 'user', content: 'Hello, this is a test. Please respond with "API Test Successful".' }],
                                        temperature: 0.3,
                                        max_tokens: 50,
                                      }),
                                    });
                                    
                                    if (response.ok) {
                                      const data = await response.json();
                                      const message = data.choices[0]?.message?.content || 'No response';
                                      toast.success(`API Test Successful ✅: ${message}`);
                                    } else {
                                      const errorText = await response.text();
                                      toast.error(`API Test Failed ❌: ${response.status} ${response.statusText}`);
                                      console.error('API Test Error:', errorText);
                                    }
                                  } catch (error) {
                                    toast.error(`API Test Failed ❌: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    console.error('API Test Error:', error);
                                  }
                                }}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                              >
                                Test API
                              </button>
                              <button
                                onClick={generateAIInsights}
                                disabled={isGeneratingInsights}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isGeneratingInsights ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Generating... ({currentQuestionIndex}/{totalQuestions})
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Get AI Insights
                                  </>
                                )}
                              </button>
                            </div>
                          </div>                          {/* Progress Bar for AI Generation */}
                          {isGeneratingInsights && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span>Generating AI Insights...</span>
                                <span>{currentQuestionIndex}/{totalQuestions} questions</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${(currentQuestionIndex / totalQuestions) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {showAiInsights && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {aiInsights.map((insight, index) => (
                                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                  <div className="flex items-start mb-3">
                                    <span className="text-2xl mr-3">{insight.icon}</span>
                                    <h5 className="font-medium text-gray-800 text-sm leading-tight">
                                      {insight.question}
                                    </h5>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {insight.answer}
                                  </p>
                                </div>
                              ))}
                              
                              {isGeneratingInsights && aiInsights.length < totalQuestions && (
                                <>
                                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm animate-pulse">
                                    <div className="flex items-center mb-3">
                                      <div className="w-8 h-8 bg-gray-200 rounded mr-3"></div>
                                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="h-3 bg-gray-200 rounded"></div>
                                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                                    </div>
                                    <div className="mt-3 text-xs text-purple-600 font-medium">
                                      Processing question {currentQuestionIndex}/{totalQuestions}...
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {!showAiInsights && (
                            <p className="text-gray-600 text-sm">
                              Click &ldquo;Get AI Insights&rdquo; to generate comprehensive analysis of your synthetic data quality, 
                              statistical properties, and recommendations for usage.
                            </p>
                          )}
                        </div>

                        {/* Detailed Quality Reports */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Statistical Similarity */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                              <Activity className="w-4 h-4 mr-2" />
                              Statistical Similarity
                            </h4>
                            <div className="space-y-2 text-sm">
                              {Object.entries(syntheticData.quality.statistical_similarity).slice(0, 3).map(([test, result]) => (
                                <div key={test} className="flex justify-between">
                                  <span className="text-blue-700 font-medium">{test.replace(/_/g, ' ')}:</span>
                                  <span className="text-black font-semibold">
                                    {(() => {
                                      if (typeof result === 'object' && result !== null && 'similarity_score' in result) {
                                        const score = (result as { similarity_score: number }).similarity_score;
                                        return (score * 100).toFixed(1) + '%';
                                      }
                                      if (typeof result === 'number') {
                                        return (result * 100).toFixed(1) + '%';
                                      }
                                      return 'N/A';
                                    })()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Privacy Metrics */}
                          <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="font-medium text-green-800 mb-3 flex items-center">
                              <Shield className="w-4 h-4 mr-2" />
                              Privacy Protection
                            </h4>
                            <div className="space-y-2 text-sm">
                              {Object.entries(syntheticData.quality.privacy_metrics).slice(0, 3).map(([metric, value]) => (
                                <div key={metric} className="flex justify-between">
                                  <span className="text-green-700 font-medium">{metric.replace(/_/g, ' ')}:</span>
                                  <span className="text-black font-semibold">
                                    {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value).slice(0, 10)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Synthetic Data Preview */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <h4 className="font-medium text-gray-800">Synthetic Data Preview (First 5 rows)</h4>
                          </div>
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  {syntheticData.headers.map((header, index) => (
                                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {syntheticData.rows.slice(0, 5).map((row, rowIndex) => (
                                  <tr key={rowIndex} className="hover:bg-gray-50">
                                    {row.map((cell, cellIndex) => (
                                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
