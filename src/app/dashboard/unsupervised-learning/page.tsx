'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import {
  Brain,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Settings,
  Target,
  Play,
  BarChart3,
  Info
} from 'lucide-react';

import UnsupervisedModelResults from '../../../components/UnsupervisedModelResults';

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

interface DataPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  sampleSize: number;
}

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
}

const modelOptions = [
  {
    id: 'kmeans',
    name: 'K-Means Clustering',
    type: 'clustering',
    icon: '🎯',
    description: 'Groups your data into K clusters based on similarity',
    useCases: [
      'Customer segmentation',
      'Market research',
      'Data categorization',
      'Pattern discovery'
    ],
    parameters: [
      { name: 'n_clusters', label: 'Number of Clusters', type: 'number', default: 3, min: 2, max: 20 },
      { name: 'max_iter', label: 'Max Iterations', type: 'number', default: 300, min: 50, max: 1000 },
      { name: 'random_state', label: 'Random State', type: 'number', default: 42 }
    ]
  },
  {
    id: 'isolation_forest',
    name: 'Isolation Forest',
    type: 'anomaly_detection',
    icon: '🛡️',
    description: 'Detects anomalies and outliers in your data',
    useCases: [
      'Fraud detection',
      'Quality control',
      'System monitoring',
      'Outlier identification'
    ],
    parameters: [
      { name: 'contamination', label: 'Contamination Rate', type: 'number', default: 0.1, min: 0.01, max: 0.5, step: 0.01 },
      { name: 'n_estimators', label: 'Number of Trees', type: 'number', default: 100, min: 50, max: 500 },
      { name: 'random_state', label: 'Random State', type: 'number', default: 42 }
    ]
  }
];

