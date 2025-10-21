"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import Papa from "papaparse";
import {
  rowsPerPage,
  Dataset,
  Message,
  getColumnTypes,
  callGroqAPI
} from "./page2";

// Component state and functions
export default function AIAnalysis() {

  const { data: session } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [showColumnSelection, setShowColumnSelection] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [featureImportanceData, setFeatureImportanceData] = useState<Record<string, unknown> | null>(null);
  const [isLoadingFeatureImportance, setIsLoadingFeatureImportance] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [availableModels, setAvailableModels] = useState<Array<{
    model_id: string;
    dataset_name: string;
    model_name: string;
    created_at?: string;
    saved_at?: string;
    has_metadata: boolean;
    size: number;
  }>>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      if (session?.user?.id) {
        setIsLoadingDatasets(true);
        try {
          console.log('Fetching datasets from R2 for AI analysis...');
          const response = await fetch('/api/model-training-datasets');
          if (!response.ok) {
            const errorText = await response.text();
            toast.error(`Failed to fetch datasets: ${errorText}`);
            return;
          }
          const data = await response.json();
          console.log('R2 datasets loaded:', data.datasets?.length || 0);
          
          if (!data.datasets || data.datasets.length === 0) {
            console.log('No datasets found in R2 storage');
            setDatasets([]);
            setIsLoadingDatasets(false);
            return;
          }
          
          // Convert R2 dataset format to expected Dataset interface
          const convertedDatasets = await Promise.all((data.datasets || []).map(async (r2Dataset: {
            transformedName: string;
            url: string;
            id: string;
          }) => {
            try {
              // Fetch CSV data to get columns and data
              const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(r2Dataset.url)}`;
              const csvResponse = await fetch(proxyUrl);
              
              if (!csvResponse.ok) {
                console.warn('Failed to load CSV for dataset:', r2Dataset.transformedName);
                return null;
              }
              
              const csvText = await csvResponse.text();
              
              // Parse CSV using Papa Parse
              const parseResult = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve) => {
                Papa.parse(csvText, {
                  header: true,
                  skipEmptyLines: true,
                  complete: resolve,
                  error: (error) => {
                    console.error('CSV parsing error:', error);
                    resolve({ 
                      data: [], 
                      errors: [error], 
                      meta: { 
                        fields: [],
                        delimiter: ',',
                        linebreak: '\n',
                        aborted: false,
                        truncated: false,
                        cursor: 0
                      } 
                    });
                  }
                });
              });
              
              if (parseResult.errors.length > 0 || !parseResult.data || parseResult.data.length === 0) {
                console.warn('Failed to parse CSV for dataset:', r2Dataset.transformedName);
                return null;
              }
              
              const headers = parseResult.meta.fields || [];
              const dataRows = parseResult.data.map((row: Record<string, string>) => {
                const processedRow: Record<string, string | number> = {};
                headers.forEach(header => {
                  const value = row[header] || '';
                  // Try to convert to number if possible
                  const numValue = Number(value);
                  processedRow[header] = !isNaN(numValue) && value !== '' ? numValue : value;
                });
                return processedRow;
              });
              
              // Determine column types
              const columns = headers.map(header => {
                const sampleValues = dataRows.slice(0, 10).map(row => row[header]);
                const numericCount = sampleValues.filter(val => typeof val === 'number' && !isNaN(val as number)).length;
                const isNumeric = numericCount > sampleValues.length * 0.7; // 70% numeric threshold
                
                return {
                  name: header,
                  type: isNumeric ? 'numeric' as const : 'text' as const
                };
              });
              
              return {
                _id: r2Dataset.id,
                name: r2Dataset.transformedName,
                columns,
                data: dataRows.slice(0, 1000) // Limit to first 1000 rows for performance
              };
            } catch (error) {
              console.error('Error processing dataset:', r2Dataset.transformedName, error);
              return null;
            }
          }));
          
          // Filter out null datasets and set the state
          const validDatasets = convertedDatasets.filter(Boolean) as Dataset[];
          console.log('Converted datasets:', validDatasets.length);
          setDatasets(validDatasets);
          
          if (validDatasets.length === 0) {
            console.log('No compatible datasets found');
          }
          
        } catch (err) {
          const error = err as Error;
          console.error('Error fetching R2 datasets:', error);
          toast.error(`Error loading datasets: ${error.message}`);
        } finally {
          setIsLoadingDatasets(false);
        }
      }
    };
    fetchDatasets();
  }, [session?.user?.id]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleDatasetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      setCurrentPage(0);
      setFeatureImportanceData(null); // Reset feature importance data

      setMessages([{
        sender: 'bot',
        text: `Dataset "${selected.name}" selected! 

📊 Dataset Information:
• Rows: ${selected.data.length}
• Columns: ${selected.columns.length}
• Available columns: ${selected.columns.map(c => c.name).join(', ')}

🤖 Ready for AI Analysis:
• Use Analytics Operations below for quick column analysis
• Click "Fetch Metrics for AI Insights" to load advanced AI capabilities
• Ask questions with @ai or directly chat about your data

Try asking:
• "What patterns do you see in this data?"
• "Show me correlations between columns"
• "What insights can you provide?"
• "@ai analyze trends and patterns"`
      }]);
      
      toast.success(`Dataset selected: ${selected.name}`);
    } else {
      setCurrentDataset(null);
      setMessages([]);
      setCurrentPage(0);
      setFeatureImportanceData(null);
    }
  };

  // Function to fetch available models from R2 and show dropdown
  const fetchAvailableModels = async () => {
    if (!currentDataset) {
      toast.error('No dataset selected');
      return;
    }

    setIsLoadingModels(true);
    try {
      console.log('🔍 Fetching AI analysis files from R2 cloud storage...');
      const datasetName = currentDataset.name;
      
      // Use clean dataset ID for consistent folder structure
      const cleanDatasetId = datasetName.split('_')[0] || datasetName;
      console.log('🗂️ Using clean dataset ID for search:', cleanDatasetId);
      
      const modelsResponse = await fetch(`/api/ai-analysis/list-files?datasetId=${encodeURIComponent(cleanDatasetId)}&datasetName=${encodeURIComponent(datasetName)}`);
      
      if (!modelsResponse.ok) {
        const errorData = await modelsResponse.json();
        console.error('❌ AI analysis files API error:', errorData);
        throw new Error(errorData.error || `Failed to fetch AI analysis files (HTTP ${modelsResponse.status})`);
      }
      
      const modelsData = await modelsResponse.json();
      console.log('📊 AI analysis files response:', modelsData);
      
      if (!modelsData.files || modelsData.files.length === 0) {
        throw new Error(`No AI analysis files found for dataset "${datasetName}". Please go to Model Training page and click "Save for AI Analysis" button after training a model.`);
      }
      
      // All files should have metadata since they're specifically saved for AI analysis
      const filesWithMetadata = modelsData.files.map((file: {
        model_id: string;
        dataset_id: string;
        dataset_name: string;
        model_name: string;
        saved_at: string;
        file_path: string;
        size: number;
        is_fallback?: boolean;
      }) => ({
        ...file,
        has_metadata: true,
        size: file.size || 0
      }));

      setAvailableModels(filesWithMetadata);
      setShowModelSelection(true);
      setSelectedModelId(''); // Reset selection
      
      // Add message to chat about available models
      const userMessage: Message = { sender: 'user', text: 'Browse AI Analysis Files from R2 Cloud' };
      setMessages(prev => [...prev, userMessage]);
      
      const fallbackInfo = modelsData.fallback_mode ? '\n\n⚠️ Note: Using fallback mode - backend service not available. These are sample files for demonstration.' : '';
      
      const botMessage: Message = { 
        sender: 'bot', 
        text: `🔍 Found ${filesWithMetadata.length} AI analysis files in R2 cloud storage!${fallbackInfo}

📊 Available AI Analysis Files:
${filesWithMetadata.map((file: { model_id: string; model_name: string; saved_at: string; is_fallback?: boolean }) => 
  `• ${file.model_name || file.model_id} (${new Date(file.saved_at || '').toLocaleDateString()})${file.is_fallback ? ' [Sample]' : ''}`
).join('\n')}

These files contain model metadata specifically saved for AI analysis. Select one to enhance your data insights!`,
        isAIEnhanced: true
      };
      setMessages(prev => [...prev, botMessage]);
      
      const successMessage = modelsData.fallback_mode 
        ? `Found ${filesWithMetadata.length} AI analysis files (demo mode - use "Save for AI Analysis" on Model Training page)`
        : `Found ${filesWithMetadata.length} AI analysis files ready for download!`;
      
      toast.success(successMessage);
      
    } catch (error) {
      console.error('Error fetching AI analysis files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch AI analysis files';
      
      const userMessage: Message = { sender: 'user', text: 'Browse AI Analysis Files from R2 Cloud' };
      setMessages(prev => [...prev, userMessage]);
      
      const botMessage: Message = { 
        sender: 'bot', 
        text: `❌ Unable to fetch AI analysis files from R2 cloud storage.

${errorMessage}

🔧 How to Create AI Analysis Files:
1. Go to the Model Training page
2. Train a model with your dataset
3. After training completes, click the "Save for AI Analysis" button in the Model Files & Code section
4. Return here and try again

AI analysis files are lightweight JSON metadata files that enhance the chat experience with trained model insights.`
      };
      setMessages(prev => [...prev, botMessage]);
      
      toast.error('Failed to fetch AI analysis files from R2 storage');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Function to download selected model's metadata
  const downloadSelectedModelMetadata = async () => {
    if (!selectedModelId || !currentDataset) {
      toast.error('Please select a model first');
      return;
    }

    setIsLoadingFeatureImportance(true);
    try {
      console.log('📥 Downloading AI analysis file for selected model:', selectedModelId);
      
      // Use clean dataset ID for consistent folder structure  
      const datasetName = currentDataset.name;
      const cleanDatasetId = datasetName.split('_')[0] || datasetName;
      console.log('🗂️ Using clean dataset ID for download:', cleanDatasetId);
      
      const downloadResponse = await fetch(`/api/ai-analysis/download-file?modelId=${selectedModelId}&datasetId=${encodeURIComponent(cleanDatasetId)}`);
      
      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        console.error('❌ Download error:', errorData);
        throw new Error(errorData.error || `Failed to download AI analysis file from R2 (HTTP ${downloadResponse.status})`);
      }
      
      const downloadResult = await downloadResponse.json();
      console.log('✅ Successfully downloaded AI analysis file:', downloadResult);
      
      // Store the metadata temporarily for AI analysis
      setFeatureImportanceData(downloadResult.metadata);
      
      // Hide model selection and reset
      setShowModelSelection(false);
      setSelectedModelId('');
      
      // Find the selected model details for display
      const selectedModel = availableModels.find(m => m.model_id === selectedModelId);
      
      // Add success message to chat
      const userMessage: Message = { sender: 'user', text: `Download AI Analysis File: ${selectedModel?.model_name || selectedModelId}` };
      setMessages(prev => [...prev, userMessage]);
      
      const downloadMethod = downloadResult.fallback_mode ? 'Sample Data (Demo)' : 'R2 Cloud Storage';
      const downloadSource = downloadResult.downloaded_from === 'fallback_ai_analysis' ? 'Sample AI Analysis Data' : 'R2 AI Analysis Storage';
      
      const botMessage: Message = { 
        sender: 'bot', 
        text: `🎯 AI analysis file downloaded successfully!

📊 Model Information:
• Model ID: ${selectedModelId}
• Model Type: ${downloadResult.metadata?.model_name || 'Unknown'}
• Task Type: ${downloadResult.metadata?.task_type || 'Unknown'}
• Features: ${downloadResult.metadata?.features?.length || 0}
• Target: ${downloadResult.metadata?.target || 'Unknown'}
• Performance: ${downloadResult.metadata?.metrics?.performance_summary?.overall_performance || 'Unknown'}

☁️ Download Details:
• Source: ${downloadSource}
• Method: ${downloadMethod}
• Path: ${downloadResult.download_path || 'Unknown'}
• Status: Ready for AI chat analysis

🧠 Enhanced AI Insights Now Available:
• Advanced feature importance analysis from trained model
• Model performance metrics and insights
• Enhanced data understanding with ML context
• Real-time access to training metadata

${downloadResult.fallback_mode ? '📝 Note: This is sample data for demonstration. Use "Save for AI Analysis" on Model Training page to create real files.' : ''}

Ask me anything about your data and I'll use these trained model insights!

Try asking:
• "@ai which features are most important?"
• "@ai explain the model performance" 
• "@ai what patterns does the model reveal?"
• "@ai how do features correlate with the target?"`,
        isAIEnhanced: true
      };
      setMessages(prev => [...prev, botMessage]);
      
      const successMessage = downloadResult.fallback_mode 
        ? 'Sample AI analysis data loaded for demonstration!'
        : 'AI analysis file downloaded and ready for enhanced insights!';
      
      toast.success(successMessage);
      
    } catch (error) {
      console.error('Error downloading AI analysis file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download AI analysis file';
      
      const userMessage: Message = { sender: 'user', text: `Download AI Analysis File: ${selectedModelId}` };
      setMessages(prev => [...prev, userMessage]);
      
      const botMessage: Message = { 
        sender: 'bot', 
        text: `❌ Unable to download AI analysis file for selected model.

${errorMessage}

🔧 How to Fix This:
1. Go to Model Training page and train a model with this dataset
2. Click the "Save for AI Analysis" button after training completes
3. Return here and try again
4. Ensure you're using the same dataset name

AI analysis files are created when you explicitly save them from the Model Training page.`
      };
      setMessages(prev => [...prev, botMessage]);
      
      toast.error('Failed to download AI analysis file');
    } finally {
      setIsLoadingFeatureImportance(false);
    }
  };

  // Fetch feature importance JSON via backend API (no direct R2 calls)
  const fetchFeatureImportanceForAI = async () => {
    // Step 1: Show available models first
    await fetchAvailableModels();
  };

  const handleAnalyticsOperation = async (columnName: string) => {
    if (!selectedOperation || !currentDataset) return;
  
    const userMessage: Message = { sender: 'user', text: `Analyze ${columnName} using ${selectedOperation}` };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
  
    try {
      const operation = ANALYTICS_BUTTONS.find(b => b.id === selectedOperation);
      if (operation) {
        let response = '';
        const column = currentDataset.columns.find(c => c.name === columnName);
        if (!column) {
          response = `Column "${columnName}" not found in the dataset.`;
        } else {
          // Perform the analysis based on the operation
          switch (operation.id) {
            case 'average':
              if (column.type === 'numeric') {
                const values = currentDataset.data.map(row => Number(row[columnName])).filter(n => !isNaN(n));
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                response = `The average of ${columnName} is ${avg.toFixed(2)}.`;
              } else {
                response = `Cannot calculate average for non-numeric column "${columnName}".`;
              }
              break;

            case 'null_count':
              const nullCount = currentDataset.data.filter(row => row[columnName] === null || row[columnName] === undefined || row[columnName] === '').length;
              response = `Found ${nullCount} null or empty values in column "${columnName}".`;
              break;

            case 'unique_values':
              const uniqueValues = [...new Set(currentDataset.data.map(row => row[columnName]))];
              response = `Found ${uniqueValues.length} unique values in column "${columnName}".\nUnique values: ${uniqueValues.slice(0, 10).join(', ')}${uniqueValues.length > 10 ? '...' : ''}`;
              break;

            // Add more cases for other operations...

            default:
              response = `Analysis operation "${operation.label}" is not implemented yet.`;
          }
        }
        
        const botMessage: Message = { sender: 'bot', text: response, isAIEnhanced: true };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        sender: 'bot',
        text: 'Sorry, there was an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setSelectedOperation(null);
      setShowColumnSelection(false);
    }
  };

  // Function to log chat to n8n webhook
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || !currentDataset) {
      return;
    }

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const textToSend = input;
    setInput('');
    setIsTyping(true);

    try {
      // Check if it's an AI query
      if (textToSend.trim().startsWith('@ai ')) {
        const aiPrompt = textToSend.trim().slice(4);
        const aiResponse = await handleAIAnalysisWithFeatures(aiPrompt, currentDataset, featureImportanceData);
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: aiResponse || 'Sorry, I could not process your request.',
          isAIEnhanced: true
        }]);
        setIsTyping(false);
        return;
      }
      
      const aiPrompt = textToSend.startsWith('@ai ') ? textToSend.slice(4) : textToSend;
      const aiResponse = await handleAIAnalysisWithFeatures(aiPrompt, currentDataset, featureImportanceData);
      
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: aiResponse,
        isAIEnhanced: textToSend.startsWith('@ai ')
      }]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        sender: 'bot',
        text: 'Sorry!, there was an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setSelectedOperation(null);
      setShowColumnSelection(false);
    }
  };

  // Enhanced AI analysis function that uses feature importance data
  const handleAIAnalysisWithFeatures = async (query: string, dataset: Dataset, featureData: Record<string, unknown> | null) => {
    const columnTypes = getColumnTypes(dataset.data);
    
    // Build context with available data
    let enhancedContext = `Dataset: ${dataset.name} (${dataset.data.length} rows, ${dataset.columns.length} cols)
Columns: ${dataset.columns.map(c => `${c.name}(${c.type})`).join(', ')}

Basic Data Statistics:
${columnTypes.numeric.slice(0, 3).map(col => {
  const values = dataset.data.map(row => Number(row[col])).filter(n => !isNaN(n));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `${col}: avg=${avg.toFixed(2)}, range=[${min}-${max}]`;
}).join('\n')}`;

    // Add feature importance insights if available
    if (featureData) {
      const metadata = featureData as {
        model_name?: string;
        task_type?: string;
        features?: string[];
        target?: string;
        metrics?: {
          feature_importance?: Record<string, number>;
          r2_score?: number;
          accuracy?: number;
          performance_summary?: { overall_performance?: string };
        };
      };

      if (metadata.metrics?.feature_importance) {
        const topFeatures = Object.entries(metadata.metrics.feature_importance)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([feature, importance]) => `${feature}: ${(importance * 100).toFixed(1)}%`)
          .join('\n');

        enhancedContext += `

🎯 AI Model Insights Available:
Model: ${metadata.model_name || 'Unknown'} (${metadata.task_type || 'Unknown'})
Target Variable: ${metadata.target || 'Unknown'}
Model Performance: ${metadata.metrics?.performance_summary?.overall_performance || 'Unknown'}

Top Feature Importance:
${topFeatures}

Performance Metrics:
${metadata.metrics.accuracy ? `Accuracy: ${(metadata.metrics.accuracy * 100).toFixed(1)}%` : ''}
${metadata.metrics.r2_score ? `R² Score: ${metadata.metrics.r2_score.toFixed(3)}` : ''}`;
      }
    } else {
      enhancedContext += `

💡 Note: No trained model data available. For enhanced AI insights, click "Fetch Metrics for AI Insights" after training a model.`;
    }

    const prompt = `${enhancedContext}

User Query: ${query}

Provide detailed analysis with specific insights, actionable recommendations, and data-driven observations:`;

    const aiResponse = await callGroqAPI(prompt);
    let result = aiResponse || 'AI analysis unavailable. Please try asking a more specific question about your data.';
    
    // Clean up the output
    result = result.replace(/\*/g, '');

    // Log to n8n webhook
    try {
      await fetch("https://n8n.editwithsanjay.in/webhook/log-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: query, 
          answer: result 
        })
      });
      console.log('AI Analysis chat logged to n8n successfully');
    } catch (error) {
      console.error('Failed to log chat to n8n:', error);
    }
    
    return result;
  };

  const getPaginatedData = () => {
    if (!currentDataset) return [];
    const startIndex = currentPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return currentDataset.data.slice(startIndex, endIndex);
  };

  const totalPages = currentDataset ? Math.ceil(currentDataset.data.length / rowsPerPage) : 0;

  const handleNextPage = () => {
    if (currentPage + 1 < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">AI Dataset Chat</h1>

      {/* Add AI feature hint */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-700">
        💡 Pro tip: Start your message with @ai to get detailed AI-powered Insights
      </div>
      
      {/* Dataset Selection */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-200">
        <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-900 mb-2">
          Select Dataset from R2 Storage
        </label>
        
        {isLoadingDatasets ? (
          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading datasets from R2 storage...</span>
            </div>
          </div>
        ) : (
          <>
            <select
              id="dataset-select"
              className="w-full border border-gray-300 p-3 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={currentDataset?._id || ''}
              onChange={handleDatasetChange}
              disabled={datasets.length === 0}
            >
              <option value="">
                {datasets.length === 0 
                  ? "-- No datasets available. Please prepare datasets in Model Training first --" 
                  : "-- Choose your dataset --"
                }
              </option>
              {datasets.map((dataset) => (
                <option key={dataset._id} value={dataset._id}>
                  {dataset.name} ({dataset.data.length} rows, {dataset.columns.length} columns)
                </option>
              ))}
            </select>
            
            {datasets.length === 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">⚠️</span>
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">No datasets found in R2 storage</p>
                    <p className="mt-1">Please go to the Model Training page and upload/prepare datasets first.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {currentDataset && (
        <div className="space-y-6">
          {/* Chat Section - Large */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-gray-900 font-semibold text-xl mb-4">
              Chatting about: <span className="text-blue-700">{currentDataset.name}</span>
              <span className="text-sm text-gray-600 ml-2">
                ({currentDataset.data.length} rows, {Object.keys(currentDataset.data[0] || {}).length} columns)
              </span>
            </div>

            <div
              ref={chatRef}
              className="overflow-y-auto p-6 bg-gray-50 rounded-lg space-y-4 mb-6 border border-gray-200"
              style={{ height: '600px' }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] p-4 rounded-xl text-sm whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-blue-700 text-white self-end ml-auto'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  }`}
                >
                  {m.isAIEnhanced && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-blue-500">
                      <span className="bg-blue-100 px-2 py-1 rounded">AI Enhanced</span>
                    </div>
                  )}
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div className="max-w-[85%] p-4 rounded-xl text-sm bg-white text-gray-900 border border-gray-200 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Analytics Buttons */}
              <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-full flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Analytics Operations</span>
                  {selectedOperation && (
                    <button
                      onClick={() => {
                        setSelectedOperation(null);
                        setShowColumnSelection(false);
                        setInput('');
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear Selection ×
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ANALYTICS_BUTTONS.map((button) => (
                    <button
                      key={button.id}
                      onClick={() => {
                        setSelectedOperation(button.id);
                        setShowColumnSelection(true);
                        setInput(`Analyze using ${button.label.toLowerCase()}`);
                      }}
                      onMouseEnter={() => setHoveredButton(button.id)}
                      onMouseLeave={() => setHoveredButton(null)}
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${selectedOperation === button.id 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:shadow-sm'}`}
                    >
                      <span>{button.icon}</span>
                      {button.label}
                      {hoveredButton === button.id && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                          {button.description}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Selection */}
              {showColumnSelection && currentDataset && (
                <div className="flex flex-col gap-3 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-blue-700">
                      Select a column to analyze using {ANALYTICS_BUTTONS.find(b => b.id === selectedOperation)?.label}:
                    </div>
                    <button
                      onClick={() => setShowColumnSelection(false)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Cancel ×
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {currentDataset.columns.map((column) => (
                      <button
                        key={column.name}
                        onClick={() => {
                          setShowColumnSelection(false);
                          handleAnalyticsOperation(column.name);
                        }}
                        className="flex flex-col items-start p-3 rounded-lg text-sm bg-white hover:bg-blue-50 border border-blue-200 transition-colors group"
                      >
                        <span className="font-medium text-blue-600 group-hover:text-blue-700">{column.name}</span>
                        <span className="text-xs text-blue-400 group-hover:text-blue-500 mt-1">Type: {column.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fetch Feature Importance Button */}
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h6 className="text-sm font-semibold text-purple-700 mb-1">🧠 AI Insights Enhancement</h6>
                    <p className="text-xs text-purple-600">Browse and download trained model metadata for advanced AI analysis</p>
                  </div>
                  <button
                    onClick={fetchFeatureImportanceForAI}
                    disabled={isLoadingModels || isLoadingFeatureImportance}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoadingModels ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading Models...
                      </>
                    ) : (
                      <>
                        <span>�</span>
                        Browse Available Models
                      </>
                    )}
                  </button>
                </div>
                {featureImportanceData && (
                  <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✅ Model metadata downloaded! Enhanced AI analysis available.
                  </div>
                )}
              </div>

              {/* Model Selection Dropdown */}
              {showModelSelection && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h6 className="text-sm font-semibold text-blue-700 mb-1">☁️ Select AI Analysis File from R2 Cloud Storage</h6>
                        <p className="text-xs text-blue-600">Choose which model&apos;s AI analysis file to download for enhanced insights</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowModelSelection(false);
                          setSelectedModelId('');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Cancel 
                      </button>
                    </div>
                    
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label htmlFor="model-select" className="block text-xs font-medium text-blue-700 mb-1">
                          Available AI Analysis Files ({availableModels.length} found)
                        </label>
                        <select
                          id="model-select"
                          value={selectedModelId}
                          onChange={(e) => setSelectedModelId(e.target.value)}
                          className="w-full border border-blue-300 p-2 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- Select an AI analysis file to download --</option>
                          {availableModels.map((model) => (
                            <option key={model.model_id} value={model.model_id}>
                              {model.model_name || model.model_id} - {new Date(model.saved_at || model.created_at || '').toLocaleDateString()} ({(model.size / 1024).toFixed(1)}KB)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        onClick={downloadSelectedModelMetadata}
                        disabled={!selectedModelId || isLoadingFeatureImportance}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoadingFeatureImportance ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <span>📥</span>
                            Download Metadata
                          </>
                        )}
                      </button>
                    </div>
                    
                    {selectedModelId && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-xs text-blue-700">
                          <strong>Selected:</strong> {availableModels.find(m => m.model_id === selectedModelId)?.model_name || selectedModelId}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Ask about the dataset... or select an operation above"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || !currentDataset}
                    className="text-white px-8 py-3 rounded-lg hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    style={{ backgroundColor: '#1d4ed8' }}
                  >
                    Send
                  </button>
                </form>
            </div>
          </div>

          {/* Dataset Preview Table */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div className="text-gray-900 font-semibold text-xl">
                Dataset Preview
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Showing {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, currentDataset.data.length)} of {currentDataset.data.length} rows
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    title="Previous Page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage + 1 >= totalPages}
                    className="px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    title="Next Page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(currentDataset.data[0] || {}).map((column) => (
                      <th
                        key={column}
                        className="px-6 py-4 text-left text-xs font-medium text-gray-900 uppercase tracking-wider border-b border-gray-200"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedData().map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      {Object.keys(currentDataset.data[0] || {}).map((column) => (
                        <td
                          key={column}
                          className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                        >
                          {row[column]}
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
  );
}

// New interfaces and constants for interactive analysis buttons
interface AnalyticsButton {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

const ANALYTICS_BUTTONS: AnalyticsButton[] = [
  { id: 'average', label: 'Average', description: 'Calculate mean value', icon: '📊' },
  { id: 'correlation', label: 'Correlation', description: 'Find relationships', icon: '🔄' },
  { id: 'min', label: 'Minimum', description: 'Find smallest value', icon: '⬇️' },
  { id: 'max', label: 'Maximum', description: 'Find largest value', icon: '⬆️' },
  { id: 'null_count', label: 'Null Count', description: 'Count missing values', icon: '❓' },
  { id: 'unique_values', label: 'Unique Values', description: 'List distinct values', icon: '🔍' },
  { id: 'data_types', label: 'Data Types', description: 'Show column types', icon: '📋' },
  { id: 'histogram', label: 'Histogram', description: 'View distribution', icon: '📈' },
  { id: 'outliers', label: 'Outliers', description: 'Find unusual values', icon: '⚠️' },
  { id: 'summary_stats', label: 'Summary Stats', description: 'Statistical overview', icon: '📑' },
  { id: 'distribution_compare', label: 'Compare Distribution', description: 'Compare value distributions', icon: '📊' },
  { id: 'top_n_values', label: 'Top Values', description: 'Show most frequent values', icon: '🏆' },
  { id: 'time_trend', label: 'Time Trend', description: 'Plot trends over time', icon: '📅📊' },
  { id: 'grouped_stats', label: 'Group Stats', description: 'Aggregate by category', icon: '🗂️📊' },
  { id: 'zscore', label: 'Z-Score', description: 'Standardize values', icon: '📏' },
  { id: 'column_entropy', label: 'Entropy Score', description: 'Information density', icon: '🔀' },
  { id: 'coefficient_variation', label: 'Coefficient of Var', description: 'Compare variability', icon: '📉' },
  { id: 'duplicates_summary', label: 'Duplicate Rows', description: 'Show duplicate rows', icon: '📋' },
  { id: 'missing_pattern', label: 'Missing Pattern', description: 'Missing value heatmap', icon: '🧩' },
  { id: 'percentile_split', label: 'Percentiles', description: 'Split into percentiles', icon: '📐' },
];

// Add any additional utility functions or types here if needed