'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  TrendingUp, 
  Brain, 
  BarChart3, 
  Database, 
  CheckCircle, 
  FileText, 
  Code,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Target,
  Lightbulb,
  Settings,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Interfaces
interface UnsupervisedResults {
  model_id: string;
  model_name: string;
  task_type: 'clustering' | 'anomaly_detection';
  cluster_labels?: number[];
  anomaly_labels?: number[];
  cluster_centers?: number[][];
  n_clusters?: number;
  metrics: Record<string, unknown>;
  feature_columns: string[];
  created_at: string;
  training_time?: number;
  silhouette_score?: number;
  anomaly_scores?: number[];
  // Add compatibility fields
  model_type?: string;
  data_shape?: {
    rows: number;
    columns: number;
  };
  predictions?: (number | string)[];
}

interface DataPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  sampleSize: number;
}

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
  metadata?: {
    selectedFeatures?: string[];
    targetColumn?: string;
    analysisType?: 'classification' | 'regression';
  };
}

interface AIInsight {
  type: string;
  description: string;
  confidence: number;
  recommendation?: string;
}

interface ClusterInfo {
  cluster: number;
  count: number;
  percentage: string;
  color: string;
}

interface ClusterAnalysis {
  clusterInfo: ClusterInfo[];
  totalPoints: number;
  totalClusters: number;
  silhouetteScore?: number;
}

interface AnomalyAnalysis {
  normalCount: number;
  anomalyCount: number;
  totalPoints: number;
  anomalyPercentage: string;
  normalPercentage: string;
  riskLevel: 'low' | 'medium' | 'high';
  detectionRate: number;
  totalAnomalies: number;
  normalPoints: number;
}

interface VisualizationPoint {
  id: number;
  x: number;
  y: number;
  cluster?: number;
  isAnomaly?: boolean;
  color?: string;
}

interface UnsupervisedModelResultsProps {
  results: UnsupervisedResults;
  dataPreview?: DataPreview | null;
  dataset: TransformedDataset;
  onBack: () => void;
}

interface ClusterPreviewRow {
  sample_index?: number;
  cluster?: number;
  anomaly?: number;
  [key: string]: unknown;
}

interface ClusterPreviewResponse {
  data: ClusterPreviewRow[];
  totalRows: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  columns: string[];
  clusterNumbers: number[];
  hasAnomalies: boolean;
  filter: string;
  limit: number;
}

