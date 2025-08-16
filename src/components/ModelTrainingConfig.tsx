'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import {
  Brain,
  Sliders,
  Zap,
  ChevronDown,
  Loader2,
  PlayCircle,
  ArrowLeft,
  Database,
  Cpu,
  Target,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { 
  inferTaskTypeFromPreview, 
  analyzeTargetColumn, 
  suggestDataSplit,
  TaskInferenceResult,
  TargetAnalysis 
} from '@/utils/taskTypeInference';
import ModelTrainingResults from './ModelTrainingResults';

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
  metadata?: {
    selectedFeatures?: string[];
    targetColumn?: string;
    analysisType?: 'classification' | 'regression';
  };
  isTemporary?: boolean;
}

interface HyperparameterConfig {
  type: 'integer' | 'float' | 'boolean' | 'select';
  default: string | number | boolean;
  range?: [number, number];
  options?: string[];
}

interface ModelConfig {
  name: string;
  displayName: string;
  description: string;
  type: 'supervised' | 'unsupervised';
  task: 'classification' | 'regression' | 'both' | 'clustering' | 'anomaly_detection';
  complexity: 'Low' | 'Medium' | 'High';
  trainingTime: 'Fast' | 'Medium' | 'Slow';
  interpretability: 'High' | 'Medium' | 'Low';
  hyperparameters: Record<string, HyperparameterConfig>;
  pros: string[];
  cons: string[];
  bestFor: string[];
}

interface AIRecommendation {
  recommendedModel: string;
  confidence: number;
  reasoning: string;
  alternativeModels: string[];
  recommendedSplit: {
    train: number;
    test: number;
    validation?: number;
  };
  hyperparameterSuggestions: Record<string, string | number | boolean>;
  dataInsights: string[];
  expectedPerformance: string;
}

interface TrainingConfig {
  model_name: string;
  test_size: number;
  validation_size?: number;
  random_state: number;
  hyperparams: Record<string, string | number | boolean>;
  csv_url: string;
  features: string[];
  target?: string;
}

interface ModelTrainingConfigProps {
  dataset: TransformedDataset;
  dataPreview: {
    headers: string[];
    rows: string[][];
    totalRows: number;
    sampleSize: number;
  };
  selectedTarget: string;
  onBack: () => void;
}

