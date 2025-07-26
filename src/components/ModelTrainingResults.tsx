'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { generateMetricExplanation } from '@/utils/groqService';
import {
  Download,
  TestTube2,
  Target,
  Loader2,
  CheckCircle,
  Play,
  Calculator,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TrainingResults {
  model_id: string;
  metrics: Record<string, unknown>;
  model_name: string;
  created_at: string;
  preview?: Record<string, unknown>[];
  task_type?: 'classification' | 'regression';
  features?: string[];
  target?: string;
}

interface ModelTrainingResultsProps {
  results: TrainingResults;
  dataPreview: {
    headers: string[];
    rows: string[][];
    totalRows: number;
    sampleSize: number;
  };
  selectedTargetColumn: string;
}

interface PredictionInput {
  [key: string]: string | number;
}

interface TestResults {
  model_id: string;
  test_size: number;
  predictions: number[];
  features_used: string[];
  accuracy?: number;
  r2_score?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  mape?: number;
  classification_report?: Record<string, unknown>;
  confusion_matrix?: number[][];
  actual_values?: number[];
}

interface PredictionResult {
  prediction: number | string;
  model_id: string;
  features_used: string[];
  input_data: PredictionInput;
  probabilities?: Record<string, number>;
}

// Training vs Test Insight Cards Component
interface TrainingVsTestInsightCardsProps {
  trainingMetrics: Record<string, unknown>;
  testMetrics: TestResults;
  modelType?: string;
  taskType?: 'classification' | 'regression';
}

const TrainingVsTestInsightCards: React.FC<TrainingVsTestInsightCardsProps> = ({ 
  trainingMetrics, 
  testMetrics, 
  modelType = 'random_forest', 
  taskType = 'classification' 
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [aiOpinions, setAiOpinions] = useState<Record<string, string>>({});
  const [loadingOpinions, setLoadingOpinions] = useState<Record<string, boolean>>({});
  
  // Create comparison metrics for cards
  const comparisonMetrics = useMemo(() => {
    const metrics = [];
    
    // Accuracy comparison
    if (trainingMetrics.accuracy && testMetrics.accuracy) {
      metrics.push({
        name: 'Accuracy',
        trainingValue: trainingMetrics.accuracy as number,
        testValue: testMetrics.accuracy,
        improvement: testMetrics.accuracy - (trainingMetrics.accuracy as number),
        type: 'percentage'
      });
    }
    
    // Precision comparison
    if (trainingMetrics.precision) {
      const testPrecision = testMetrics.classification_report && 
        typeof testMetrics.classification_report === 'object' &&
        (testMetrics.classification_report as Record<string, unknown>)['weighted avg'] &&
        ((testMetrics.classification_report as Record<string, unknown>)['weighted avg'] as Record<string, unknown>)['precision'];
      
      if (testPrecision) {
        metrics.push({
          name: 'Precision',
          trainingValue: trainingMetrics.precision as number,
          testValue: testPrecision as number,
          improvement: (testPrecision as number) - (trainingMetrics.precision as number),
          type: 'percentage'
        });
      }
    }
    
    // Recall comparison
    if (trainingMetrics.recall) {
      const testRecall = testMetrics.classification_report && 
        typeof testMetrics.classification_report === 'object' &&
        (testMetrics.classification_report as Record<string, unknown>)['weighted avg'] &&
        ((testMetrics.classification_report as Record<string, unknown>)['weighted avg'] as Record<string, unknown>)['recall'];
      
      if (testRecall) {
        metrics.push({
          name: 'Recall',
          trainingValue: trainingMetrics.recall as number,
          testValue: testRecall as number,
          improvement: (testRecall as number) - (trainingMetrics.recall as number),
          type: 'percentage'
        });
      }
    }
    
    // F1 Score comparison
    if (trainingMetrics.f1_score) {
      const testF1 = testMetrics.classification_report && 
        typeof testMetrics.classification_report === 'object' &&
        (testMetrics.classification_report as Record<string, unknown>)['weighted avg'] &&
        ((testMetrics.classification_report as Record<string, unknown>)['weighted avg'] as Record<string, unknown>)['f1-score'];
      
      if (testF1) {
        metrics.push({
          name: 'F1 Score',
          trainingValue: trainingMetrics.f1_score as number,
          testValue: testF1 as number,
          improvement: (testF1 as number) - (trainingMetrics.f1_score as number),
          type: 'percentage'
        });
      }
    }
    
    // R² Score comparison (for regression)
    if (trainingMetrics.r2_score && testMetrics.r2_score !== undefined) {
      metrics.push({
        name: 'R² Score',
        trainingValue: trainingMetrics.r2_score as number,
        testValue: testMetrics.r2_score,
        improvement: testMetrics.r2_score - (trainingMetrics.r2_score as number),
        type: 'decimal'
      });
    }
    
    // MSE comparison (for regression)
    if (trainingMetrics.mean_squared_error && testMetrics.mse !== undefined) {
      metrics.push({
        name: 'MSE',
        trainingValue: trainingMetrics.mean_squared_error as number,
        testValue: testMetrics.mse,
        improvement: (trainingMetrics.mean_squared_error as number) - testMetrics.mse, // Lower is better for MSE
        type: 'decimal'
      });
    }
    
    // RMSE comparison (for regression)
    if (trainingMetrics.root_mean_squared_error && testMetrics.rmse !== undefined) {
      metrics.push({
        name: 'RMSE',
        trainingValue: trainingMetrics.root_mean_squared_error as number,
        testValue: testMetrics.rmse,
        improvement: (trainingMetrics.root_mean_squared_error as number) - testMetrics.rmse, // Lower is better for RMSE
        type: 'decimal'
      });
    }
    
    // MAE comparison (for regression)
    if (trainingMetrics.mean_absolute_error && testMetrics.mae !== undefined) {
      metrics.push({
        name: 'MAE',
        trainingValue: trainingMetrics.mean_absolute_error as number,
        testValue: testMetrics.mae,
        improvement: (trainingMetrics.mean_absolute_error as number) - testMetrics.mae, // Lower is better for MAE
        type: 'decimal'
      });
    }
    
    // MAPE comparison (for regression)
    if (trainingMetrics.mean_absolute_percentage_error && testMetrics.mape !== undefined) {
      metrics.push({
        name: 'MAPE',
        trainingValue: trainingMetrics.mean_absolute_percentage_error as number,
        testValue: testMetrics.mape,
        improvement: (trainingMetrics.mean_absolute_percentage_error as number) - testMetrics.mape, // Lower is better for MAPE
        type: 'percentage'
      });
    }
    
    return metrics;
  }, [trainingMetrics, testMetrics]);

  // Load AI opinion for current metric comparison
  const loadAiOpinion = useCallback(async (metricName: string, trainingValue: number, testValue: number, improvement: number) => {
    const key = `${metricName}_${trainingValue}_${testValue}`;
    if (aiOpinions[key] || loadingOpinions[key]) return;

    setLoadingOpinions(prev => ({ ...prev, [key]: true }));
    
    try {
      // Generate AI opinion about the comparison
      const opinion = await generateMetricExplanation(
        `${metricName.toLowerCase().replace(' ', '_')}_comparison`,
        testValue,
        modelType,
        taskType
      );
      
      if (opinion) {
        setAiOpinions(prev => ({ ...prev, [key]: opinion }));
      }
    } catch (error) {
      console.error('Failed to load AI opinion:', error);
      // Use fallback opinion
      const isLowerBetter = ['MSE', 'RMSE', 'MAE', 'MAPE'].includes(metricName);
      const effectiveImprovement = isLowerBetter ? -improvement : improvement;
      const performanceAssessment = effectiveImprovement >= 0 ? 'improved' : 'decreased';
      const improvementText = Math.abs(effectiveImprovement * 100).toFixed(1);
      setAiOpinions(prev => ({ 
        ...prev, 
        [key]: `The model's ${metricName.toLowerCase()} ${performanceAssessment} by ${improvementText}% from training to testing. ${effectiveImprovement >= 0 ? 'This indicates good generalization.' : 'This suggests potential overfitting during training.'}`
      }));
    } finally {
      setLoadingOpinions(prev => ({ ...prev, [key]: false }));
    }
  }, [modelType, taskType, aiOpinions, loadingOpinions]);

  // Load AI opinion when card changes
  useEffect(() => {
    if (comparisonMetrics.length > 0) {
      const currentMetric = comparisonMetrics[currentCardIndex];
      loadAiOpinion(currentMetric.name, currentMetric.trainingValue, currentMetric.testValue, currentMetric.improvement);
    }
  }, [currentCardIndex, comparisonMetrics, loadAiOpinion]);

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % comparisonMetrics.length);
  };

  const prevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + comparisonMetrics.length) % comparisonMetrics.length);
  };

  if (comparisonMetrics.length === 0) return null;

  const currentMetric = comparisonMetrics[currentCardIndex];
  
  // Format values based on type
  const formatValue = (value: number, type: string) => {
    if (type === 'percentage') return `${(value * 100).toFixed(1)}%`;
    if (type === 'decimal') return value.toFixed(3);
    return value.toString();
  };

  const getImprovementColor = (improvement: number, metricName: string) => {
    // For MSE, RMSE, MAE, MAPE - lower values are better, so negative improvement is good
    const isLowerBetter = ['MSE', 'RMSE', 'MAE', 'MAPE'].includes(metricName);
    const effectiveImprovement = isLowerBetter ? -improvement : improvement;
    
    if (effectiveImprovement >= 0.05) return 'text-green-700 bg-green-100';
    if (effectiveImprovement >= 0) return 'text-blue-700 bg-blue-100';
    if (effectiveImprovement >= -0.05) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getImprovementText = (improvement: number, metricName: string, type: string) => {
    const isLowerBetter = ['MSE', 'RMSE', 'MAE', 'MAPE'].includes(metricName);
    const effectiveImprovement = isLowerBetter ? -improvement : improvement;
    const improvementValue = type === 'percentage' ? 
      (Math.abs(effectiveImprovement) * 100).toFixed(1) + '%' : 
      Math.abs(effectiveImprovement).toFixed(3);
    
    if (effectiveImprovement > 0) {
      return `📈 +${improvementValue}Improvement`;
    } else if (effectiveImprovement < 0) {
      return `📉 ${improvementValue}Decrease`;
    } else {
      return `➡️ No Change`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h6 className="text-lg font-semibold text-gray-800">🧠 Scoreboard – Model Highlights</h6>
        <div className="text-sm text-gray-500">
          {currentCardIndex + 1} / {comparisonMetrics.length}
        </div>
      </div>
      
      {/* Current Card with Comparison Layout */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Metric Comparison */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">{currentMetric.name} Comparison</h3>
              
              {/* Training vs Test Values */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                  <div className="text-lg font-bold text-orange-800">
                    {formatValue(currentMetric.trainingValue, currentMetric.type)}
                  </div>
                  <div className="text-sm text-orange-600">Training</div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg border border-green-200">
                  <div className="text-lg font-bold text-green-800">
                    {formatValue(currentMetric.testValue, currentMetric.type)}
                  </div>
                  <div className="text-sm text-green-600">Test</div>
                </div>
              </div>
              
              {/* Improvement Indicator */}
              <div className={`inline-block px-4 py-2 rounded-full text-base font-medium ${getImprovementColor(currentMetric.improvement, currentMetric.name)}`}>
                {getImprovementText(currentMetric.improvement, currentMetric.name, currentMetric.type)}
              </div>
            </div>
          </div>
          
          {/* Right Side: AI Opinion */}
          <div className="space-y-4">
            {/* AI Opinion Card */}
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <span className="font-semibold text-blue-900">AI Analysis</span>
              </div>
              <p className="text-sm text-blue-800">
                {(() => {
                  const key = `${currentMetric.name}_${currentMetric.trainingValue}_${currentMetric.testValue}`;
                  
                  if (loadingOpinions[key]) {
                    return (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                        Analyzing metric comparison...
                      </div>
                    );
                  }
                  
                  return aiOpinions[key] || "Loading AI analysis for this metric comparison...";
                })()}
              </p>
            </div>
            
            {/* Performance Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h6 className="font-semibold text-gray-900 mb-2">📊 Performance Summary</h6>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Generalization:</span>
                  <span className={`font-medium ${currentMetric.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentMetric.improvement >= 0 ? 'Good' : 'Needs Attention'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Change:</span>
                  <span className="font-medium text-gray-800">
                    {Math.abs(currentMetric.improvement * 100).toFixed(1)}% {currentMetric.improvement >= 0 ? 'better' : 'worse'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevCard}
          disabled={comparisonMetrics.length <= 1}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>
        
        {/* Progress dots */}
        <div className="flex space-x-2">
          {comparisonMetrics.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentCardIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentCardIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={nextCard}
          disabled={comparisonMetrics.length <= 1}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

const ModelTrainingResults: React.FC<ModelTrainingResultsProps> = ({
  results,
  dataPreview,
  selectedTargetColumn
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [predictionInputs, setPredictionInputs] = useState<PredictionInput>({});
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isPredicating, setIsPredicating] = useState(false);

  // Get feature columns (all except target)
  const featureColumns = dataPreview.headers.filter(header => header !== selectedTargetColumn);

  // Download PKL file
  const handleDownloadModel = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`http://localhost:5000/models/${results.model_id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download model');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${results.model_name}_${results.model_id}.pkl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Model downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download model');
    } finally {
      setIsDownloading(false);
    }
  };

  // Get training code and download as file
  const handleGetTrainingCode = async () => {
    setIsLoadingCode(true);
    try {
      const response = await fetch(`http://localhost:5000/models/${results.model_id}/code`);
      if (!response.ok) {
        throw new Error('Failed to get training code');
      }

      const data = await response.json();
      
      // Create and download the file
      const blob = new Blob([data.training_code], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${results.model_name}_${results.model_id}_training_code.py`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Training code downloaded successfully!');
    } catch (error) {
      console.error('Code generation error:', error);
      toast.error('Failed to generate training code');
    } finally {
      setIsLoadingCode(false);
    }
  };

  // Test model on remaining data
  const handleTestModel = async () => {
    setIsTestingModel(true);
    try {
      // Get CSV data for testing (using the same data preview for now)
      const csvData = [
        dataPreview.headers.join(','),
        ...dataPreview.rows.slice(Math.floor(dataPreview.rows.length * 0.8)).map(row => row.join(','))
      ].join('\n');

      const response = await fetch(`http://localhost:5000/models/${results.model_id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv_data: csvData })
      });

      if (!response.ok) {
        throw new Error('Failed to test model');
      }

      const testData = await response.json();
      setTestResults(testData);
      toast.success('Model testing completed!');
    } catch (error) {
      console.error('Testing error:', error);
      toast.error('Failed to test model');
    } finally {
      setIsTestingModel(false);
    }
  };

  // Handle manual prediction
  const handlePredict = async () => {
    setIsPredicating(true);
    try {
      const response = await fetch(`http://localhost:5000/models/${results.model_id}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input_data: predictionInputs })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Prediction failed');
      }

      const predictionData = await response.json();
      setPredictionResult(predictionData);
      toast.success('Prediction completed!');
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error(`Prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPredicating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
          <h3 className="text-xl font-bold text-green-900">🎉 Model Training Completed!</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-green-700 font-medium">Model ID:</span>
            <p className="text-green-800 font-mono text-xs break-all">{results.model_id}</p>
          </div>
          <div>
            <span className="text-sm text-green-700 font-medium">Model Type:</span>
            <p className="text-green-800 capitalize">{results.model_name}</p>
          </div>
          <div>
            <span className="text-sm text-green-700 font-medium">Target Column:</span>
            <p className="text-green-800">{selectedTargetColumn}</p>
          </div>
        </div>

          {/* Modern 5-Section AI Performance Analysis */}
          <div className="mt-4 space-y-6">
            <h5 className="font-medium text-blue-900 mb-6 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              AI Model Performance Analysis
            </h5>
            
            <div className="space-y-8">
              {/* Section 1: Core Metric Highlights */}
              {/* <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h6 className="text-lg font-semibold text-gray-800 mb-4">📊 Core Performance Metrics</h6>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(results.metrics)
                    .filter(([key, value]) => {
                      // Only show core metrics
                      const coreMetrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'r2_score', 'mae', 'mse', 'rmse'];
                      return typeof value === 'number' && coreMetrics.some(metric => key.toLowerCase().includes(metric));
                    })
                    .slice(0, 6) // Limit to 6 core metrics
                    .map(([key, value], index) => {
                      const metricValue = typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value);
                      const metricName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      
                      // Performance assessment
                      let verdict = 'Good';
                      let colorClass = 'blue';
                      
                      if (key.toLowerCase().includes('accuracy') || key.toLowerCase().includes('precision') || key.toLowerCase().includes('recall') || key.toLowerCase().includes('f1')) {
                        if ((value as number) >= 0.9) { verdict = 'Excellent'; colorClass = 'green'; }
                        else if ((value as number) >= 0.8) { verdict = 'Very Good'; colorClass = 'blue'; }
                        else if ((value as number) >= 0.7) { verdict = 'Good'; colorClass = 'yellow'; }
                        else { verdict = 'Needs Work'; colorClass = 'red'; }
                      }
                      
                      return (
                        <div key={index} className={`flex items-center space-x-3 px-4 py-3 bg-${colorClass}-50 border border-${colorClass}-200 rounded-full`}>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">{metricValue}</div>
                            <div className="text-xs text-gray-600">{metricName}</div>
                          </div>
                          <div className={`px-2 py-1 bg-${colorClass}-100 text-${colorClass}-700 text-xs rounded-full font-medium`}>
                            {verdict}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div> */}

              {/* Section 2: AI Model Performance Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h6 className="text-lg font-semibold text-blue-900 mb-4">🤖 AI Performance Summary</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: Model Quality Assessment */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">Q1</span>
                      </div>
                      <h6 className="font-semibold text-blue-900">Model Quality</h6>
                    </div>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {(() => {
                        const avgPerformance = Object.entries(results.metrics)
                          .filter(([key, value]) => typeof value === 'number' && key.toLowerCase().includes('accuracy'))
                          .reduce((sum, [, value]) => sum + (value as number), 0) / 
                          Object.entries(results.metrics).filter(([key, value]) => typeof value === 'number' && key.toLowerCase().includes('accuracy')).length;
                        
                        if (avgPerformance >= 0.9) return "This model demonstrates exceptional performance with accuracy exceeding 90%. It consistently makes reliable predictions.";
                        if (avgPerformance >= 0.8) return "This model shows strong performance with good accuracy. It's reliable for most business applications.";
                        if (avgPerformance >= 0.7) return "This model has acceptable performance but may benefit from additional tuning for optimal results.";
                        return "This model needs improvement before deployment. Consider more training data or feature engineering.";
                      })()}
                    </p>
                  </div>

                  {/* Card 2: Business Readiness */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">Q2</span>
                      </div>
                      <h6 className="font-semibold text-green-900">Business Impact</h6>
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed">
                      {(() => {
                        const avgPerformance = Object.entries(results.metrics)
                          .filter(([key, value]) => typeof value === 'number' && !key.toLowerCase().includes('error'))
                          .reduce((sum, [, value]) => sum + (value as number), 0) / 
                          Object.entries(results.metrics).filter(([key, value]) => typeof value === 'number' && !key.toLowerCase().includes('error')).length;
                        
                        if (avgPerformance >= 0.85) return "Ready for immediate business deployment. This model can significantly improve decision-making processes and operational efficiency.";
                        if (avgPerformance >= 0.75) return "Suitable for business use with monitoring. Can provide valuable insights while performance is tracked.";
                        return "Requires validation before business deployment. Additional testing recommended to ensure reliability.";
                      })()}
                    </p>
                  </div>

                  {/* Card 3: Risk Assessment */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">Q3</span>
                      </div>
                      <h6 className="font-semibold text-purple-900">Risk Level</h6>
                    </div>
                    <p className="text-sm text-purple-800 leading-relaxed">
                      {(() => {
                        const precision = Object.entries(results.metrics).find(([key]) => key.toLowerCase().includes('precision'))?.[1] as number || 0;
                        const recall = Object.entries(results.metrics).find(([key]) => key.toLowerCase().includes('recall'))?.[1] as number || 0;
                        
                        if (precision >= 0.85 && recall >= 0.85) return "Low risk deployment. Model shows balanced performance with minimal false positives and negatives.";
                        if (precision >= 0.75 || recall >= 0.75) return "Moderate risk. Monitor false predictions carefully and implement fallback procedures.";
                        return "Higher risk deployment. Consider additional validation and human oversight for critical decisions.";
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Removed Interactive Insight Cards - moved below */}
            </div>
          </div>
        </div>

      {/* Top Section: Download & Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Download & Code */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2 text-purple-600" />
            Model Files & Code
          </h4>
          
          <div className="space-y-3">
            {/* Download PKL */}
            <button
              onClick={handleDownloadModel}
              disabled={isDownloading}
              className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PKL File
                </>
              )}
            </button>

            {/* Download Training Code */}
            <button
              onClick={handleGetTrainingCode}
              disabled={isLoadingCode}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoadingCode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Training Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Test Model */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <TestTube2 className="w-5 h-5 mr-2 text-green-600" />
            Model Testing
          </h4>

          <button
            onClick={handleTestModel}
            disabled={isTestingModel}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:text-gray-200 transition-colors mb-4 font-medium"
          >
            {isTestingModel ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Model...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test on Remaining Data
              </>
            )}
          </button>

          {/* Test Results are now hidden here but available for sections below */}
        </div>
      </div>

      {/* Training vs Test Results Comparison */}
      {testResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            📊 Training vs Test Results Comparison
          </h4>

          {/* Educational Note */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h6 className="font-semibold text-blue-900 mb-2">📚 Understanding Training vs Test Metrics</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                <div>
                  <span className="font-medium text-orange-800">Training Metrics:</span>
                  <p className="text-orange-700">Performance on the 80% data used to train the model</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                <div>
                  <span className="font-medium text-green-800">Test Metrics:</span>
                  <p className="text-green-700">Performance on fresh 20% data the model never saw</p>
                </div>
              </div>
            </div>
          </div>

          {/* Training Results Section */}
          <div className="mb-8">
            <h5 className="text-xl font-bold text-orange-800 mb-4 flex items-center">
              <span className="w-4 h-4 bg-orange-500 rounded-full mr-3"></span>
              🎓 Training Results (Model Learning Phase)
            </h5>
            
            {/* Training Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-800">
                  {(results.metrics.training_samples as number) || 'N/A'}
                </div>
                <div className="text-sm text-orange-600">Training Samples</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-800">
                  {(results.metrics.feature_count as number) || 'N/A'}
                </div>
                <div className="text-sm text-orange-600">Features Used</div>
              </div>
              {results.metrics.accuracy && (
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-800">
                    {((results.metrics.accuracy as number) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-orange-600">Training Accuracy</div>
                </div>
              )}
              {results.metrics.r2_score !== undefined && (
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-800">
                    {(results.metrics.r2_score as number).toFixed(3)}
                  </div>
                  <div className="text-sm text-orange-600">Training R² Score</div>
                </div>
              )}
              {results.metrics.oob_score && (
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-800">
                    {((results.metrics.oob_score as number) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-orange-600">OOB Score</div>
                </div>
              )}
            </div>

            {/* Training Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Core Training Metrics */}
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
                <h6 className="font-semibold text-orange-900 mb-3 flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  Training Performance
                </h6>
                <div className="space-y-2">
                  {/* Classification Metrics */}
                  {results.metrics.accuracy && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">Accuracy:</span>
                      <span className="font-bold text-orange-900">{((results.metrics.accuracy as number) * 100).toFixed(2)}%</span>
                    </div>
                  )}
                  {results.metrics.precision && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">Precision:</span>
                      <span className="font-bold text-orange-900">{((results.metrics.precision as number) * 100).toFixed(2)}%</span>
                    </div>
                  )}
                  {results.metrics.recall && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">Recall:</span>
                      <span className="font-bold text-orange-900">{((results.metrics.recall as number) * 100).toFixed(2)}%</span>
                    </div>
                  )}
                  {results.metrics.f1_score && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">F1-Score:</span>
                      <span className="font-bold text-orange-900">{((results.metrics.f1_score as number) * 100).toFixed(2)}%</span>
                    </div>
                  )}
                  
                  {/* Regression Metrics */}
                  {results.metrics.r2_score !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">R² Score:</span>
                      <span className="font-bold text-orange-900">{(results.metrics.r2_score as number).toFixed(4)}</span>
                    </div>
                  )}
                  {results.metrics.mean_squared_error !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">MSE:</span>
                      <span className="font-bold text-orange-900">{(results.metrics.mean_squared_error as number).toFixed(4)}</span>
                    </div>
                  )}
                  {results.metrics.root_mean_squared_error !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">RMSE:</span>
                      <span className="font-bold text-orange-900">{(results.metrics.root_mean_squared_error as number).toFixed(4)}</span>
                    </div>
                  )}
                  {results.metrics.mean_absolute_error !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">MAE:</span>
                      <span className="font-bold text-orange-900">{(results.metrics.mean_absolute_error as number).toFixed(4)}</span>
                    </div>
                  )}
                  {results.metrics.mean_absolute_percentage_error !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700 text-sm">MAPE:</span>
                      <span className="font-bold text-orange-900">{(results.metrics.mean_absolute_percentage_error as number).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Model Configuration */}
              {results.metrics.hyperparameters && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                  <h6 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    Model Configuration
                  </h6>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 text-sm">Algorithm:</span>
                      <span className="font-bold text-blue-900 capitalize">{results.model_name}</span>
                    </div>
                    {(results.metrics.hyperparameters as Record<string, unknown>)?.n_estimators && (
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 text-sm">Trees:</span>
                        <span className="font-bold text-blue-900">{(results.metrics.hyperparameters as Record<string, unknown>).n_estimators as number}</span>
                      </div>
                    )}
                    {(results.metrics.hyperparameters as Record<string, unknown>)?.max_depth !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 text-sm">Max Depth:</span>
                        <span className="font-bold text-blue-900">{((results.metrics.hyperparameters as Record<string, unknown>).max_depth as number) || 'None'}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 text-sm">Task Type:</span>
                      <span className="font-bold text-blue-900 capitalize">{results.metrics.task_type as string}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Importance */}
              {results.metrics.feature_importance && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
                  <h6 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    Feature Importance
                  </h6>
                  <div className="space-y-2">
                    {Object.entries(results.metrics.feature_importance)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 4)
                      .map(([feature, importance]) => (
                        <div key={feature} className="flex justify-between items-center">
                          <span className="text-purple-700 text-sm">{feature}:</span>
                          <span className="font-bold text-purple-900">{((importance as number) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Training Classification Report */}
            {results.metrics.class_report && typeof results.metrics.class_report === 'object' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                <h6 className="font-semibold text-orange-900 mb-4">📋 Training Classification Report</h6>
                <div className="grid gap-3">
                  {Object.entries(results.metrics.class_report).map(([key, value]) => {
                    if (typeof value === 'object' && value !== null && 'precision' in value) {
                      const metrics = value as { precision: number; recall: number; 'f1-score': number; support?: number };
                      return (
                        <div key={key} className="p-3 bg-white rounded-lg border border-orange-200">
                          <p className="font-semibold text-orange-900 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                            Training Class: {key}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-orange-50 rounded border">
                              <div className="text-lg font-bold text-orange-800">{(metrics.precision * 100).toFixed(1)}%</div>
                              <div className="text-xs text-orange-600">Precision</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 rounded border">
                              <div className="text-lg font-bold text-yellow-800">{(metrics.recall * 100).toFixed(1)}%</div>
                              <div className="text-xs text-yellow-600">Recall</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 rounded border">
                              <div className="text-lg font-bold text-red-800">{(metrics['f1-score'] * 100).toFixed(1)}%</div>
                              <div className="text-xs text-red-600">F1-Score</div>
                            </div>
                            {metrics.support && (
                              <div className="text-center p-2 bg-gray-50 rounded border">
                                <div className="text-lg font-bold text-gray-800">{metrics.support}</div>
                                <div className="text-xs text-gray-600">Support</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Training Confusion Matrix */}
            {results.metrics.confusion_matrix && Array.isArray(results.metrics.confusion_matrix) && (
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg mb-6">
                <h6 className="font-semibold text-orange-900 mb-4">🔥 Training Confusion Matrix</h6>
                <div className="flex justify-center">
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${results.metrics.confusion_matrix[0]?.length || 2}, minmax(0, 1fr))` }}>
                    {results.metrics.confusion_matrix.map((row: number[], i: number) => 
                      row.map((val: number, j: number) => (
                        <div key={`${i}-${j}`} className={`w-16 h-16 flex items-center justify-center rounded-lg text-sm font-bold ${
                          i === j 
                            ? 'bg-orange-200 text-orange-800 border-2 border-orange-400' 
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {val}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-sm text-orange-700">Training Data Predictions</p>
                </div>
              </div>
            )}
          </div>

          {/* Test Results Section */}
          <div className="mb-6">
            <h5 className="text-xl font-bold text-green-800 mb-4 flex items-center">
              <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
              🧪 Test Results (Real-World Performance)
            </h5>
            
            {/* Test Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-800">{testResults.test_size}</div>
                <div className="text-sm text-green-600">Test Samples</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-800">{testResults.features_used?.length || 0}</div>
                <div className="text-sm text-green-600">Features Used</div>
              </div>
              {testResults.accuracy && (
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">{(testResults.accuracy * 100).toFixed(1)}%</div>
                  <div className="text-sm text-green-600">Test Accuracy</div>
                </div>
              )}
              {testResults.r2_score !== undefined && (
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">{testResults.r2_score.toFixed(3)}</div>
                  <div className="text-sm text-green-600">R² Score</div>
                </div>
              )}
            </div>

            {/* Test Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Test Classification Metrics */}
              {testResults.accuracy && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
                  <h6 className="font-semibold text-green-900 mb-3 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Test Performance
                  </h6>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 text-sm">Test Accuracy:</span>
                      <span className="font-bold text-green-900">{(testResults.accuracy * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Test Regression Metrics */}
              {(testResults.r2_score !== undefined || testResults.mse !== undefined) && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg">
                  <h6 className="font-semibold text-emerald-900 mb-3 flex items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
                    Test Regression Metrics
                  </h6>
                  <div className="space-y-2">
                    {testResults.r2_score !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-700 text-sm">R² Score:</span>
                        <span className="font-bold text-emerald-900">{testResults.r2_score.toFixed(4)}</span>
                      </div>
                    )}
                    {testResults.mse !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-700 text-sm">MSE:</span>
                        <span className="font-bold text-emerald-900">{testResults.mse.toFixed(4)}</span>
                      </div>
                    )}
                    {testResults.rmse !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-700 text-sm">RMSE:</span>
                        <span className="font-bold text-emerald-900">{testResults.rmse.toFixed(4)}</span>
                      </div>
                    )}
                    {testResults.mae !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-700 text-sm">MAE:</span>
                        <span className="font-bold text-emerald-900">{testResults.mae.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Comparison */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg">
                <h6 className="font-semibold text-indigo-900 mb-3 flex items-center">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
                  Performance Comparison
                </h6>
                <div className="space-y-2">
                  {results.metrics.accuracy && testResults.accuracy && (
                    <div className="flex justify-between items-center">
                      <span className="text-indigo-700 text-sm">Improvement:</span>
                      <span className={`font-bold ${testResults.accuracy > (results.metrics.accuracy as number) ? 'text-green-900' : 'text-red-900'}`}>
                        {testResults.accuracy > (results.metrics.accuracy as number) ? '+' : ''}{((testResults.accuracy - (results.metrics.accuracy as number)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-700 text-sm">Generalization:</span>
                    <span className="font-bold text-indigo-900">
                      {testResults.accuracy && results.metrics.accuracy && testResults.accuracy >= (results.metrics.accuracy as number) ? 'Good' : 'Fair'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Classification Report */}
            {testResults.classification_report && typeof testResults.classification_report === 'object' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <h6 className="font-semibold text-green-900 mb-4">📋 Test Classification Report</h6>
                <div className="grid gap-3">
                  {Object.entries(testResults.classification_report).map(([key, value]) => {
                    if (typeof value === 'object' && value !== null && 'precision' in value) {
                      const metrics = value as { precision: number; recall: number; 'f1-score': number; support?: number };
                      return (
                        <div key={key} className="p-3 bg-white rounded-lg border border-green-200">
                          <p className="font-semibold text-green-900 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Test Class: {key}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-blue-50 rounded border">
                              <div className="text-lg font-bold text-blue-800">{(metrics.precision * 100).toFixed(1)}%</div>
                              <div className="text-xs text-blue-600">Precision</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded border">
                              <div className="text-lg font-bold text-green-800">{(metrics.recall * 100).toFixed(1)}%</div>
                              <div className="text-xs text-green-600">Recall</div>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded border">
                              <div className="text-lg font-bold text-purple-800">{(metrics['f1-score'] * 100).toFixed(1)}%</div>
                              <div className="text-xs text-purple-600">F1-Score</div>
                            </div>
                            {metrics.support && (
                              <div className="text-center p-2 bg-gray-50 rounded border">
                                <div className="text-lg font-bold text-gray-800">{metrics.support}</div>
                                <div className="text-xs text-gray-600">Support</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Test Confusion Matrix */}
            {testResults.confusion_matrix && Array.isArray(testResults.confusion_matrix) && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <h6 className="font-semibold text-green-900 mb-4">🔥 Test Confusion Matrix</h6>
                <div className="flex justify-center">
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${testResults.confusion_matrix[0]?.length || 2}, minmax(0, 1fr))` }}>
                    {testResults.confusion_matrix.map((row, i) => 
                      row.map((val, j) => (
                        <div key={`${i}-${j}`} className={`w-16 h-16 flex items-center justify-center rounded-lg text-sm font-bold ${
                          i === j 
                            ? 'bg-green-200 text-green-800 border-2 border-green-400' 
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {val}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-sm text-green-700">
                    <span className="inline-block w-3 h-3 bg-green-200 border border-green-400 rounded mr-2"></span>
                    Correct Test Predictions
                    <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded mr-2 ml-4"></span>
                    Incorrect Test Predictions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Insights - Training vs Test Comparison */}
      {testResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            🤖 AI Insights - Training vs Test Comparison
          </h4>
          
          <TrainingVsTestInsightCards 
            trainingMetrics={results.metrics} 
            testMetrics={testResults}
            modelType={results.model_name}
            taskType={results.task_type || 'classification'}
          />
        </div>
      )}

      {/* Manual Prediction Interface */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-orange-600" />
          Test Individual Predictions
        </h4>
        
        <p className="text-sm text-gray-600 mb-4">
          Enter values for each feature to get a prediction from your trained model:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {featureColumns.map((feature) => (
            <div key={feature}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {feature}
              </label>
              <input
                type="text"
                value={predictionInputs[feature] || ''}
                onChange={(e) => setPredictionInputs({
                  ...predictionInputs,
                  [feature]: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black"
                placeholder="Enter value..."
              />
            </div>
          ))}
        </div>

        <button
          onClick={handlePredict}
          disabled={isPredicating || Object.keys(predictionInputs).length !== featureColumns.length}
          className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isPredicating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Predict {selectedTargetColumn}
            </>
          )}
        </button>

        {predictionResult && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h5 className="font-medium text-orange-900 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Prediction Result
            </h5>
            <div className="text-sm space-y-2">
              <p className="text-lg">
                <span className="font-medium text-black">Predicted {selectedTargetColumn}:</span>{' '}
                <span className="font-bold text-orange-800 bg-orange-100 px-3 py-1 rounded-lg text-xl">
                  {predictionResult.prediction}
                </span>
              </p>
              
              {predictionResult.probabilities && (
                <div>
                  <span className="font-medium text-orange-800">Class Probabilities:</span>
                  <div className="mt-2 space-y-1">
                    {Object.entries(predictionResult.probabilities).map(([cls, prob]) => (
                      <div key={cls} className="flex items-center justify-between bg-white px-3 py-2 rounded-md border">
                        <span className="text-orange-700 font-medium">Class {cls}:</span>
                        <span className="font-bold text-orange-800">{(Number(prob) * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelTrainingResults;
