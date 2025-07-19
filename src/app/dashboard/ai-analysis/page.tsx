"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
  rowsPerPage,
  Dataset,
  Message,
  assessDataQuality,
  recommendVisualizations,
  handleAIAnalysis
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
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/datasets');
          if (!response.ok) {
            const errorText = await response.text();
            toast.error(`Failed to fetch datasets: ${errorText}`);
            return;
          }
          const data = await response.json();
          setDatasets(data);
        } catch (err) {
          const error = err as Error;
          toast.error(`Error loading datasets: ${error.message}`);
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

      // Show loading message for metrics
      setMessages([{
        sender: 'bot',
        text: `Dataset "${selected.name}" selected! Fetching metrics from MongoDB... This may take a moment.`
      }]);

      try {
        // Auto-fetch metrics from MongoDB
        console.log('Auto-fetching metrics for dataset:', {
          userId: session?.user?.id,
          datasetId: selected._id,
          datasetName: selected.name
        });

        const response = await fetch(
          `/api/metrics/get?userId=${encodeURIComponent(session?.user?.id || '')}&datasetId=${encodeURIComponent(selected._id)}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch metrics`);
        }

        const data = await response.json();
        
        console.log('Metrics fetch response:', {
          success: data.success,
          hasMetrics: !!data.metrics,
          metricsKeys: data.metrics ? Object.keys(data.metrics) : []
        });
        
        if (data.success && data.metrics) {
          // Store metrics in the dataset object for AI analysis
          selected.mongoMetrics = data.metrics;
          
          console.log('Successfully loaded MongoDB metrics:', {
            datasetName: selected.name,
            metricsCount: Object.keys(data.metrics).length,
            sampleMetrics: Object.keys(data.metrics).slice(0, 3)
          });
          
          // Calculate initial data quality assessment
          const quality = assessDataQuality(selected);
          const visualRecommendations = recommendVisualizations(selected);

          setMessages([{
            sender: 'bot',
            text: `Dataset "${selected.name}" loaded with MongoDB metrics! Here's a comprehensive overview:

📊 Data Quality Assessment:
• Completeness: ${quality.completeness.toFixed(1)}%
• Consistency: ${quality.consistency.toFixed(1)}%
• Accuracy: ${quality.accuracy.toFixed(1)}%
${quality.suggestions.map(s => `• ${s.description} - ${s.recommendation}`).join('\n')}

📈 MongoDB Metrics Available:
• ${Object.keys(data.metrics).length} quality metrics loaded
• Real-time analysis capabilities enabled

🎯 Top Visualization Recommendations:
${visualRecommendations.slice(0, 3).map(r => `• ${r.chartType}: ${r.description}`).join('\n')}

✨ I can help you analyze this data with enhanced insights. Try:
• "@ai analyze trends with metrics"
• "@ai find correlations using quality data"
• "@ai what insights can you share from the metrics?"
• Or ask about specific columns and statistics!`
          }]);
          toast.success(`Metrics loaded for: ${selected.name}`);
        } else {
          throw new Error('No metrics found for this dataset. Please generate metrics first.');
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dataset metrics';
        
        // Fallback to basic analysis without metrics
        const quality = assessDataQuality(selected);
        const visualRecommendations = recommendVisualizations(selected);

        setMessages([{
          sender: 'bot',
          text: `Dataset "${selected.name}" selected, but couldn't load MongoDB metrics.

⚠️ Metrics Status: ${errorMessage}

📊 Basic Data Quality Assessment:
• Completeness: ${quality.completeness.toFixed(1)}%
• Consistency: ${quality.consistency.toFixed(1)}%
• Accuracy: ${quality.accuracy.toFixed(1)}%

🎯 Visualization Recommendations:
${visualRecommendations.slice(0, 3).map(r => `• ${r.chartType}: ${r.description}`).join('\n')}

💡 Note: Generate metrics for this dataset first to unlock enhanced AI analysis capabilities.

I can still help with basic analysis:
• "@ai analyze trends"
• "@ai find correlations"
• Or ask about specific columns!`
        }]);
        toast.error(`Basic analysis mode for: ${selected.name}`);
      }
    } else {
      setCurrentDataset(null);
      setMessages([]);
      setCurrentPage(0);
    }
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || !currentDataset) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const textToSend = input;
    setInput('');
    setIsTyping(true);

    try {
      // Check if it's an AI query
      if (textToSend.trim().startsWith('@ai ')) {
        const aiPrompt = textToSend.trim().slice(4);
        const aiResponse = await handleAIAnalysis(aiPrompt, currentDataset);
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: aiResponse || 'Sorry, I could not process your request.',
          isAIEnhanced: true
        }]);
        setIsTyping(false);
        return;
      }
      
      const aiPrompt = textToSend.startsWith('@ai ') ? textToSend.slice(4) : textToSend;
      const aiResponse = await handleAIAnalysis(aiPrompt, currentDataset);
      
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: aiResponse,
        isAIEnhanced: textToSend.startsWith('@ai ')
      }]);
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
          Select Dataset
        </label>
        <select
          id="dataset-select"
          className="w-full border border-gray-300 p-3 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={currentDataset?._id || ''}
          onChange={handleDatasetChange}
        >
          <option value="">-- Choose your dataset --</option>
          {datasets.map((dataset) => (
            <option key={dataset._id} value={dataset._id}>
              {dataset.name} ({dataset._id.slice(0, 6)})
            </option>
          ))}
        </select>
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
              )}              <form onSubmit={handleSend} className="flex gap-3">
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