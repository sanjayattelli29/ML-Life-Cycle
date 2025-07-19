'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import Groq from "groq-sdk";

// Initialize Groq client with browser support
const groq = new Groq({ 
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY as string,
  dangerouslyAllowBrowser: true // Enable browser usage
});

interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
}

interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// Updated to match the metrics structure from the main page
interface Metrics extends Record<string, number | string | null> {
  [key: string]: number | string | null;
}

export const Chatbot: React.FC = () => {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<Metrics | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select-dataset' | 'fetch-metrics' | 'chat-ready'>('select-dataset');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const chatboxRef = useRef<HTMLDivElement>(null);

  // Function to log chat conversation to n8n webhook
  const logChatToWebhook = async (question: string, answer: string) => {
    try {
      await fetch("https://n8n.editwithsanjay.in/webhook/log-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: question,
          answer: answer
        })
      });
      console.log('Chat logged to n8n successfully');
    } catch (error) {
      console.error('Failed to log chat to n8n:', error);
      // Don't show error to user as this is background logging
    }
  };

  // Reset chat state function
  const resetChatState = () => {
    setSelectedDataset(null);
    setCurrentMetrics(null);
    setMessages([]);
    setCurrentStep('select-dataset');
    setConnectionStatus('idle');
    setInputValue('');
    setDatasets([]);
  };

  // Fetch datasets from MongoDB that belong to the current user
  const fetchUserDatasets = async () => {
    if (!session?.user?.id) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: 'Please sign in to access your datasets.',
        timestamp: new Date()
      }]);
      return;
    }

    try {
      setIsLoadingDatasets(true);
      setConnectionStatus('connecting');
      
      const response = await fetch('/api/datasets');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch datasets`);
      }
      
      const datasets = await response.json();
      
      if (Array.isArray(datasets)) {
        setDatasets(datasets);
        setConnectionStatus('connected');
        
        if (datasets.length > 0) {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            content: `Great! I found ${datasets.length} dataset(s) in your account. Please select one to begin analyzing your data.`,
            timestamp: new Date()
          }]);
          setCurrentStep('select-dataset');
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            content: 'No datasets found in your account. Please upload a dataset first to start analyzing.',
            timestamp: new Date()
          }]);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to load datasets';
      console.error('Error fetching datasets:', error);
      
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: `Sorry, I encountered an error while loading your datasets: ${errorMessage}. Please refresh and try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  // Initialize chatbot and fetch datasets when opened
  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        setMessages([{ 
          type: 'bot', 
          content: 'Hello! I\'m your AI Data Assistant. Let me load your datasets first.',
          timestamp: new Date()
        }]);
        fetchUserDatasets();
      }
    } else {
      // Reset state when chatbot closes
      resetChatState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session?.user?.id, messages.length]);

  const handleDatasetSelect = async (selectedId: string) => {
    const selected = datasets.find(d => d._id === selectedId);
    
    if (!selected) {
      toast.error('Dataset not found');
      return;
    }

    setSelectedDataset(selected);
    setCurrentStep('fetch-metrics');
    
    const selectionMessage: ChatMessage = {
      type: 'bot',
      content: `Perfect! You've selected "${selected.name}". Now I need to fetch the metrics for this dataset. Click the "Fetch Metrics" button below to load the analysis data.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, selectionMessage]);
  };

  const handleFetchMetrics = async () => {
    if (!selectedDataset || !session?.user?.id) {
      toast.error('Please select a dataset and ensure you are signed in');
      return;
    }

    setIsLoadingMetrics(true);
    
    const loadingMessage: ChatMessage = {
      type: 'bot',
      content: `Fetching metrics for "${selectedDataset.name}"... This may take a moment.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, loadingMessage]);

    try {
      console.log('Fetching metrics for dataset:', {
        userId: session.user.id,
        datasetId: selectedDataset._id,
        datasetName: selectedDataset.name
      });

      const response = await fetch(
        `/api/metrics/get?userId=${encodeURIComponent(session.user.id)}&datasetId=${encodeURIComponent(selectedDataset._id)}`
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
        setCurrentMetrics(data.metrics);
        setCurrentStep('chat-ready');
        
        const successMessage: ChatMessage = {
          type: 'bot',
          content: `Excellent! I've successfully loaded the metrics for "${selectedDataset.name}". I can now help you understand:\n\n• Data quality and completeness analysis\n• Statistical insights and distributions\n• Missing values and outlier detection\n• Feature relationships and correlations\n• Data preprocessing recommendations\n\nWhat would you like to explore about your data?`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, successMessage]);
        toast.success('Metrics loaded successfully');
      } else {
        throw new Error('No metrics found for this dataset. Please generate metrics first.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dataset metrics';
      console.error('Error fetching metrics:', error);
      
      const errorChatMessage: ChatMessage = {
        type: 'bot',
        content: `I couldn't find metrics for "${selectedDataset.name}". Please generate metrics for this dataset first using the quality metrics tool, then return to chat with me about the insights.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
      toast.error(errorMessage);
      
      // Reset to dataset selection step
      setCurrentStep('select-dataset');
      setSelectedDataset(null);
      setCurrentMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !currentMetrics || !selectedDataset || !session?.user?.id || currentStep !== 'chat-ready') {
      return;
    }

    const userMessage = inputValue.trim();
    const userChatMessage: ChatMessage = {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userChatMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Format metrics data for better AI understanding
      const metricsInfo = Object.entries(currentMetrics)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      // Create context message with metrics data
      const contextMessage = `Context: Working with dataset "${selectedDataset.name}" (ID: ${selectedDataset._id}).
      
The dataset has the following quality metrics:
${metricsInfo}

Based on these metrics, please answer the following question about the data:
${userMessage}

Please provide insights that are specific to the actual metric values shown above. Focus on data quality, patterns, recommendations for preprocessing, and actionable insights.`;

      // Call Groq API
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert AI data analysis assistant. You help users understand their dataset quality metrics and provide actionable insights. Be specific about the metric values you see, explain what they mean for data quality, and provide concrete recommendations for data preprocessing and analysis. Use the actual metric values in your explanations."
          },
          {
            role: "user",
            content: contextMessage
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1000,
      });

      const botResponse = completion.choices[0]?.message?.content || 
        "I apologize, but I couldn't generate a response. Please try asking your question differently.";

      const botChatMessage: ChatMessage = {
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botChatMessage]);
      
      // Log the conversation to n8n webhook
      logChatToWebhook(userMessage, botResponse);
      
    } catch (error) {
      console.error('Chat request error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      const errorChatMessage: ChatMessage = {
        type: 'bot',
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDatasets = () => {
    setSelectedDataset(null);
    setCurrentMetrics(null);
    setCurrentStep('select-dataset');
    
    const backMessage: ChatMessage = {
      type: 'bot',
      content: 'I\'m ready to help with another dataset. Please select one from the list below.',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, backMessage]);
  };

  // Download chat conversation as text file
  const downloadConversation = () => {
    if (messages.length === 0) {
      toast.error('No conversation to download');
      return;
    }

    let conversationText = `AI Data Assistant - Chat Export\n`;
    conversationText += `Dataset: ${selectedDataset?.name || 'Not Selected'}\n`;
    conversationText += `Export Date: ${new Date().toLocaleString()}\n`;
    conversationText += `${'='.repeat(50)}\n\n`;

    messages.forEach((message) => {
      const timestamp = message.timestamp.toLocaleString();
      const sender = message.type === 'user' ? 'You' : 'AI Assistant';
      conversationText += `[${timestamp}] ${sender}:\n${message.content}\n\n`;
    });

    // Create and download the file
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${selectedDataset?.name || 'conversation'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Chat conversation downloaded');
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatboxRef.current) {
      const scrollElement = chatboxRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  // Format timestamp for display
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <React.Fragment>
      <div className="fixed bottom-4 right-4 z-50">
        {/* Toggle Button */}
<button
  onClick={() => setIsOpen(prev => !prev)}
  className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110 relative overflow-hidden"
  title={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
>
  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
  {isOpen ? (
    <svg className="w-7 h-7 transition-transform group-hover:rotate-90 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-8 h-8 transition-transform group-hover:scale-110 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )}
</button>


        {/* Chatbox - Reduced size */}
        {isOpen && (
            <div className="absolute bottom-16 right-0 w-[420px] h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200/50 flex flex-col overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">AI Data Assistant</h3>
                    {connectionStatus === 'connected' && (
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-100">Connected</span>
                      </div>
                    )}
                    {connectionStatus === 'error' && (
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                        <span className="text-xs text-red-100">Error</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {selectedDataset && messages.length > 1 && (
                    <button
                      onClick={downloadConversation}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors group"
                      title="Download conversation"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}
                  {selectedDataset && (
                    <button
                      onClick={handleBackToDatasets}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors group"
                      title="Back to datasets"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {selectedDataset && (
                <div className="mt-1 relative z-10">
                  <p className="text-xs text-blue-100 truncate flex items-center space-x-1" title={selectedDataset.name}>
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>{selectedDataset.name}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div ref={chatboxRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-gray-50 to-white">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-xl p-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed shadow-sm ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                          : 'bg-white text-gray-800 border border-gray-200/50 rounded-bl-md shadow-md'
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 flex items-center space-x-1 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200/50 rounded-xl rounded-bl-md p-2.5 text-gray-800 shadow-md">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
              {/* Step 1: Dataset Selection */}
              {currentStep === 'select-dataset' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Choose a dataset to analyze:
                  </label>
                  <select
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-800 font-medium"
                    onChange={(e) => e.target.value && handleDatasetSelect(e.target.value)}
                    value=""
                    disabled={isLoadingDatasets}
                  >
                    <option value="" className="text-gray-500">
                      {isLoadingDatasets ? 'Loading your datasets...' : 'Select a dataset'}
                    </option>
                    {datasets.map((dataset) => (
                      <option key={dataset._id} value={dataset._id} className="text-gray-800">
                        {dataset.name}
                      </option>
                    ))}
                  </select>
                  {datasets.length === 0 && !isLoadingDatasets && (
                    <p className="text-xs text-gray-500 mt-2">
                      No datasets found. Please upload a dataset first.
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Fetch Metrics */}
              {currentStep === 'fetch-metrics' && selectedDataset && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-sm font-semibold text-blue-800">Selected Dataset</span>
                    </div>
                    <p className="text-sm text-blue-700 truncate">{selectedDataset.name}</p>
                  </div>
                  
                  <button
                    onClick={handleFetchMetrics}
                    disabled={isLoadingMetrics}
                    className="w-full p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
                  >
                    {isLoadingMetrics ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Fetching Metrics...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Fetch Metrics</span>
                      </>
                    )}
                  </button>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleBackToDatasets}
                      className="flex-1 p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      Back to Datasets
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Chat Ready */}
              {currentStep === 'chat-ready' && selectedDataset && currentMetrics && (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs font-semibold text-green-800">Metrics Loaded</span>
                    </div>
                    <p className="text-xs text-green-700 truncate">{selectedDataset.name}</p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask about your data metrics..."
                      className="flex-1 p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-gray-800 font-medium"
                      disabled={isLoading}
                      maxLength={500}
                    />
                    <button
                      type="button"
                      onClick={downloadConversation}
                      disabled={messages.length <= 1}
                      className="px-3 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center group"
                      title="Download chat"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !inputValue.trim()}
                      className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center group shadow-md"
                      title="Send message"
                    >
                      <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </form>
                  
                  <button
                    onClick={handleBackToDatasets}
                    className="w-full p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium"
                  >
                    Change Dataset
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default Chatbot;