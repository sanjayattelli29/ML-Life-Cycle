'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { PreprocessingContext } from './context/PreprocessingContext';
import {
  FaRegQuestionCircle,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaCopy,
  FaLink,
  FaRandom,
  FaChartLine,
  FaArrowsAltH,
  FaRulerHorizontal,
  FaBalanceScale
} from 'react-icons/fa';

interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, string | number>[];
}

interface PreprocessingOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactElement;
  color: string;
  iconColor: string;
  path: string;
}

const preprocessingOptions: PreprocessingOption[] = [
  {
    id: 'missing-values',
    title: 'Missing Values',
    description: 'Detect and handle null, undefined, or empty values in your dataset',
    icon: <FaRegQuestionCircle className="h-5 w-5" />,
    color: 'border-blue-100 hover:border-blue-200',
    iconColor: 'bg-blue-50 text-blue-600',
    path: 'missing-values'
  },
  {
    id: 'outliers',
    title: 'Outliers',
    description: 'Identify and handle statistical outliers in numerical columns',
    icon: <FaExclamationTriangle className="h-5 w-5" />,
    color: 'border-orange-100 hover:border-orange-200',
    iconColor: 'bg-orange-50 text-orange-600',
    path: 'outliers'
  },
  {
    id: 'data-type-mismatch',
    title: 'Data Type Mismatch',
    description: 'Fix inconsistent data types across columns',
    icon: <FaExchangeAlt className="h-5 w-5" />,
    color: 'border-purple-100 hover:border-purple-200',
    iconColor: 'bg-purple-50 text-purple-600',
    path: 'data-type-mismatch'
  },
  {
    id: 'duplicate-records',
    title: 'Duplicate Records',
    description: 'Find and remove duplicate entries from your dataset',
    icon: <FaCopy className="h-5 w-5" />,
    color: 'border-red-100 hover:border-red-200',
    iconColor: 'bg-red-50 text-red-600',
    path: 'duplicate-records'
  },
  {
    id: 'feature-correlation',
    title: 'Feature Correlation',
    description: 'Analyze and handle highly correlated features',
    icon: <FaLink className="h-5 w-5" />,
    color: 'border-green-100 hover:border-green-200',
    iconColor: 'bg-green-50 text-green-600',
    path: 'feature-correlation'
  },
  {
    id: 'inconsistencies',
    title: 'Inconsistencies',
    description: 'Detect and fix inconsistent values and formats',
    icon: <FaRandom className="h-5 w-5" />,
    color: 'border-yellow-100 hover:border-yellow-200',
    iconColor: 'bg-yellow-50 text-yellow-600',
    path: 'inconsistencies'
  },
  {
    id: 'low-variance',
    title: 'Low Variance',
    description: 'Identify and handle features with low variability',
    icon: <FaChartLine className="h-5 w-5" />,
    color: 'border-teal-100 hover:border-teal-200',
    iconColor: 'bg-teal-50 text-teal-600',
    path: 'low-variance'
  },
  {
    id: 'mean-median-drift',
    title: 'Mean-Median Drift',
    description: 'Check for significant differences between mean and median',
    icon: <FaArrowsAltH className="h-5 w-5" />,
    color: 'border-indigo-100 hover:border-indigo-200',
    iconColor: 'bg-indigo-50 text-indigo-600',
    path: 'mean-median-drift'
  },
  {
    id: 'range-violations',
    title: 'Range Violations',
    description: 'Detect values outside of expected ranges',
    icon: <FaRulerHorizontal className="h-5 w-5" />,
    color: 'border-pink-100 hover:border-pink-200',
    iconColor: 'bg-pink-50 text-pink-600',
    path: 'range-violations'
  },
  {
    id: 'target-imbalance',
    title: 'Target Imbalance',
    description: 'Identify and handle imbalanced target variables',
    icon: <FaBalanceScale className="h-5 w-5" />,
    color: 'border-cyan-100 hover:border-cyan-200',
    iconColor: 'bg-cyan-50 text-cyan-600',
    path: 'target-imbalance'
  }
];