const ModelTrainingConfig: React.FC<ModelTrainingConfigProps> = ({
  dataset,
  dataPreview,
  selectedTarget,
  onBack
}) => {
  const { data: session } = useSession();
  
  // State management
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [testSize, setTestSize] = useState<number>(0.2);
  const [validationSize, setValidationSize] = useState<number>(0.0);
  const [randomState, setRandomState] = useState<number>(42);
  const [hyperparams, setHyperparams] = useState<Record<string, string | number | boolean>>({});
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  
  // Task inference state
  const [taskInference, setTaskInference] = useState<TaskInferenceResult | null>(null);
  const [targetAnalysis, setTargetAnalysis] = useState<TargetAnalysis | null>(null);

  // Training results state
  const [trainingResults, setTrainingResults] = useState<{
    model_id: string;
    metrics: Record<string, unknown>;
    model_name: string;
    created_at: string;
    preview?: Record<string, unknown>[];
    task_type?: 'classification' | 'regression';
    features?: string[];
    target?: string;
  } | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);

  // Available models
  const availableModels: ModelConfig[] = [
    {
      name: 'random_forest',
      displayName: 'Random Forest',
      description: 'Ensemble method that builds multiple decision trees and combines their predictions',
      type: 'supervised',
      task: 'both',
      complexity: 'Medium',
      trainingTime: 'Medium',
      interpretability: 'Medium',
      hyperparameters: {
        n_estimators: { type: 'integer', default: 100, range: [50, 500] },
        max_depth: { type: 'integer', default: 10, range: [3, 30] },
        min_samples_split: { type: 'integer', default: 2, range: [2, 20] }
      },
      pros: ['Handles missing values', 'Feature importance', 'Reduces overfitting'],
      cons: ['Less interpretable than single trees', 'Can overfit with noisy data'],
      bestFor: ['Mixed data types', 'Feature selection', 'Baseline model']
    },
    {
      name: 'xgboost_model',
      displayName: 'XGBoost',
      description: 'Gradient boosting framework optimized for speed and performance',
      type: 'supervised',
      task: 'both',
      complexity: 'High',
      trainingTime: 'Medium',
      interpretability: 'Medium',
      hyperparameters: {
        n_estimators: { type: 'integer', default: 100, range: [50, 300] },
        learning_rate: { type: 'float', default: 0.1, range: [0.01, 0.3] },
        max_depth: { type: 'integer', default: 6, range: [3, 15] }
      },
      pros: ['State-of-the-art performance', 'Built-in regularization', 'Feature importance'],
      cons: ['Many hyperparameters', 'Can overfit', 'Memory intensive'],
      bestFor: ['Competitions', 'High accuracy needed', 'Structured data']
    },
    {
      name: 'logistic_regression',
      displayName: 'Logistic Regression',
      description: 'Linear model for classification with probabilistic output',
      type: 'supervised',
      task: 'classification',
      complexity: 'Low',
      trainingTime: 'Fast',
      interpretability: 'High',
      hyperparameters: {
        C: { type: 'float', default: 1.0, range: [0.001, 100] },
        penalty: { type: 'select', default: 'l2', options: ['l1', 'l2'] },
        max_iter: { type: 'integer', default: 1000, range: [100, 5000] }
      },
      pros: ['Fast training', 'Highly interpretable', 'Probability estimates'],
      cons: ['Assumes linear relationship', 'Sensitive to outliers'],
      bestFor: ['Binary classification', 'Baseline model', 'Interpretability needed']
    },
    {
      name: 'linear_regression',
      displayName: 'Linear Regression',
      description: 'Linear model for regression tasks',
      type: 'supervised',
      task: 'regression',
      complexity: 'Low',
      trainingTime: 'Fast',
      interpretability: 'High',
      hyperparameters: {
        fit_intercept: { type: 'boolean', default: true }
      },
      pros: ['Fast training', 'Highly interpretable', 'No hyperparameter tuning'],
      cons: ['Assumes linear relationship', 'Sensitive to outliers'],
      bestFor: ['Linear relationships', 'Baseline model', 'Simple predictions']
    },
    {
      name: 'svm',
      displayName: 'Support Vector Machine',
      description: 'Finds optimal hyperplane for classification or regression',
      type: 'supervised',
      task: 'both',
      complexity: 'Medium',
      trainingTime: 'Slow',
      interpretability: 'Low',
      hyperparameters: {
        C: { type: 'float', default: 1.0, range: [0.1, 100] },
        kernel: { type: 'select', default: 'rbf', options: ['linear', 'rbf', 'poly'] },
        gamma: { type: 'select', default: 'scale', options: ['scale', 'auto'] }
      },
      pros: ['Effective in high dimensions', 'Memory efficient', 'Versatile kernels'],
      cons: ['Slow on large datasets', 'Sensitive to scaling', 'No probabilistic output'],
      bestFor: ['High-dimensional data', 'Text classification', 'Small datasets']
    }
  ];

  // Get AI recommendations
  const getAIRecommendations = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      const analysisType = dataset.metadata?.analysisType || 'classification';
      const features = dataset.metadata?.selectedFeatures || [];
      const targetColumn = dataset.metadata?.targetColumn || '';
      
      const prompt = `
      You are an expert ML engineer. Analyze this dataset and provide model recommendations:

      Dataset Info:
      - Name: ${dataset.transformedName}
      - Analysis Type: ${analysisType}
      - Rows: ${dataset.rowCount?.toLocaleString() || 'Unknown'}
      - Columns: ${dataset.columnCount || dataPreview.headers.length}
      - File Size: ${(dataset.fileSize / 1024 / 1024).toFixed(2)} MB
      - Features: ${features.length} selected features
      - Target: ${targetColumn}
      - Processing Steps: ${dataset.processingSteps.join(', ')}

      Sample Data (first 5 rows):
      ${dataPreview.headers.join(', ')}
      ${dataPreview.rows.slice(0, 5).map(row => row.join(', ')).join('\n')}

      Available Models: random_forest, xgboost_model, logistic_regression, linear_regression, svm

      Provide a JSON response with:
      {
        "recommendedModel": "best_model_name",
        "confidence": 0.85,
        "reasoning": "Why this model is best for this dataset",
        "alternativeModels": ["model2", "model3"],
        "recommendedSplit": {"train": 0.7, "test": 0.2, "validation": 0.1},
        "hyperparameterSuggestions": {"param1": value1, "param2": value2},
        "dataInsights": ["insight1", "insight2", "insight3"],
        "expectedPerformance": "Expected accuracy/R² range and key considerations"
      }

      Consider: dataset size, problem type, feature count, data quality, interpretability needs.
      `;

      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI recommendations');
      }

      const aiResponse = await response.json();
      
      // Parse the AI response
      try {
        const recommendation = JSON.parse(aiResponse.suggestion);
        setAiRecommendation(recommendation);
        
        // Auto-select recommended model
        if (recommendation.recommendedModel) {
          setSelectedModel(recommendation.recommendedModel);
          
          // Apply recommended split
          if (recommendation.recommendedSplit) {
            setTestSize(recommendation.recommendedSplit.test);
            setValidationSize(recommendation.recommendedSplit.validation || 0);
          }
          
          // Apply hyperparameter suggestions
          if (recommendation.hyperparameterSuggestions) {
            setHyperparams(recommendation.hyperparameterSuggestions);
          }
        }
        
      } catch {
        // Fallback if JSON parsing fails
        console.warn('Failed to parse AI response as JSON, using fallback');
        setAiRecommendation({
          recommendedModel: analysisType === 'classification' ? 'random_forest' : 'linear_regression',
          confidence: 0.7,
          reasoning: 'Based on dataset characteristics and problem type',
          alternativeModels: ['xgboost_model', 'svm'],
          recommendedSplit: { train: 0.8, test: 0.2 },
          hyperparameterSuggestions: {},
          dataInsights: ['Dataset appears suitable for machine learning'],
          expectedPerformance: 'Performance will depend on data quality and feature relevance'
        });
      }

    } catch (error) {
      console.error('AI recommendation error:', error);
      toast.error('Failed to get AI recommendations. Using default settings.');
      
      // Fallback recommendation
      const analysisType = dataset.metadata?.analysisType || 'classification';
      setAiRecommendation({
        recommendedModel: analysisType === 'classification' ? 'random_forest' : 'linear_regression',
        confidence: 0.7,
        reasoning: 'Default recommendation based on problem type',
        alternativeModels: ['xgboost_model'],
        recommendedSplit: { train: 0.8, test: 0.2 },
        hyperparameterSuggestions: {},
        dataInsights: ['Using default configuration'],
        expectedPerformance: 'Performance will depend on data quality'
      });
    } finally {
      setIsLoadingAI(false);
    }
  }, [dataset, dataPreview]);

  // Load AI recommendations on component mount
  useEffect(() => {
    getAIRecommendations();
    
    // Analyze target column and infer task type
    try {
      const analysis = analyzeTargetColumn(selectedTarget, dataPreview);
      setTargetAnalysis(analysis);
      
      // Suggest optimal data split based on analysis
      const splitSuggestion = suggestDataSplit(
        analysis.uniqueCount <= 10 ? 'classification' : 'regression',
        analysis.totalSamples,
        analysis.uniqueCount
      );
      
      setTestSize(splitSuggestion.test);
      setValidationSize(splitSuggestion.validation);
      
    } catch (error) {
      console.error('Error analyzing target column:', error);
    }
  }, [dataset.id, getAIRecommendations, selectedTarget, dataPreview]);

  // Infer task type when model is selected
  useEffect(() => {
    if (selectedModel && selectedTarget) {
      try {
        const inference = inferTaskTypeFromPreview(selectedTarget, dataPreview, selectedModel);
        setTaskInference(inference);
        
        console.log('🔍 Task Inference Result:', inference);
        
        // Show user the inference result
        toast.success(`Detected ${inference.taskType} task - using ${inference.modelVariant}`);
      } catch (error) {
        console.error('Error inferring task type:', error);
        toast.error('Could not determine task type automatically');
      }
    }
  }, [selectedModel, selectedTarget, dataPreview]);

  // Get model configuration
  const getModelConfig = (modelName: string): ModelConfig | undefined => {
    return availableModels.find(m => m.name === modelName);
  };

  // Handle hyperparameter change
  const handleHyperparamChange = (param: string, value: string | number | boolean) => {
    setHyperparams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  // Start training
  const handleStartTraining = async () => {
    const modelConfig = getModelConfig(selectedModel);
    if (!modelConfig) {
      toast.error('Please select a model first');
      return;
    }

    if (!taskInference) {
      toast.error('Task type analysis not complete. Please wait.');
      return;
    }

    setIsTraining(true);
    
    // Use the user-selected target column
    const targetColumn = selectedTarget;
    const availableFeatures = dataPreview.headers.filter(header => header !== targetColumn);
    
    console.log('🎯 Training Configuration:');
    console.log('- Selected target:', targetColumn);
    console.log('- Available features:', availableFeatures);
    console.log('- Task type:', taskInference.taskType);
    console.log('- Model variant:', taskInference.modelVariant);
    console.log('- Confidence:', taskInference.confidence);
    
    // Validate selection
    if (!availableFeatures || availableFeatures.length === 0) {
      toast.error('No features available for training. Please select a different target column.');
      setIsTraining(false);
      return;
    }
    
    if (!targetColumn) {
      toast.error('Please select a target column for training.');
      setIsTraining(false);
      return;
    }
    
    // Enhanced training configuration with task type information
    const config: TrainingConfig = {
      model_name: selectedModel,
      test_size: testSize,
      validation_size: validationSize > 0 ? validationSize : undefined,
      random_state: randomState,
      hyperparams: {
        ...hyperparams,
        // Add task type information for backend
        task_type: taskInference.taskType,
        model_variant: taskInference.modelVariant
      },
      csv_url: dataset.url,
      features: availableFeatures,
      target: targetColumn
    };

    console.log('🚀 Final Training Config:', config);
    
    // Show task inference explanation to user
    toast.success(taskInference.explanation, { duration: 5000 });

    try {
      console.log('Training with config:', config);
      
      let csvText: string;
      
      // Check if this is a temporary dataset (local upload)
      if (dataset.isTemporary) {
        console.log('📁 Fetching temporary dataset directly:', config.csv_url);
        // For temporary datasets, fetch directly from the local public URL
        const response = await fetch(config.csv_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch temporary dataset: ${response.status} ${response.statusText}`);
        }
        csvText = await response.text();
      } else {
        console.log('☁️ Fetching cloud dataset through proxy:', config.csv_url);
        // For cloud datasets, use the proxy
        const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(config.csv_url)}`;
        const csvResponse = await fetch(proxyUrl);
        if (!csvResponse.ok) {
          throw new Error('Failed to fetch CSV data through proxy');
        }
        csvText = await csvResponse.text();
      }
      
      console.log('✅ CSV data fetched successfully, length:', csvText.length);
      
      // Send training request to ML backend with CSV data instead of URL
      const trainingRequest = {
        ...config,
        csv_data: csvText, // Send the actual CSV data
        csv_url: undefined // Remove the URL since we're sending data directly
      };
      
      console.log('Sending training request to ML backend...');
      const response = await fetch('http://localhost:5000/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Training failed';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        console.error('Training request failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Training completed successfully:', result);
      
      // Enhance result with additional metadata
      const enhancedResult = {
        ...result,
        task_type: taskInference.taskType,
        features: config.features,
        target: selectedTarget
      };
      
      setTrainingResults(enhancedResult);
      setShowResults(true);
      
      toast.success('🎉 Model training completed successfully!');
      
      // Optionally save the model to cloud storage
      if (result.model_id) {
        try {
          console.log('Attempting to save model to cloud storage...');
          console.log('Session:', session);
          console.log('Dataset:', dataset);
          
          const saveResponse = await fetch('http://localhost:5000/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model_id: result.model_id,
              model_name: config.model_name,
              user_id: session?.user?.id || 'unknown_user',
              dataset_name: dataset.transformedName || dataset.originalName || 'unknown_dataset'
            })
          });
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            console.log('✅ Model saved to cloud storage successfully:', saveResult);
            toast.success('Model saved to cloud storage');
          } else {
            console.warn('⚠️ Failed to save model to cloud storage:', saveResponse.statusText);
          }
        } catch (saveError) {
          console.warn('⚠️ Could not save model to cloud storage (ML server may not be running):', saveError);
        }
      }

    } catch (error) {
      console.error('❌ Training error:', error);
      
      // Provide more helpful error messages based on the error type
      let errorMessage = 'Training failed';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Could not connect to ML training server. Please ensure the backend server is running on localhost:5000';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(`Training failed: ${errorMessage}`);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Brain className="w-6 h-6 mr-2 text-purple-600" />
              Configure Model Training
            </h2>
            <p className="text-gray-600">Set up your machine learning model and training parameters</p>
          </div>
        </div>
      </div>

      {/* Dataset Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-blue-600" />
          Dataset Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{dataset.rowCount?.toLocaleString() || dataPreview.totalRows.toLocaleString()}</div>
            <div className="text-sm text-purple-600">Rows</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{dataset.metadata?.selectedFeatures?.length || dataPreview.headers.length}</div>
            <div className="text-sm text-blue-600">Features</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 capitalize">{dataset.metadata?.analysisType || 'Unknown'}</div>
            <div className="text-sm text-green-600">Task Type</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{(dataset.fileSize / 1024 / 1024).toFixed(1)} MB</div>
            <div className="text-sm text-orange-600">File Size</div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {isLoadingAI ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-3" />
            <span className="text-gray-600">Getting AI recommendations for your dataset...</span>
          </div>
        </div>
      ) : aiRecommendation && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            AI Recommendations
            <span className="ml-2 px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
              {Math.round(aiRecommendation.confidence * 100)}% confident
            </span>
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Recommended Model</h4>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="font-semibold text-purple-900 capitalize mb-1">
                  {getModelConfig(aiRecommendation.recommendedModel)?.displayName || aiRecommendation.recommendedModel}
                </div>
                <p className="text-sm text-purple-700">{aiRecommendation.reasoning}</p>
              </div>
              
              <h4 className="font-medium text-purple-900 mb-2 mt-4">Data Insights</h4>
              <ul className="space-y-1">
                {aiRecommendation.dataInsights.map((insight, index) => (
                  <li key={index} className="text-sm text-purple-700 flex items-start">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Expected Performance</h4>
              <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                <p className="text-sm text-purple-700">{aiRecommendation.expectedPerformance}</p>
              </div>
              
              <h4 className="font-medium text-purple-900 mb-2">Alternative Models</h4>
              <div className="flex flex-wrap gap-2">
                {aiRecommendation.alternativeModels.map((model, index) => (
                  <span key={index} className="px-3 py-1 bg-white text-purple-700 text-sm rounded-full border border-purple-200">
                    {getModelConfig(model)?.displayName || model}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-green-600" />
          Select Model
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableModels
            .filter(model => 
              model.task === dataset.metadata?.analysisType || 
              model.task === 'both'
            )
            .map((model) => (
            <div
              key={model.name}
              onClick={() => setSelectedModel(model.name)}
              className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                selectedModel === model.name
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{model.displayName}</h4>
                {model.name === aiRecommendation?.recommendedModel && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    AI Pick
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{model.description}</p>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className={`w-full h-2 rounded mb-1 ${
                    model.complexity === 'Low' ? 'bg-green-200' :
                    model.complexity === 'Medium' ? 'bg-yellow-200' : 'bg-red-200'
                  }`}></div>
                  <div className="text-gray-500">Complexity</div>
                </div>
                <div className="text-center">
                  <div className={`w-full h-2 rounded mb-1 ${
                    model.trainingTime === 'Fast' ? 'bg-green-200' :
                    model.trainingTime === 'Medium' ? 'bg-yellow-200' : 'bg-red-200'
                  }`}></div>
                  <div className="text-gray-500">Speed</div>
                </div>
                <div className="text-center">
                  <div className={`w-full h-2 rounded mb-1 ${
                    model.interpretability === 'High' ? 'bg-green-200' :
                    model.interpretability === 'Medium' ? 'bg-yellow-200' : 'bg-red-200'
                  }`}></div>
                  <div className="text-gray-500">Interpret</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Type Inference */}
      {taskInference && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Task Type Analysis
            <span className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded-full">
              {Math.round(taskInference.confidence * 100)}% confident
            </span>
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center mb-3">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  taskInference.taskType === 'classification' ? 'bg-blue-500' : 'bg-orange-500'
                }`}></div>
                <span className="font-medium text-gray-900">
                  Detected: <span className="capitalize text-green-700">{taskInference.taskType}</span>
                </span>
              </div>
              <div className="flex items-center mb-3">
                <Cpu className="w-4 h-4 mr-2 text-gray-600" />
                <span className="text-sm text-gray-700">
                  Model Variant: <span className="font-medium">{taskInference.modelVariant}</span>
                </span>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-green-900 mb-2">Analysis Explanation</h4>
              <p className="text-sm text-green-800 leading-relaxed">
                {taskInference.explanation}
              </p>
            </div>
          </div>
          
          {targetAnalysis && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Target Column Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center">
                  <Info className="w-4 h-4 mr-1 text-gray-500" />
                  <span className="text-black">Unique Values: <strong className="text-black">{targetAnalysis.uniqueCount}</strong></span>
                </div>
                <div className="flex items-center">
                  <span className="text-black">Data Type: <strong className="text-black">{targetAnalysis.isNumeric ? 'Numeric' : 'Categorical'}</strong></span>
                </div>
                <div className="flex items-center">
                  <span className="text-black">Missing: <strong className="text-black">{targetAnalysis.missingPercentage.toFixed(1)}%</strong></span>
                </div>
                <div className="flex items-center">
                  {targetAnalysis.dataQuality === 'Good' && <CheckCircle className="w-4 h-4 mr-1 text-green-500" />}
                  {targetAnalysis.dataQuality === 'Fair' && <AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />}
                  {targetAnalysis.dataQuality === 'Poor' && <AlertTriangle className="w-4 h-4 mr-1 text-red-500" />}
                  <span className="text-black">Quality: <strong className="text-black">{targetAnalysis.dataQuality}</strong></span>
                </div>
              </div>
              
              {targetAnalysis.isImbalanced && taskInference.taskType === 'classification' && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      <strong>Class Imbalance Detected:</strong> Consider using stratified sampling or class weights.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data Splitting */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Sliders className="w-5 h-5 mr-2 text-orange-600" />
          Data Splitting
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Size
              <span className="text-gray-500 font-normal ml-1">({Math.round(testSize * 100)}%)</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSize}
              onChange={(e) => setTestSize(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10%</span>
              <span>40%</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validation Size
              <span className="text-gray-500 font-normal ml-1">({Math.round(validationSize * 100)}%)</span>
            </label>
            <input
              type="range"
              min="0"
              max="0.3"
              step="0.05"
              value={validationSize}
              onChange={(e) => setValidationSize(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>30%</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Random State</label>
            <input
              type="number"
              value={randomState}
              onChange={(e) => setRandomState(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">For reproducible results</p>
          </div>
        </div>
        
        {/* Split Visualization */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Data Split Visualization</span>
          </div>
          <div className="flex h-8 rounded-lg overflow-hidden">
            <div 
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(1 - testSize - validationSize) * 100}%` }}
            >
              Train ({Math.round((1 - testSize - validationSize) * 100)}%)
            </div>
            {validationSize > 0 && (
              <div 
                className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${validationSize * 100}%` }}
              >
                Val ({Math.round(validationSize * 100)}%)
              </div>
            )}
            <div 
              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${testSize * 100}%` }}
            >
              Test ({Math.round(testSize * 100)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Hyperparameters */}
      {selectedModel && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Sliders className="w-5 h-5 mr-2 text-indigo-600" />
              Hyperparameters
            </h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {(() => {
            const modelConfig = getModelConfig(selectedModel);
            if (!modelConfig) return null;
            
            const params = Object.entries(modelConfig.hyperparameters);
            const basicParams = params.slice(0, 3);
            const advancedParams = params.slice(3);
            
            return (
              <div className="space-y-4">
                {basicParams.map(([param, config]) => (
                  <div key={param} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      <p className="text-xs text-gray-500">
                        Default: {config.default?.toString()}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      {config.type === 'integer' || config.type === 'float' ? (
                        <input
                          type="number"
                          step={config.type === 'float' ? '0.01' : '1'}
                          min={config.range?.[0]}
                          max={config.range?.[1]}
                          value={String(hyperparams[param] ?? config.default)}
                          onChange={(e) => handleHyperparamChange(param, config.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                        />
                      ) : config.type === 'boolean' ? (
                        <select
                          value={String(hyperparams[param] ?? config.default)}
                          onChange={(e) => handleHyperparamChange(param, e.target.value === 'true')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : config.type === 'select' ? (
                        <select
                          value={String(hyperparams[param] ?? config.default)}
                          onChange={(e) => handleHyperparamChange(param, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                        >
                          {config.options?.map((option: string) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </div>
                ))}
                
                {showAdvanced && advancedParams.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Parameters</h4>
                    {advancedParams.map(([param, config]) => (
                      <div key={param} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          <p className="text-xs text-gray-500">
                            Default: {config.default?.toString()}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          {/* Similar input handling as above */}
                          <input
                            type="number"
                            step={config.type === 'float' ? '0.01' : '1'}
                            value={String(hyperparams[param] ?? config.default)}
                            onChange={(e) => handleHyperparamChange(param, config.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Start Training Button */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800">Ready to Train</h3>
            <p className="text-gray-600">
              {selectedModel ? (
                <>
                  Train <span className="font-medium">{getModelConfig(selectedModel)?.displayName}</span> on{' '}
                  <span className="font-medium truncate inline-block max-w-xs" title={dataset.transformedName}>
                    {dataset.transformedName.length > 30 
                      ? `${dataset.transformedName.substring(0, 30)}...` 
                      : dataset.transformedName
                    }
                  </span>
                </>
              ) : 
                'Select a model to continue'
              }
            </p>
          </div>
          <button
            onClick={handleStartTraining}
            disabled={!selectedModel || isTraining}
            className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isTraining ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Training...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5 mr-2" />
                Start Training
              </>
            )}
          </button>
        </div>
      </div>

      {/* Training Results Section - Show during training OR after training is complete */}
      {(isTraining || showResults) && (
        <div className="mt-8 space-y-6">
          <div className="border-t border-gray-300 pt-8">
            {!showResults && isTraining && (
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Loader2 className="w-6 h-6 mr-2 text-blue-600 animate-spin" />
                Model Training in Progress
              </h2>
            )}
            
            {showResults && trainingResults && (
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                Training Results
              </h2>
            )}
            
            <ModelTrainingResults
              results={trainingResults || {
                model_id: '',
                metrics: {},
                model_name: '',
                created_at: '',
                task_type: 'classification',
                features: [],
                target: selectedTarget
              }}
              dataPreview={dataPreview}
              selectedTargetColumn={selectedTarget}
              dataset={{
                id: dataset.id,
                transformedName: dataset.transformedName,
                originalName: dataset.originalName
              }}
              userId={session?.user?.id}
              isTraining={isTraining && !showResults}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelTrainingConfig;