export default function UnsupervisedLearning() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State management
  const [dataset, setDataset] = useState<TransformedDataset | null>(null);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelParams, setModelParams] = useState<Record<string, string | number>>({});
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [results, setResults] = useState<UnsupervisedResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  const datasetId = searchParams.get('dataset');

  // Load dataset information
  useEffect(() => {
    if (!session?.user?.id || !datasetId) return;

    const fetchDataset = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/transformed-datasets');
        if (!response.ok) throw new Error('Failed to fetch datasets');
        
        const data = await response.json();
        const datasets = data.datasets || data || [];
        const foundDataset = datasets.find((d: TransformedDataset) => d.id === datasetId);
        
        if (!foundDataset) {
          throw new Error('Dataset not found');
        }

        setDataset(foundDataset);
        await loadDataPreview(foundDataset);
      } catch (err) {
        console.error('Error fetching dataset:', err);
        setError('Failed to load dataset. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataset();
  }, [session?.user?.id, datasetId]);

  // Load dataset preview
  const loadDataPreview = async (dataset: TransformedDataset) => {
    try {
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Failed to load dataset');
      
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (parseResults) => {
          const headers = parseResults.meta.fields || [];
          const rows = parseResults.data.map((row: Record<string, string>) => 
            headers.map(header => row[header] || '')
          );
          
          setDataPreview({
            headers,
            rows,
            totalRows: rows.length,
            sampleSize: Math.min(rows.length, 100)
          });

          // Initialize with all features selected
          setSelectedFeatures(headers);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast.error('Failed to parse dataset');
        }
      });
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Failed to load dataset preview');
    }
  };

  // Initialize model parameters when model is selected
  useEffect(() => {
    if (selectedModel) {
      const model = modelOptions.find(m => m.id === selectedModel);
      if (model) {
        const defaultParams: Record<string, string | number> = {};
        model.parameters.forEach(param => {
          defaultParams[param.name] = param.default;
        });
        setModelParams(defaultParams);
      }
    }
  }, [selectedModel]);

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSelectAllFeatures = () => {
    if (dataPreview) {
      setSelectedFeatures(dataPreview.headers);
    }
  };

  const handleDeselectAllFeatures = () => {
    setSelectedFeatures([]);
  };

  const handleParamChange = (paramName: string, value: string | number) => {
    setModelParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleTrainModel = async () => {
    if (!dataset || !selectedModel || selectedFeatures.length === 0) {
      toast.error('Please select a model and at least one feature');
      return;
    }

    setIsTraining(true);
    try {
      // First, fetch the CSV data from the URL
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
      const csvResponse = await fetch(proxyUrl);
      if (!csvResponse.ok) {
        throw new Error('Failed to fetch CSV data');
      }
      const csvData = await csvResponse.text();

      // Then send the CSV data directly to the backend
      const response = await fetch('http://localhost:5000/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csv_data: csvData,
          model_name: selectedModel,
          features: selectedFeatures,
          hyperparams: {
            ...modelParams,
            task_type: modelOptions.find(m => m.id === selectedModel)?.type
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Training failed');
      }

      const trainingResults = await response.json();
      setResults(trainingResults);
      setShowResults(true);
      toast.success('Model training completed successfully!');
    } catch (error) {
      console.error('Training error:', error);
      toast.error(`Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTraining(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to truncate long dataset names
  const getDisplayDatasetName = (name: string) => {
    if (name.length <= 50) return name;
    
    // Try to extract meaningful parts from the name
    // Remove timestamps and long IDs, keep the core name
    let displayName = name;
    
    // Remove common patterns like timestamps, IDs, and "normalized" suffix
    displayName = displayName
      .replace(/_\d{13,}/g, '') // Remove long timestamp numbers
      .replace(/_normalized_\d+/g, '') // Remove normalized suffix with numbers
      .replace(/_normalized/g, '') // Remove just normalized
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    // If still too long, truncate intelligently
    if (displayName.length > 50) {
      const parts = displayName.split('_');
      if (parts.length > 1) {
        // Keep first few meaningful parts
        const importantParts = parts.slice(0, 3);
        displayName = importantParts.join('_');
        if (displayName.length > 50) {
          displayName = displayName.substring(0, 47) + '...';
        }
      } else {
        displayName = displayName.substring(0, 47) + '...';
      }
    }
    
    return displayName;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to access unsupervised learning.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
          <p className="text-gray-600">Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (error || !dataset || !dataPreview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dataset</h3>
          <p className="text-red-600 mb-4">{error || 'Dataset not found'}</p>
          <button
            onClick={() => router.push('/dashboard/model-training')}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Model Training
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showResults && results ? (
        <UnsupervisedModelResults
          results={results}
          dataPreview={dataPreview}
          dataset={dataset}
          onBack={() => setShowResults(false)}
        />
      ) : (
        <>
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-8">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => router.push('/dashboard/model-training')}
                    className="mr-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold flex items-center">
                      <Brain className="w-8 h-8 mr-3" />
                      Unsupervised Learning
                    </h1>
                    <p className="text-yellow-100 mt-2">
                      Find hidden patterns, clusters, and anomalies in your data
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            {/* Dataset Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <BarChart3 className="w-6 h-6 mr-2 text-yellow-600 flex-shrink-0" />
                <span 
                  className="truncate cursor-help" 
                  title={dataset.transformedName}
                >
                  Dataset: {getDisplayDatasetName(dataset.transformedName)}
                </span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Rows:</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {dataPreview.totalRows.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Columns:</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {dataPreview.headers.length}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatFileSize(dataset.fileSize)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">About Unsupervised Learning</h4>
                    <p className="text-sm text-yellow-800">
                      Unlike supervised learning, you don&apos;t need to select a target column. 
                      The algorithm will discover hidden patterns, group similar data points, 
                      or identify anomalies automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Settings className="w-6 h-6 mr-2 text-orange-600" />
                Choose Your Unsupervised Learning Model
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modelOptions.map((model) => (
                  <div
                    key={model.id}
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">{model.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {model.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {model.description}
                        </p>
                        
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Use Cases:</h4>
                          <div className="flex flex-wrap gap-1">
                            {model.useCases.map((useCase, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                              >
                                {useCase}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            model.type === 'clustering' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm font-medium capitalize text-gray-700">
                            {model.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Configuration */}
            {selectedModel && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Target className="w-6 h-6 mr-2 text-purple-600" />
                  Configure {modelOptions.find(m => m.id === selectedModel)?.name}
                </h2>

                {/* Feature Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Select Features</h3>
                  <div className="mb-3 flex space-x-2">
                    <button
                      onClick={handleSelectAllFeatures}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAllFeatures}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Deselect All
                    </button>
                    <span className="text-sm text-gray-600 flex items-center">
                      {selectedFeatures.length} of {dataPreview.headers.length} features selected
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {dataPreview.headers.map((header) => (
                      <button
                        key={header}
                        onClick={() => handleFeatureToggle(header)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                          selectedFeatures.includes(header)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
                        }`}
                      >
                        {header}
                      </button>
                    ))}
                  </div>
                </div>
        {/* Model Parameters */}
        <div className="mb-6">
        <h3 className="text-lg font-medium text-black mb-3">Model Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modelOptions.find(m => m.id === selectedModel)?.parameters.map((param) => (
            <div key={param.name}>
                <label className="block text-sm font-medium text-black mb-1">
                {param.label}
                </label>
                <input
                type={param.type}
                value={modelParams[param.name] || param.default}
                onChange={(e) =>
                    handleParamChange(
                    param.name,
                    param.type === 'number' ? parseFloat(e.target.value) : e.target.value
                    )
                }
                min={param.min}
                max={param.max}
                step={param.step}
className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder-black focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>
            ))}
        </div>
        </div>


                {/* Training Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleTrainModel}
                    disabled={isTraining || selectedFeatures.length === 0}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {isTraining ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Training Model...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Train {modelOptions.find(m => m.id === selectedModel)?.name}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