export default function PreProcessing() {
  const { data: session } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<Dataset | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch datasets when component mounts
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
          console.error('Error fetching datasets:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch datasets');
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchDatasets();
  }, [session?.user?.id]);

  const handleDatasetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    
    if (selected) {
      setCurrentDataset(selected);
      setError('');
      setProcessedData(null);
      setSelectedOptions([]);
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

  const handlePreprocess = async () => {
    if (!currentDataset || selectedOptions.length === 0) return;

    setIsProcessing(true);
    let currentData = { ...currentDataset };

    for (const optionId of selectedOptions) {
      const option = preprocessingOptions.find(opt => opt.id === optionId);
      if (option) {
        setProcessingStatus(`Processing ${option.title.toLowerCase()}...`);
        try {
          const response = await fetch(`/api/preprocessing/${option.path}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset: currentData }),
          });

          if (!response.ok) {
            throw new Error(`Failed to process ${option.title.toLowerCase()}`);
          }

          const result = await response.json();
          currentData = result.dataset;
          toast.success(`${option.title} processed successfully!`);
        } catch (error) {
          toast.error(`Error processing ${option.title.toLowerCase()}`);
          console.error(`Error processing ${option.title}:`, error);
        }
      }
    }

    setProcessedData(currentData);
    setProcessingStatus('All preprocessing steps completed successfully!');
    setIsProcessing(false);
  };

  const downloadProcessedData = () => {
    if (!processedData) return;

    const headers = processedData.columns.map(col => col.name).join(',');
    const rows = processedData.data.map(row => 
      processedData.columns.map(col => row[col.name]).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_${currentDataset?.name || 'dataset'}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    // Show success message
    toast.success('Download started! Page will refresh in 2 seconds...');
    
    // Set a timeout to reload the page after 5 seconds
    setTimeout(() => {
      window.location.reload();
    }, 2500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  const contextValue = {
    dataset: currentDataset,
    setProcessedData,
    setProcessingStatus,
    setIsProcessing
  };


















  return (
    <PreprocessingContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-8">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              Data Pre-processing
            </h1>
          </div>
          
          {/* Dataset Selection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 11h8m-4 4h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Select Dataset</h2>
            </div>
            <select
              className="w-full p-3 border border-gray-300 rounded-md text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              onChange={handleDatasetChange}
              value={currentDataset?._id || ''}
            >
              <option value="" className="text-gray-500">Select a dataset</option>
              {datasets.map((dataset) => (
                <option key={dataset._id} value={dataset._id} className="text-gray-700">
                  {dataset.name}
                </option>
              ))}
            </select>
          </div>          {/* Dataset Preview and Preprocessing Options */}
          {currentDataset && (
            <>
              <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Preprocessing Options</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {preprocessingOptions.map((option) => (
                    <div 
                      key={option.id} 
                      className={`relative border rounded-lg p-5 transition-all duration-200 cursor-pointer 
                        ${option.color} hover:shadow-lg hover:scale-[1.02] transform`}
                      onClick={() => handleOptionToggle(option.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id={option.id}
                          checked={selectedOptions.includes(option.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleOptionToggle(option.id);
                          }}
                          className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`p-2.5 rounded-lg ${option.iconColor} flex items-center justify-center`}>
                              {option.icon}
                            </div>
                            <label 
                              htmlFor={option.id} 
                              className="text-lg font-medium text-gray-800 truncate block cursor-pointer"
                            >
                              {option.title}
                            </label>
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col space-y-4">
                  {processingStatus && (
                    <div className="bg-blue-50 text-blue-700 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {processingStatus}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      {processedData && (
                        <button
                          onClick={downloadProcessedData}
                          className="px-6 py-2.5 rounded-lg text-blue-600 font-medium border border-blue-600 hover:bg-blue-50 flex items-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Processed Data
                        </button>
                      )}
                      <button
                        onClick={handlePreprocess}
                        disabled={selectedOptions.length === 0 || isProcessing}
                        className={`px-6 py-2.5 rounded-lg text-white font-medium transition-colors flex items-center
                          ${selectedOptions.length === 0 || isProcessing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'}
                        `}
                      >
                        {isProcessing ? (
                          <span className="flex items-center space-x-2">
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Processing...</span>
                          </span>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Preprocess Dataset
                          </>
                        )}
                      </button>
                    </div>
                  </div>                </div>
              </div>

              {/* Dataset Preview Section */}
              <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mt-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Dataset Preview</h2>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Total Rows: {currentDataset.data.length}
                  </div>
                </div>
                
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {currentDataset.columns.map((column) => (
                          <th
                            key={column.name}
                            className="px-6 py-3.5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                          >
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2" />
                              </svg>
                              {column.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentDataset.data.slice(currentPage * 10, (currentPage * 10) + 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          {currentDataset.columns.map((column) => (
                            <td
                              key={column.name}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-100 last:border-r-0"
                            >
                              <div 
                                className="max-w-xs truncate" 
                                title={row[column.name]?.toString() || 'N/A'}
                              >
                                {row[column.name]?.toString() || 'N/A'}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-6 px-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Showing {(currentPage * 10) + 1} to {Math.min((currentPage * 10) + 10, currentDataset.data.length)} of {currentDataset.data.length} entries
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.ceil(currentDataset.data.length / 10) }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === i
                              ? 'bg-blue-600 text-white shadow-md'
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
                      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PreprocessingContext.Provider>
  );
}