const UnsupervisedModelResults: React.FC<UnsupervisedModelResultsProps> = ({
  results,
  dataPreview,
  dataset,
  onBack
}) => {
  // Debug logging
  console.log('UnsupervisedModelResults props:', {
    results: results,
    dataPreview: dataPreview,
    dataPreviewType: typeof dataPreview,
    isArray: Array.isArray(dataPreview),
    dataset: dataset
  });

  // State management
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState<boolean>(false);
  const [generatingInsights, setGeneratingInsights] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [enhancedResults, setEnhancedResults] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  
  // Pagination state for data preview
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  // Filter state for data preview
  const [previewFilter, setPreviewFilter] = useState<string>('all'); // 'all', 'anomalies', 'normal', or cluster number
  
  // Cluster preview API state
  const [clusterPreviewData, setClusterPreviewData] = useState<ClusterPreviewRow[]>([]);
  const [clusterPreviewColumns, setClusterPreviewColumns] = useState<string[]>([]);
  const [clusterPreviewPagination, setClusterPreviewPagination] = useState({
    totalRows: 0,
    totalPages: 0,
    currentPage: 1,
    hasNext: false,
    hasPrev: false
  });
  const [clusterNumbers, setClusterNumbers] = useState<number[]>([]);
  const [hasAnomalies, setHasAnomalies] = useState<boolean>(false);
  const [loadingClusterPreview, setLoadingClusterPreview] = useState<boolean>(false);
  const [downloadingData, setDownloadingData] = useState<boolean>(false);

  // Fetch cluster preview data from API
  const fetchClusterPreview = async (page: number = 1, limit: number = 10, filter: string = 'all') => {
    if (!results?.model_id) return;
    
    try {
      setLoadingClusterPreview(true);
      const response = await fetch(`/api/cluster-preview?modelId=${results.model_id}&page=${page}&limit=${limit}&filter=${filter}`);
      if (response.ok) {
        const data: ClusterPreviewResponse = await response.json();
        setClusterPreviewData(data.data);
        setClusterPreviewColumns(data.columns);
        setClusterPreviewPagination({
          totalRows: data.totalRows,
          totalPages: data.totalPages,
          currentPage: data.currentPage,
          hasNext: data.hasNext,
          hasPrev: data.hasPrev
        });
        setClusterNumbers(data.clusterNumbers);
        setHasAnomalies(data.hasAnomalies);
      } else {
        console.error('Failed to fetch cluster preview');
      }
    } catch (error) {
      console.error('Error fetching cluster preview:', error);
    } finally {
      setLoadingClusterPreview(false);
    }
  };

  // Fetch enhanced model results from API
  useEffect(() => {
    const fetchModelResults = async () => {
      if (!results?.model_id) return;
      
      try {
        setLoadingMetrics(true);
        const response = await fetch(`/api/model-results?modelId=${results.model_id}`);
        if (response.ok) {
          const data = await response.json();
          setEnhancedResults(data);
          console.log('Enhanced results fetched:', data);
        } else {
          console.error('Failed to fetch enhanced results');
        }
      } catch (error) {
        console.error('Error fetching enhanced results:', error);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchModelResults();
  }, [results?.model_id]);

  // Fetch cluster preview data when model, pagination, or filter changes
  useEffect(() => {
    if (results?.model_id && activeTab === 'download') {
      fetchClusterPreview(currentPage, itemsPerPage, previewFilter);
    }
  }, [results?.model_id, currentPage, itemsPerPage, previewFilter, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine model type - use enhanced results if available
  const currentResults = enhancedResults || results;
  const isClustering = currentResults?.task_type === 'clustering' ||
                       currentResults?.model_name?.toLowerCase().includes('kmeans') || 
                       currentResults?.model_name?.toLowerCase().includes('cluster') ||
                       currentResults?.model_type?.toLowerCase().includes('cluster');
  
  const isAnomalyDetection = currentResults?.task_type === 'anomaly_detection' ||
                            currentResults?.model_name?.toLowerCase().includes('isolation') ||
                            currentResults?.model_name?.toLowerCase().includes('anomaly') ||
                            currentResults?.model_type?.toLowerCase().includes('anomaly');

  // Normalize dataPreview to ensure it's always in object array format
  const normalizedDataPreview: Array<{[key: string]: string | number}> = React.useMemo(() => {
    if (!dataPreview || !dataPreview.headers || !dataPreview.rows) return [];
    
    try {
      // Convert headers/rows format to array of objects
      return dataPreview.rows.slice(0, 1000).map((row, index) => {
        const obj: {[key: string]: string | number} = {};
        dataPreview.headers.forEach((header, headerIndex) => {
          obj[header] = row[headerIndex] || '';
        });
        
        // Add cluster or anomaly information if available
        if (isClustering) {
          if (results?.cluster_labels && results.cluster_labels[index] !== undefined) {
            obj.cluster = Number(results.cluster_labels[index]);
          } else if (results?.predictions && results.predictions[index] !== undefined) {
            obj.cluster = Number(results.predictions[index]);
          }
        } else if (isAnomalyDetection) {
          if (results?.anomaly_labels && results.anomaly_labels[index] !== undefined) {
            obj.anomaly = Number(results.anomaly_labels[index]);
          } else if (results?.predictions && results.predictions[index] !== undefined) {
            obj.anomaly = Number(results.predictions[index]);
          }
        }
        
        return obj;
      });
    } catch (error) {
      console.error('Error normalizing dataPreview:', error);
      return [];
    }
  }, [dataPreview, results?.cluster_labels, results?.anomaly_labels, results?.predictions, isClustering, isAnomalyDetection]);

  // Generate cluster analysis using enhanced results
  const getEnhancedClusterAnalysis = (): ClusterAnalysis | null => {
    if (!isClustering) return null;
    
    const useResults = enhancedResults || results;
    const predictions = useResults?.cluster_labels || useResults?.predictions;
    
    // If we have cluster_sizes from metadata, use it directly
    if (useResults?.cluster_sizes) {
      const clusterInfo: ClusterInfo[] = Object.entries(useResults.cluster_sizes)
        .map(([cluster, count]) => ({
          cluster: Number(cluster),
          count: Number(count),
          percentage: ((Number(count) / useResults.metrics?.total_samples) * 100).toFixed(1),
          color: `hsl(${Number(cluster) * 137.5 % 360}, 70%, 50%)`
        }))
        .sort((a, b) => b.count - a.count);

      return {
        clusterInfo,
        totalPoints: useResults.metrics?.total_samples || 0,
        totalClusters: useResults.n_clusters || Object.keys(useResults.cluster_sizes).length,
        silhouetteScore: useResults.silhouette_score || useResults.metrics?.silhouette_score
      };
    }
    
    // Fallback to predictions if available
    if (!predictions) return null;

    const clusterCounts: { [key: number]: number } = {};
    predictions.forEach((pred: number) => {
      const cluster = Number(pred);
      clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
    });

    const totalPoints = predictions.length;
    const clusterInfo: ClusterInfo[] = Object.entries(clusterCounts)
      .map(([cluster, count]) => ({
        cluster: Number(cluster),
        count,
        percentage: ((count / totalPoints) * 100).toFixed(1),
        color: `hsl(${Number(cluster) * 137.5 % 360}, 70%, 50%)`
      }))
      .sort((a, b) => b.count - a.count);

    return {
      clusterInfo,
      totalPoints,
      totalClusters: Object.keys(clusterCounts).length,
      silhouetteScore: useResults?.silhouette_score || useResults?.metrics?.silhouette_score as number
    };
  };

  // Generate anomaly analysis using enhanced results
  const getEnhancedAnomalyAnalysis = (): AnomalyAnalysis | null => {
    if (!isAnomalyDetection) return null;

    const useResults = enhancedResults || results;
    
    // Use metrics from enhanced results if available
    if (useResults?.anomalies_detected !== undefined) {
      const totalPoints = useResults.metrics?.total_samples || 0;
      const anomalyCount = useResults.anomalies_detected;
      const normalCount = totalPoints - anomalyCount;
      const anomalyPercentage = ((anomalyCount / totalPoints) * 100).toFixed(1);
      const normalPercentage = ((normalCount / totalPoints) * 100).toFixed(1);

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (Number(anomalyPercentage) > 10) riskLevel = 'high';
      else if (Number(anomalyPercentage) > 5) riskLevel = 'medium';

      return {
        normalCount,
        anomalyCount,
        totalPoints,
        anomalyPercentage,
        normalPercentage,
        riskLevel,
        detectionRate: useResults.anomaly_detection_rate * 100 || Number(anomalyPercentage),
        totalAnomalies: anomalyCount,
        normalPoints: normalCount
      };
    }

    // Fallback to predictions
    const predictions = useResults?.anomaly_labels || useResults?.predictions;
    if (!predictions) return null;

    const anomalyCount = predictions.filter((pred: number) => Number(pred) === -1 || Number(pred) === 1).length;
    const normalCount = predictions.length - anomalyCount;
    const totalPoints = predictions.length;
    const anomalyPercentage = ((anomalyCount / totalPoints) * 100).toFixed(1);
    const normalPercentage = ((normalCount / totalPoints) * 100).toFixed(1);

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (Number(anomalyPercentage) > 10) riskLevel = 'high';
    else if (Number(anomalyPercentage) > 5) riskLevel = 'medium';

    return {
      normalCount,
      anomalyCount,
      totalPoints,
      anomalyPercentage,
      normalPercentage,
      riskLevel,
      detectionRate: Number(anomalyPercentage),
      totalAnomalies: anomalyCount,
      normalPoints: normalCount
    };
  };

  // Create visualization data
  const getVisualizationData = (): VisualizationPoint[] => {
    if (normalizedDataPreview.length === 0) return [];

    const numericColumns = results?.feature_columns?.filter(col => {
      const sample = normalizedDataPreview.find(row => row && row[col] !== undefined)?.[col];
      return typeof sample === 'number' || (typeof sample === 'string' && !isNaN(Number(sample)));
    });

    if (!numericColumns || numericColumns.length < 2) return [];

    const xCol = numericColumns[0];
    const yCol = numericColumns[1];

    return normalizedDataPreview.slice(0, 1000).map((row, index) => {
      const point: VisualizationPoint = {
        id: index,
        x: Number(row[xCol]) || 0,
        y: Number(row[yCol]) || 0
      };

      if (isClustering) {
        const predictions = results?.cluster_labels || results?.predictions;
        if (predictions && predictions[index] !== undefined) {
          point.cluster = Number(predictions[index]);
          point.color = `hsl(${point.cluster * 137.5 % 360}, 70%, 50%)`;
        }
      }

      if (isAnomalyDetection) {
        const predictions = results?.anomaly_labels || results?.predictions;
        if (predictions && predictions[index] !== undefined) {
          point.isAnomaly = Number(predictions[index]) === -1 || Number(predictions[index]) === 1;
          point.color = point.isAnomaly ? '#ef4444' : '#10b981';
        }
      }

      return point;
    });
  };

  // Generate AI insights using Groq API directly
  const generateAIInsights = async (): Promise<void> => {
    if (generatingInsights) return;
    
    setGeneratingInsights(true);
    setInsightsError(null);
    
    try {
      // Get the analysis data
      const currentClusterAnalysis = getEnhancedClusterAnalysis();
      const currentAnomalyAnalysis = getEnhancedAnomalyAnalysis();
      
      // Create comprehensive prompt for Groq
      const modelMetrics = {
        totalSamples: enhancedResults?.data_shape?.rows || enhancedResults?.metrics?.total_samples || normalizedDataPreview.length,
        features: enhancedResults?.features?.length || enhancedResults?.data_shape?.columns,
        trainingTime: enhancedResults?.training_time || enhancedResults?.metrics?.training_time,
        modelType: isClustering ? 'clustering' : 'anomaly detection'
      };

      const prompt = isClustering 
        ? `Analyze this K-Means clustering result for a dataset with ${modelMetrics.totalSamples} samples and ${modelMetrics.features} features.
          
          Clustering Results:
          - Total Clusters: ${currentClusterAnalysis?.totalClusters}
          - Silhouette Score: ${currentClusterAnalysis?.silhouetteScore?.toFixed(3) || 'N/A'}
          - Inertia (WCSS): ${enhancedResults?.inertia?.toFixed(0) || 'N/A'}
          - Training Time: ${modelMetrics.trainingTime ? modelMetrics.trainingTime.toFixed(3) + 's' : 'N/A'}
          
          Please provide insights in the following format:
          1. Key Findings (3-4 bullet points about cluster quality and distribution)
          2. Business Insights (3-4 bullet points about what the clusters mean for business decisions)
          3. Recommendations (3-4 actionable recommendations for next steps)
          4. Technical Summary (1 paragraph about model performance and data quality)
          
          Focus on practical, actionable insights that help understand the clustering patterns.`
        : `Analyze this Isolation Forest anomaly detection result for a dataset with ${modelMetrics.totalSamples} samples and ${modelMetrics.features} features.
          
          Anomaly Detection Results:
          - Anomalies Found: ${currentAnomalyAnalysis?.anomalyCount}
          - Normal Points: ${currentAnomalyAnalysis?.normalCount}
          - Anomaly Rate: ${currentAnomalyAnalysis?.anomalyPercentage}%
          - Risk Level: ${currentAnomalyAnalysis?.riskLevel}
          - Training Time: ${modelMetrics.trainingTime ? modelMetrics.trainingTime.toFixed(3) + 's' : 'N/A'}
          
          Please provide insights in the following format:
          1. Key Findings (3-4 bullet points about anomaly patterns and detection quality)
          2. Business Insights (3-4 bullet points about what the anomalies mean for business operations)
          3. Recommendations (3-4 actionable recommendations for investigation and next steps)
          4. Technical Summary (1 paragraph about model performance and detection effectiveness)
          
          Focus on practical, actionable insights that help understand the anomaly patterns and their implications.`;

      // Call Groq API directly
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{ 
            role: 'user', 
            content: prompt 
          }],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || 'Analysis completed successfully.';
        
        // Parse AI response into structured insights
        const sections = aiResponse.split(/\d+\.\s+/);
        const structuredInsights = {
          keyFindings: extractBulletPoints(sections[1] || ''),
          businessInsights: extractBulletPoints(sections[2] || ''),
          recommendations: extractBulletPoints(sections[3] || ''),
          technicalSummary: sections[4]?.trim() || 'Technical analysis completed successfully.'
        };

        setAiInsights(structuredInsights);
        
        // Also update legacy insights for backward compatibility
        const legacyInsights: AIInsight[] = [
          {
            type: 'ai_analysis',
            description: aiResponse.substring(0, 200) + '...',
            confidence: 0.9,
            recommendation: structuredInsights.recommendations[0] || 'Continue monitoring the results.'
          }
        ];
        setInsights(legacyInsights);
        
      } else {
        throw new Error(`Groq API error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error generating insights with Groq:', error);
      setInsightsError(error instanceof Error ? error.message : 'Failed to generate AI insights');
      
      // Fallback insights with actual data
      const currentClusterAnalysis = getEnhancedClusterAnalysis();
      const currentAnomalyAnalysis = getEnhancedAnomalyAnalysis();
      
      const fallbackInsights = {
        keyFindings: isClustering 
          ? [`Successfully identified ${currentClusterAnalysis?.totalClusters || 'multiple'} clusters`, 
             `Processed ${normalizedDataPreview.length.toLocaleString()} data points`,
             `${currentClusterAnalysis?.silhouetteScore ? `Silhouette score: ${currentClusterAnalysis.silhouetteScore.toFixed(3)}` : 'Cluster separation analysis completed'}`]
          : [`Detected ${currentAnomalyAnalysis?.anomalyCount || 0} anomalies`,
             `Analyzed ${normalizedDataPreview.length.toLocaleString()} data points`,
             `Risk level assessed as ${currentAnomalyAnalysis?.riskLevel || 'moderate'}`],
        businessInsights: ['Model training completed successfully', 'Results are ready for analysis', 'Data patterns have been identified'],
        recommendations: ['Review the visualizations for pattern insights', 'Consider domain expertise for interpretation', 'Monitor results for data quality'],
        technicalSummary: 'Model training completed successfully. Check your Groq API configuration for enhanced AI insights.'
      };

      setAiInsights(fallbackInsights);
      
      const legacyInsights: AIInsight[] = [{
        type: 'general_analysis',
        description: 'Model training completed successfully. Results are ready for analysis.',
        confidence: 0.75,
        recommendation: 'Review the visualizations and metrics to understand your data patterns.'
      }];
      setInsights(legacyInsights);
    } finally {
      setGeneratingInsights(false);
    }
  };

  // Helper function to extract bullet points from AI response
  const extractBulletPoints = (text: string): string[] => {
    if (!text) return [];
    return text
      .split(/[-•*]\s+/)
      .filter(point => point.trim().length > 10)
      .map(point => point.trim())
      .slice(0, 4); // Limit to 4 points
  };

  // Download functions
  const downloadEnhancedDataset = async (format: 'csv' | 'xlsx'): Promise<void> => {
    try {
      if (!results?.model_id) {
        console.error('No model ID available for download');
        return;
      }

      // Show loading state
      setDownloadingData(true);
      console.log('Fetching complete dataset for download...');
      
      // Fetch all data without pagination for download
      const response = await fetch(`/api/cluster-preview?modelId=${results.model_id}&page=1&limit=999999&filter=${previewFilter}`);
      
      if (!response.ok) {
        console.error('Failed to fetch data for download');
        return;
      }

      const data: ClusterPreviewResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        console.error('No data available for download');
        return;
      }

      // Convert cluster preview data to CSV format
      const headers = data.columns;
      const csvContent = [
        headers.join(','),
        ...data.data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle special formatting for different column types
            if (header === 'cluster' && isClustering) {
              return value !== undefined && value !== null ? `Cluster ${value}` : 'No Cluster';
            } else if (header === 'anomaly' && hasAnomalies) {
              return Number(value) === 1 ? 'Anomaly' : 'Normal';
            } else if (typeof value === 'number') {
              return value.toFixed(4);
            }
            return String(value || '');
          }).join(',')
        )
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create filename based on current filter
      let filename = `cluster_preview_${dataset.transformedName}`;
      if (previewFilter !== 'all') {
        if (previewFilter === 'anomalies') {
          filename += '_anomalies_only';
        } else if (previewFilter === 'normal') {
          filename += '_normal_only';
        } else if (previewFilter.startsWith('cluster_')) {
          filename += `_${previewFilter}`;
        }
      }
      filename += `.${format}`;
      
      a.download = filename;
      document.body.appendChild(a); // Required for Firefox
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`Downloaded ${data.data.length} rows to ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloadingData(false);
    }
  };

  const downloadTrainingCode = (): void => {
    const code = `# ${results?.model_type || results?.task_type || results?.model_name} Training Code
# Generated automatically

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt

# Load your data
data = pd.read_csv('your_dataset.csv')

# Preprocessing
scaler = StandardScaler()
scaled_data = scaler.fit_transform(data)

# Model training
${isClustering ? 
  `model = KMeans(n_clusters=${results?.n_clusters || 3})
predictions = model.fit_predict(scaled_data)` :
  `model = IsolationForest(contamination=0.1)
predictions = model.fit_predict(scaled_data)`}

# Results
print(f"Model: ${results?.model_type || results?.task_type || results?.model_name}")
print(f"Predictions: {predictions[:10]}")
`;

    const blob = new Blob([code], { type: 'text/python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${results?.model_name || 'model'}_training_code.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadModelReport = (): void => {
    const report = `# ${results.model_type} Analysis Report

## Model Information
- Algorithm: ${results.model_type}
- Dataset: ${dataset.transformedName}
- Training Time: ${results.training_time?.toFixed(3)}s

## Results Summary
${isClustering ? 
  `- Clusters Found: ${clusterAnalysis?.totalClusters}
- Silhouette Score: ${clusterAnalysis?.silhouetteScore?.toFixed(3) || 'N/A'}
- Data Points: ${clusterAnalysis?.totalPoints}` :
  `- Anomalies Detected: ${anomalyAnalysis?.totalAnomalies}
- Detection Rate: ${anomalyAnalysis?.detectionRate}%
- Risk Level: ${anomalyAnalysis?.riskLevel}`}

## AI Insights
${insights.map(insight => `- ${insight.description}`).join('\n')}

## Recommendations
${insights.map(insight => insight.recommendation ? `- ${insight.recommendation}` : '').filter(Boolean).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${results.model_name}_analysis_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate data
  const clusterAnalysis = getEnhancedClusterAnalysis();
  const anomalyAnalysis = getEnhancedAnomalyAnalysis();
  const visualizationData = getVisualizationData();

  // Debug logging for analysis
  console.log('Analysis Debug:', {
    isClustering,
    isAnomalyDetection,
    clusterAnalysis,
    anomalyAnalysis,
    resultsClusterLabels: results?.cluster_labels,
    resultsAnomalyLabels: results?.anomaly_labels,
    resultsPredictions: results?.predictions,
    resultsModelName: results?.model_name,
    resultsTaskType: results?.task_type
  });

  // Generate insights on component mount
  useEffect(() => {
    generateAIInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add validation check (after all hooks)
  if (!results || typeof results !== 'object') {
    return <div className="text-red-500">Invalid model results</div>;
  }

  // Tab renderers
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Model Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-blue-600" />
          📌 Model Summary
        </h3>
        
        {loadingMetrics ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg text-center animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-900">
                {enhancedResults?.data_shape?.rows?.toLocaleString() || 
                 enhancedResults?.metrics?.total_samples?.toLocaleString() || 
                 normalizedDataPreview.length.toLocaleString() || 'N/A'}
              </p>
              <p className="text-sm text-blue-600">Data Points</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-900">
                {enhancedResults?.features?.length || 
                 enhancedResults?.data_shape?.columns || 
                 dataPreview?.headers?.length || 'N/A'}
              </p>
              <p className="text-sm text-purple-600">Features</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-900">
                {enhancedResults?.training_time ? `${enhancedResults.training_time.toFixed(3)}s` : 
                 enhancedResults?.metrics?.training_time ? `${enhancedResults.metrics.training_time.toFixed(3)}s` : 'N/A'}
              </p>
              <p className="text-sm text-green-600">Training Time</p>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary with Real Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
          📊 Results Summary
        </h3>
        
        {loadingMetrics ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg text-center animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isClustering && clusterAnalysis && (
              <>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-900">{clusterAnalysis.totalClusters}</p>
                  <p className="text-sm text-purple-600">🎯 Total Clusters</p>
                </div>
                
                {clusterAnalysis.silhouetteScore !== undefined && (
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-900">{clusterAnalysis.silhouetteScore.toFixed(3)}</p>
                    <p className="text-sm text-green-600">📈 Silhouette Score</p>
                  </div>
                )}
                
                {enhancedResults?.inertia !== undefined && (
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-900">{enhancedResults.inertia.toFixed(0)}</p>
                    <p className="text-sm text-orange-600">🔥 Inertia (WCSS)</p>
                  </div>
                )}
                
                {clusterAnalysis.clusterInfo.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-900">{clusterAnalysis.clusterInfo[0].count}</p>
                    <p className="text-sm text-blue-600">🔵 Largest Cluster</p>
                  </div>
                )}
              </>
            )}
            
            {isAnomalyDetection && anomalyAnalysis && (
              <>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-900">{anomalyAnalysis.anomalyCount}</p>
                  <p className="text-sm text-red-600">🚨 Anomalies Found</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-900">{anomalyAnalysis.normalCount}</p>
                  <p className="text-sm text-green-600">✅ Normal Points</p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-900">{anomalyAnalysis.anomalyPercentage}%</p>
                  <p className="text-sm text-yellow-600">📊 Anomaly Rate</p>
                </div>
                
                <div className={`p-4 rounded-lg text-center ${
                  anomalyAnalysis.riskLevel === 'high' ? 'bg-red-100' :
                  anomalyAnalysis.riskLevel === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <p className={`text-2xl font-bold ${
                    anomalyAnalysis.riskLevel === 'high' ? 'text-red-900' :
                    anomalyAnalysis.riskLevel === 'medium' ? 'text-yellow-900' : 'text-green-900'
                  }`}>
                    {anomalyAnalysis.riskLevel.toUpperCase()}
                  </p>
                  <p className={`text-sm ${
                    anomalyAnalysis.riskLevel === 'high' ? 'text-red-600' :
                    anomalyAnalysis.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    ⚠️ Risk Level
                  </p>
                </div>
              </>
            )}

            {/* Fallback when no analysis is available */}
            {!clusterAnalysis && !anomalyAnalysis && !loadingMetrics && (
              <div className="col-span-full">
                <div className="p-6 bg-blue-50 rounded-lg text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-blue-900 font-medium mb-2">Analysis in Progress</p>
                  <p className="text-blue-700 text-sm">
                    Model results are being processed. Please ensure your data contains prediction labels.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance Summary */}
      {enhancedResults?.performance_summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            📈 Performance Assessment
          </h3>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <p className="text-black font-medium">
              Overall Performance: <span className="text-purple-600">{enhancedResults.performance_summary.overall_performance || 'Good'}</span>
            </p>
            {enhancedResults.performance_summary.key_metrics && (
              <div className="mt-2 text-sm text-black">
                <p>Key metrics and insights available in detailed analysis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hyperparameters Section */}
      {(enhancedResults?.hyperparams || enhancedResults?.original_hyperparams || enhancedResults?.metrics?.hyperparameters) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-indigo-600" />
            ⚙️ Model Configuration
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Training Hyperparameters */}
            {enhancedResults?.hyperparams && Object.keys(enhancedResults.hyperparams).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-black">🎯 Training Parameters</h4>
                <div className="bg-blue-50 p-3 rounded-lg space-y-3">
                  {Object.entries(enhancedResults.hyperparams).map(([key, value]) => {
                    // Get definition for each parameter
                    const getParameterDefinition = (paramKey: string) => {
                      const definitions: Record<string, string> = {
                        'n_clusters': 'Number of clusters to form and centroids to generate',
                        'max_iter': 'Maximum number of iterations for algorithm convergence',
                        'random_state': 'Random seed for reproducible results',
                        'init': 'Method for initialization of centroids',
                        'tol': 'Tolerance for convergence criteria',
                        'algorithm': 'Algorithm variant to use for clustering',
                        'n_init': 'Number of different centroid initializations',
                        'eps': 'Maximum distance between samples in same neighborhood',
                        'min_samples': 'Minimum samples required to form dense region',
                        'contamination': 'Proportion of outliers/anomalies in dataset',
                        'n_estimators': 'Number of base estimators in ensemble',
                        'verbose': 'Enable/disable verbose output during training'
                      };
                      return definitions[paramKey] || 'Configuration parameter for model training';
                    };

                    return (
                      <div key={key} className="border-l-2 border-blue-300 pl-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <span className="font-bold text-black">{String(value)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{getParameterDefinition(key)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detailed Model Hyperparameters */}
            {enhancedResults?.metrics?.hyperparameters && Object.keys(enhancedResults.metrics.hyperparameters).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-black">🔧 Model Hyperparameters</h4>
                <div className="bg-green-50 p-3 rounded-lg space-y-3">
                  {Object.entries(enhancedResults.metrics.hyperparameters).map(([key, value]) => {
                    // Get definition for each parameter
                    const getParameterDefinition = (paramKey: string) => {
                      const definitions: Record<string, string> = {
                        'n_clusters': 'Number of clusters to form and centroids to generate',
                        'max_iter': 'Maximum number of iterations for algorithm convergence',
                        'random_state': 'Random seed for reproducible results',
                        'init': 'Method for initialization of centroids',
                        'tol': 'Tolerance for convergence criteria',
                        'algorithm': 'Algorithm variant to use for clustering',
                        'n_init': 'Number of different centroid initializations',
                        'eps': 'Maximum distance between samples in same neighborhood',
                        'min_samples': 'Minimum samples required to form dense region',
                        'contamination': 'Proportion of outliers/anomalies in dataset',
                        'n_estimators': 'Number of base estimators in ensemble',
                        'verbose': 'Enable/disable verbose output during training'
                      };
                      return definitions[paramKey] || 'Advanced configuration parameter for model optimization';
                    };

                    return (
                      <div key={key} className="border-l-2 border-green-300 pl-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <span className="font-bold text-black">
                            {typeof value === 'number' ? 
                              (value % 1 === 0 ? value.toString() : value.toFixed(6)) : 
                              String(value)
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{getParameterDefinition(key)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Metrics Section */}
      {enhancedResults?.metrics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
            📊 Advanced Metrics
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quality Metrics */}
            {enhancedResults.metrics.silhouette_score !== undefined && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-900">{enhancedResults.metrics.silhouette_score.toFixed(4)}</p>
                  <p className="text-sm text-purple-600 font-medium">📈 Silhouette Score</p>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Measures how well-separated clusters are. Range: -1 to 1. Higher values indicate better clustering.
                </p>
              </div>
            )}

            {enhancedResults.metrics.davies_bouldin_score !== undefined && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-900">{enhancedResults.metrics.davies_bouldin_score.toFixed(4)}</p>
                  <p className="text-sm text-orange-600 font-medium">📉 Davies-Bouldin Score</p>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Average similarity between clusters. Lower values indicate better clustering quality.
                </p>
              </div>
            )}

            {enhancedResults.metrics.inertia !== undefined && (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-900">{enhancedResults.metrics.inertia.toFixed(0)}</p>
                  <p className="text-sm text-red-600 font-medium">🔥 Inertia (WCSS)</p>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Sum of squared distances from points to cluster centers. Lower values indicate tighter clusters.
                </p>
              </div>
            )}

            {enhancedResults.metrics.n_iter !== undefined && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900">{enhancedResults.metrics.n_iter}</p>
                  <p className="text-sm text-green-600 font-medium">🔄 Iterations</p>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Number of iterations the algorithm took to converge. Shows computational efficiency.
                </p>
              </div>
            )}

            {/* Additional metrics dynamically */}
            {Object.entries(enhancedResults.metrics)
              .filter(([key, value]) => 
                typeof value === 'number' && 
                !['silhouette_score', 'davies_bouldin_score', 'inertia', 'n_iter', 'total_samples', 'feature_count', 'num_clusters'].includes(key)
              )
              .slice(0, 6) // Limit to 6 additional metrics
              .map(([key, value]) => (
                <div key={key} className="p-4 bg-indigo-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-900">
                    {typeof value === 'number' ? (value % 1 === 0 ? value.toString() : value.toFixed(4)) : String(value)}
                  </p>
                  <p className="text-sm text-indigo-600 capitalize">📊 {key.replace('_', ' ')}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Cluster Centers (for clustering models) */}
      {isClustering && enhancedResults?.metrics?.cluster_centers && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            🎯 Cluster Centers
          </h3>
          
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>What are Cluster Centers?</strong> These are the central points (centroids) of each cluster, 
              representing the average values of all features for data points in that cluster. They help understand 
              the characteristics that define each cluster.
            </p>
          </div>
          
          <div className="space-y-4">
            {Object.entries(enhancedResults.metrics.cluster_centers).map(([clusterKey, center]) => (
              <div key={clusterKey} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-black mb-3 capitalize">{clusterKey.replace('_', ' ')}</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(center as Record<string, number>).map(([feature, value]) => (
                    <div key={feature} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600 capitalize">{feature.replace('_', ' ')}:</span>
                      <span className="text-sm font-medium text-black">
                        {typeof value === 'number' ? value.toFixed(4) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WCSS per Cluster (for clustering models) */}
      {isClustering && enhancedResults?.metrics?.cluster_wcss && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-red-600" />
            🔥 Cluster WCSS (Within-Cluster Sum of Squares)
          </h3>
          
          <div className="bg-red-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-red-800">
              <strong>What is WCSS?</strong> Within-Cluster Sum of Squares measures the compactness of each cluster. 
              Lower values indicate that data points are closer to their cluster center, showing better clustering quality.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {enhancedResults.metrics.cluster_wcss.map((wcss: number, index: number) => (
              <div key={index} className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-900">{wcss.toFixed(0)}</p>
                <p className="text-sm text-red-600 font-medium">🔥 Cluster {index} WCSS</p>
                <p className="text-xs text-gray-600 mt-1">
                  {wcss < 1000 ? 'Very Tight' : wcss < 5000 ? 'Tight' : wcss < 10000 ? 'Moderate' : 'Loose'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preprocessing Information */}
      {enhancedResults?.metrics?.preprocessing && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-green-600" />
            🔧 Data Preprocessing
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(enhancedResults.metrics.preprocessing).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700 capitalize">{key.replace('_', ' ')}:</span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {value ? '✅ Applied' : '❌ Not Applied'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cluster Statistics (for clustering models) */}
      {isClustering && enhancedResults?.metrics?.cluster_statistics && Object.keys(enhancedResults.metrics.cluster_statistics).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            📈 Cluster Statistics
          </h3>
          
          <div className="space-y-4">
            {Object.entries(enhancedResults.metrics.cluster_statistics).map(([clusterKey, stats]) => {
              const statsObj = stats as Record<string, unknown>;
              
              // Generate AI insights for each cluster
              const getClusterInsight = (clusterData: Record<string, unknown>) => {
                const size = clusterData.size as number;
                const percentage = clusterData.percentage as number;
                
                if (percentage > 40) {
                  return "🎯 Dominant cluster - represents the majority pattern in your data";
                } else if (percentage < 15) {
                  return "💎 Niche cluster - captures unique behavioral patterns worth investigating";
                } else if (size > 3000) {
                  return "📊 Large cluster - significant user segment with common characteristics";
                } else {
                  return "🔍 Balanced cluster - moderate-sized group with distinct features";
                }
              };
              
              return (
                <div key={clusterKey} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-black capitalize">{clusterKey.replace('_', ' ')}</h4>
                    <div className="text-right">
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        🤖 AI Insight
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Insight */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-400">
                    <p className="text-sm text-blue-700 font-medium">
                      {getClusterInsight(statsObj)}
                    </p>
                  </div>
                  
                  {stats && typeof stats === 'object' && Object.keys(stats as object).length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.entries(statsObj).map(([statKey, statValue]) => {
                        // Handle nested objects like feature_means and feature_stds
                        if (statKey === 'feature_means' || statKey === 'feature_stds') {
                          const featureData = statValue as Record<string, number>;
                          return (
                            <div key={statKey} className="col-span-full">
                              <h5 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                                {statKey.replace('_', ' ')}
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                {Object.entries(featureData).map(([feature, value]) => (
                                  <div key={feature} className="p-2 bg-gray-50 rounded text-center">
                                    <p className="text-sm font-bold text-gray-900">
                                      {typeof value === 'number' ? value.toFixed(3) : String(value)}
                                    </p>
                                    <p className="text-xs text-gray-600 truncate" title={feature}>
                                      {feature.replace('_', ' ')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        
                        // Handle regular numeric/string values
                        return (
                          <div key={statKey} className="p-3 bg-indigo-50 rounded-lg text-center">
                            <p className="text-lg font-bold text-indigo-900">
                              {typeof statValue === 'number' ? 
                                (statKey === 'percentage' ? `${statValue.toFixed(2)}%` :
                                 statValue % 1 === 0 ? statValue.toString() : statValue.toFixed(4)) : 
                                String(statValue)
                              }
                            </p>
                            <p className="text-xs text-indigo-600 capitalize">{statKey.replace('_', ' ')}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No detailed statistics available for this cluster</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderVisualizationsTab = () => (
    <div className="space-y-6">
      {/* Interactive Scatter Plot */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-purple-600" />
            📊 Interactive Data Visualization
          </h3>
          
          {isClustering && (
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600">Filter by cluster:</label>
              <select 
                value={selectedCluster || ''} 
                onChange={(e) => setSelectedCluster(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Clusters</option>
                {clusterAnalysis?.clusterInfo.map(cluster => (
                  <option key={cluster.cluster} value={cluster.cluster}>
                    Cluster {cluster.cluster}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {isAnomalyDetection && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showAnomaliesOnly}
                onChange={(e) => setShowAnomaliesOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">🔍 Show anomalies only</span>
            </label>
          )}
        </div>

        {visualizationData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={visualizationData.filter(point => {
                if (isClustering && selectedCluster !== null) {
                  return point.cluster === selectedCluster;
                }
                if (isAnomalyDetection && showAnomaliesOnly) {
                  return point.isAnomaly;
                }
                return true;
              })}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="x" 
                  type="number" 
                  domain={['dataMin', 'dataMax']}
                  name={results?.feature_columns?.[0] || 'X-axis'}
                />
                <YAxis 
                  dataKey="y" 
                  type="number" 
                  domain={['dataMin', 'dataMax']}
                  name={results?.feature_columns?.[1] || 'Y-axis'}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                          <p className="font-medium">{`Point ${data.id}`}</p>
                          <p>{`${results?.feature_columns?.[0] || 'X'}: ${data.x}`}</p>
                          <p>{`${results?.feature_columns?.[1] || 'Y'}: ${data.y}`}</p>
                          {isClustering && <p className="text-purple-600">{`🎯 Cluster: ${data.cluster}`}</p>}
                          {isAnomalyDetection && (
                            <p className={data.isAnomaly ? 'text-red-600' : 'text-green-600'}>
                              {data.isAnomaly ? '🚨 Anomaly' : '✅ Normal'}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  dataKey="y" 
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-500">
            <p>Unable to generate visualization with current data</p>
          </div>
        )}
      </div>

      {/* Cluster Distribution Chart */}
      {isClustering && clusterAnalysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
            📈 Cluster Size Distribution
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {clusterAnalysis.clusterInfo.map((cluster) => (
              <div key={cluster.cluster} className="p-4 border border-gray-200 rounded-lg text-center hover:shadow-md transition-shadow">
                <div 
                  className="w-8 h-8 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: cluster.color }}
                ></div>
                <h4 className="font-semibold text-gray-800">Cluster {cluster.cluster}</h4>
                <p className="text-lg font-bold text-gray-900">{cluster.count}</p>
                <p className="text-sm text-gray-600">{cluster.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderAIInsightsTab = () => (
    <div className="space-y-6">
      {/* AI Insights Generation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            🧠 AI Insights
          </h3>
          <button 
            onClick={generateAIInsights}
            disabled={generatingInsights}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              generatingInsights 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {generatingInsights ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Insights</span>
              </>
            )}
          </button>
        </div>

        {/* AI Insights Display */}
        {aiInsights && (
          <div className="space-y-4">
            {/* Key Findings Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-black mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                🎯 Key Findings
              </h4>
              <div className="text-black text-sm space-y-2">
                {aiInsights.keyFindings?.map((finding, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{finding}</span>
                  </div>
                )) || (
                  <p>AI analysis reveals important patterns in your data that can help guide decision-making.</p>
                )}
              </div>
            </div>

            {/* Business Insights Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-black mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                💡 Business Insights
              </h4>
              <div className="text-black text-sm space-y-2">
                {aiInsights.businessInsights?.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>{insight}</span>
                  </div>
                )) || (
                  <p>These patterns suggest actionable opportunities for optimization and strategic planning.</p>
                )}
              </div>
            </div>

            {/* Recommendations Card */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-medium text-black mb-2 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                📋 Recommendations
              </h4>
              <div className="text-black text-sm space-y-2">
                {aiInsights.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>{rec}</span>
                  </div>
                )) || (
                  <p>Based on the analysis, consider these strategies to leverage your data insights effectively.</p>
                )}
              </div>
            </div>

            {/* Technical Summary Card */}
            {aiInsights.technicalSummary && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-medium text-black mb-2 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  🔧 Technical Summary
                </h4>
                <div className="text-black text-sm">
                  {aiInsights.technicalSummary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Insights Yet State */}
        {!aiInsights && !generatingInsights && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-gray-600 mb-2">Ready to generate AI-powered insights</p>
            <p className="text-sm text-gray-500">
              Click &quot;Generate AI Insights&quot; to get intelligent analysis of your {isClustering ? 'clustering' : 'anomaly detection'} results
            </p>
          </div>
        )}

        {/* Error State */}
        {insightsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <h4 className="font-medium text-red-900">Unable to Generate Insights</h4>
            </div>
            <p className="text-red-700 text-sm mb-3">{insightsError}</p>
            <button 
              onClick={generateAIInsights}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Model Performance Context */}
      {(clusterAnalysis || anomalyAnalysis) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            📊 Performance Context
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Model Metrics */}
            <div className="space-y-3">
              <h4 className="font-medium text-black">📈 Key Metrics</h4>
              <div className="space-y-2 text-sm">
                {isClustering && clusterAnalysis && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-black">Total Clusters:</span>
                      <span className="font-medium text-black">{clusterAnalysis.totalClusters}</span>
                    </div>
                    {clusterAnalysis.silhouetteScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-black">Silhouette Score:</span>
                        <span className="font-medium text-black">{clusterAnalysis.silhouetteScore.toFixed(3)}</span>
                      </div>
                    )}
                    {enhancedResults?.inertia !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-black">Inertia (WCSS):</span>
                        <span className="font-medium text-black">{enhancedResults.inertia.toFixed(0)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {isAnomalyDetection && anomalyAnalysis && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-black">Anomalies Found:</span>
                      <span className="font-medium text-red-600">{anomalyAnalysis.anomalyCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Anomaly Rate:</span>
                      <span className="font-medium text-black">{anomalyAnalysis.anomalyPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Risk Level:</span>
                      <span className={`font-medium ${
                        anomalyAnalysis.riskLevel === 'high' ? 'text-red-600' :
                        anomalyAnalysis.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {anomalyAnalysis.riskLevel.toUpperCase()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Data Quality */}
            <div className="space-y-3">
              <h4 className="font-medium text-black">🔍 Data Quality</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black">Total Samples:</span>
                  <span className="font-medium text-black">
                    {enhancedResults?.data_shape?.rows?.toLocaleString() || 
                     enhancedResults?.metrics?.total_samples?.toLocaleString() || 
                     normalizedDataPreview.length.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Features Used:</span>
                  <span className="font-medium text-black">
                    {enhancedResults?.features?.length || 
                     enhancedResults?.data_shape?.columns || 
                     'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Training Time:</span>
                  <span className="font-medium text-black">
                    {enhancedResults?.training_time ? `${enhancedResults.training_time.toFixed(3)}s` : 
                     enhancedResults?.metrics?.training_time ? `${enhancedResults.metrics.training_time.toFixed(3)}s` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDownloadTab = () => (
    <div className="space-y-6">
      {/* Enhanced Dataset Download */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2 text-green-600" />
          📁 Download Enhanced Dataset
        </h3>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-blue-900 mb-2">📋 What&apos;s Included in Download:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Complete cluster preview dataset as shown in the table above</li>
            <li>• {isClustering ? '🎯 Cluster assignments for each data point' : '🚨 Anomaly detection results (normal/anomaly)'}</li>
            <li>• 📊 All original features with sample indices</li>
            <li>• 🔽 Respects current filter selection (all data, anomalies only, specific clusters, etc.)</li>
            <li>•    Formatted for easy analysis in Excel or other tools</li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={async () => await downloadEnhancedDataset('csv')}
            disabled={downloadingData}
            className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
              downloadingData 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {downloadingData ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>Download as CSV</span>
              </>
            )}
          </button>
          
          <button
            onClick={async () => await downloadEnhancedDataset('xlsx')}
            disabled={downloadingData}
            className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
              downloadingData 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {downloadingData ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-5 h-5" />
                <span>Download as Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Python Code Download */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Code className="w-5 h-5 mr-2 text-purple-600" />
          🐍 Training Code & Reproducibility
        </h3>
        
        <div className="bg-purple-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-purple-900 mb-2">📝 Generated Code Includes:</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Complete Python script to reproduce this model</li>
            <li>• Data preprocessing and feature engineering steps</li>
            <li>• Model configuration and hyperparameters</li>
            <li>• Evaluation metrics and visualization code</li>
            <li>• Requirements.txt with all dependencies</li>
          </ul>
        </div>

        <button
          onClick={() => downloadTrainingCode()}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full"
        >
          <FileText className="w-5 h-5" />
          <span>📦 Download Training Code Package</span>
        </button>
      </div>

      {/* Model Report */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-indigo-600" />
          📊 Analysis Report
        </h3>
        
        <div className="bg-indigo-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-indigo-900 mb-2">📄 Comprehensive Report Contains:</h4>
          <ul className="text-sm text-indigo-800 space-y-1">
            <li>• Executive summary of findings</li>
            <li>• Detailed model performance metrics</li>
            <li>• AI-generated insights and recommendations</li>
            <li>• Visualizations and charts</li>
            <li>• Data quality assessment</li>
            <li>• Next steps and improvement suggestions</li>
          </ul>
        </div>

        <button
          onClick={() => downloadModelReport()}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full"
        >
          <FileText className="w-5 h-5" />
          <span>📋 Generate & Download Report</span>
        </button>
      </div>

      {/* Enhanced Data Preview with Pagination */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-black flex items-center">
            <Eye className="w-5 h-5 mr-2 text-gray-600" />
            👀 Enhanced Data Preview
          </h3>
          
          <div className="flex items-center space-x-4">
        {/* Filter Controls */}
        {(isClustering || hasAnomalies) && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-black">Filter:</span>
            <select
              value={previewFilter}
              onChange={(e) => {
                setPreviewFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
            >
              <option value="all">All Data</option>
              {hasAnomalies && (
                <>
                  <option value="anomalies">🚨 Anomalies Only</option>
                  <option value="normal">✅ Normal Only</option>
                </>
              )}
              {isClustering && clusterNumbers.map(cluster => (
                <option key={cluster} value={`cluster_${cluster}`}>
                  🎯 Cluster {cluster} Only
                </option>
              ))}
            </select>
          </div>
        )}            {/* Download Options */}
            <div className="flex space-x-2">
              <button
                onClick={async () => await downloadEnhancedDataset('csv')}
                disabled={downloadingData}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors text-sm ${
                  downloadingData 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {downloadingData ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>CSV</span>
              </button>
              <button
                onClick={async () => await downloadEnhancedDataset('xlsx')}
                disabled={downloadingData}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors text-sm ${
                  downloadingData 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {downloadingData ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>
        
        {loadingClusterPreview ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <p className="text-black font-medium">Loading cluster preview data...</p>
          </div>
        ) : clusterPreviewData.length > 0 ? (
          <>
            {/* Data Summary */}
            <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex space-x-6 text-sm">
                <span className="text-black">
                  <strong>Showing:</strong> {clusterPreviewData.length.toLocaleString()} 
                  {previewFilter !== 'all' && (
                    <span className="text-blue-600"> (filtered from {clusterPreviewPagination.totalRows.toLocaleString()})</span>
                  )}
                </span>
                <span className="text-black">
                  <strong>Columns:</strong> {clusterPreviewColumns.length}
                </span>
                {isClustering && previewFilter === 'all' && (
                  <span className="text-purple-600">
                    <strong>🎯 Clusters:</strong> {clusterNumbers.length}
                  </span>
                )}
                {hasAnomalies && previewFilter === 'all' && (
                  <span className="text-red-600">
                    <strong>🚨 Total Rows:</strong> {clusterPreviewPagination.totalRows.toLocaleString()}
                  </span>
                )}
              </div>
              
              {/* Items per page selector */}
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-black">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newItemsPerPage = parseInt(e.target.value);
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1); // Reset to first page when changing items per page
                  }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-black">entries</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-black border-b">#</th>
                    {clusterPreviewColumns.map((column) => (
                      <th key={column} className="text-left p-3 font-medium text-black border-b">
                        {column === 'sample_index' ? (
                          <span>📊 Index</span>
                        ) : column === 'cluster' ? (
                          <span className="flex items-center">
                            🎯 Cluster
                          </span>
                        ) : column === 'anomaly' ? (
                          <span className="flex items-center">
                            🚨 Status
                          </span>
                        ) : (
                          <span className="capitalize">{column.replace('_', ' ')}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clusterPreviewData.map((row, index) => {
                    const actualIndex = ((clusterPreviewPagination.currentPage - 1) * itemsPerPage) + index;
                    const isAnomaly = row.anomaly === 1;
                    
                    return (
                      <tr key={row.sample_index || index} className={`border-b border-gray-100 transition-colors ${
                        isAnomaly ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                      }`}>
                        <td className="p-3 font-medium text-black">{actualIndex + 1}</td>
                        {clusterPreviewColumns.map((column) => {
                          const value = row[column];
                          
                          return (
                            <td key={column} className="p-3">
                              {column === 'cluster' && isClustering ? (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  value !== undefined && value !== null
                                    ? `bg-purple-100 text-purple-800 border border-purple-200`
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {value !== undefined && value !== null ? (
                                    <>🎯 Cluster {value}</>
                                  ) : (
                                    'No Cluster'
                                  )}
                                </span>
                              ) : column === 'anomaly' && hasAnomalies ? (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  Number(value) === 1 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
                                }`}>
                                  {Number(value) === 1 ? '🚨 Anomaly' : '✅ Normal'}
                                </span>
                              ) : (
                                <span className="text-black">
                                  {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {clusterPreviewPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-black">
                  Showing {((clusterPreviewPagination.currentPage - 1) * itemsPerPage) + 1} to {Math.min(clusterPreviewPagination.currentPage * itemsPerPage, clusterPreviewPagination.totalRows)} of {clusterPreviewPagination.totalRows.toLocaleString()} entries
                  {previewFilter !== 'all' && (
                    <span className="text-blue-600 ml-1">
                      ({previewFilter === 'anomalies' ? 'anomalies' : previewFilter === 'normal' ? 'normal data' : previewFilter.replace('cluster_', 'cluster ')})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, clusterPreviewPagination.currentPage - 1))}
                    disabled={!clusterPreviewPagination.hasPrev}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      !clusterPreviewPagination.hasPrev
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-black border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex space-x-1">
                    {(() => {
                      const totalPages = clusterPreviewPagination.totalPages;
                      const currentPage = clusterPreviewPagination.currentPage;
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      const pages = [];
                      
                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setCurrentPage(1)}
                            className="px-3 py-2 text-sm border border-gray-300 bg-white text-black hover:bg-gray-50 rounded-md"
                          >
                            1
                          </button>
                        );
                        if (startPage > 2) {
                          pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                        }
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                              i === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 bg-white text-black hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-3 py-2 text-sm border border-gray-300 bg-white text-black hover:bg-gray-50 rounded-md"
                          >
                            {totalPages}
                          </button>
                        );
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(clusterPreviewPagination.totalPages, clusterPreviewPagination.currentPage + 1))}
                    disabled={!clusterPreviewPagination.hasNext}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      !clusterPreviewPagination.hasNext
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-black border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
              <Eye className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-black font-medium">No cluster preview data available</p>
            <p className="text-black text-sm mt-1">The model results don&apos;t contain preview data to display</p>
          </div>
        )}
      </div>
    </div>
  );

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Progress */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-7 h-7 mr-3 text-blue-600" />
                🎯 Unsupervised Learning Results
              </h1>
              <p className="text-gray-600 mt-1">
                {isClustering ? '🔍 Clustering Analysis' : '🚨 Anomaly Detection'} • {results?.model_type || results?.task_type || results?.model_name}
              </p>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span>Step 4 of 4 Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
            {['overview', 'visualizations', 'ai-insights', 'download'].map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                {tab === 'overview' && '📌'} 
                {tab === 'visualizations' && '📊'} 
                {tab === 'ai-insights' && '🧠'} 
                {tab === 'download' && '📁'} 
                {' '}{tab.replace('-', ' ').replace('_', ' ')}
            </button>
            ))}
        </nav>
        </div>

          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'visualizations' && renderVisualizationsTab()}
            {activeTab === 'ai-insights' && renderAIInsightsTab()}
            {activeTab === 'download' && renderDownloadTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnsupervisedModelResults;
