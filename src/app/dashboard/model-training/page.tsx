'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import {
  Settings,
  Database,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  CheckCircle,
  BarChart3,
  Loader2,
  PlayCircle,
  Brain,
  Target,
  Star
} from 'lucide-react';

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
}

interface DataPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  sampleSize: number;
}

export default function ModelTraining() {
  const { data: session } = useSession();
  
  // State management
  const [datasets, setDatasets] = useState<TransformedDataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<TransformedDataset | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTrainingStarted, setIsTrainingStarted] = useState(false);

  // Fetch datasets from Feature Importance processed datasets
  const fetchDatasets = React.useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/transformed-datasets', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }

      const data = await response.json();
      
      // Filter datasets that have feature importance processing
      const allDatasets = data.datasets || data || [];
      const featureImportanceDatasets = allDatasets.filter((dataset: TransformedDataset) => 
        dataset.processingSteps.includes('feature_importance_analysis')
      );
      
      setDatasets(featureImportanceDatasets);
      setError('');
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError('Failed to load datasets. Please try again.');
      setDatasets([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  // Load dataset preview
  const loadDataPreview = async (dataset: TransformedDataset) => {
    setIsLoadingPreview(true);
    try {
      const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error('Failed to load dataset');
      }
      
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rows = results.data.map((row: Record<string, string>) => 
            headers.map(header => row[header] || '')
          );
          
          setDataPreview({
            headers,
            rows,
            totalRows: rows.length,
            sampleSize: Math.min(rows.length, 100)
          });
          setShowPreview(true);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast.error('Failed to parse dataset');
        }
      });
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Failed to load dataset preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDatasets();
  };

  const handleStartModelTraining = () => {
    setIsTrainingStarted(true);
    toast.success('Model training will be implemented in the next phase!');
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

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to access model training.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Settings className="w-8 h-8 mr-3" />
                Model Training
              </h1>
              <p className="text-purple-100 mt-2">
                Train machine learning models on your processed datasets
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {datasets.length === 0 ? (
          <div className="text-center py-12">
            {isLoading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">Loading processed datasets...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Datasets</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md mx-auto">
                <Brain className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-blue-800 mb-2">No Processed Datasets Found</h3>
                <p className="text-blue-600 mb-4">
                  You need to process datasets through Feature Importance analysis first to enable model training.
                </p>
                <a
                  href="/dashboard/feature-importance"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Go to Feature Importance
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dataset Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Database className="w-6 h-6 mr-2 text-purple-600" />
                Select Processed Dataset for Model Training
              </h2>
              
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    {selectedDataset ? (
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{selectedDataset.transformedName}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {selectedDataset.metadata?.analysisType && (
                            <span className="mr-3 capitalize">{selectedDataset.metadata.analysisType}</span>
                          )}
                          {selectedDataset.rowCount?.toLocaleString()} rows × {selectedDataset.columnCount} columns
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-500">Choose a processed dataset...</span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {datasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        onClick={() => {
                          setSelectedDataset(dataset);
                          setShowDropdown(false);
                          setShowPreview(false);
                          setIsTrainingStarted(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-medium text-gray-800 truncate">{dataset.transformedName}</p>
                            <p className="text-sm text-gray-500 truncate">From: {dataset.originalName}</p>
                            <div className="flex items-center mt-1 space-x-3">
                              {dataset.metadata?.analysisType && (
                                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full capitalize">
                                  {dataset.metadata.analysisType}
                                </span>
                              )}
                              {dataset.metadata?.targetColumn && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                                  Target: {dataset.metadata.targetColumn}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            <div>{formatFileSize(dataset.fileSize)}</div>
                            <div>{formatDate(dataset.uploadedAt)}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedDataset && !showPreview && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => loadDataPreview(selectedDataset)}
                    disabled={isLoadingPreview}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoadingPreview ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading Preview...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Preview Dataset
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Dataset Preview */}
            {showPreview && dataPreview && selectedDataset && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {/* Dataset Header with better layout */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                      Dataset Preview
                    </h3>
                    <button
                      onClick={() => setShowAllRows(!showAllRows)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        showAllRows 
                          ? 'bg-purple-600 text-white hover:bg-purple-700' 
                          : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      {showAllRows ? 'Show Preview (5 rows)' : 'Show All Rows'}
                    </button>
                  </div>
                  
                  {/* Dataset Name */}
                  <div className="mb-2">
                    <h4 className="text-xl font-bold text-gray-900 truncate">
                      {selectedDataset.transformedName}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                      Original dataset: {selectedDataset.originalName}
                    </p>
                  </div>
                  
                  {/* Dataset Stats - Separate rows */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Dimensions:</span>
                      <span className="text-sm font-semibold text-purple-600">
                        {dataPreview.totalRows.toLocaleString()} rows × {dataPreview.headers.length} columns
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">File Size:</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {formatFileSize(selectedDataset.fileSize)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Uploaded:</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatDate(selectedDataset.uploadedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dataset Metadata */}
                {selectedDataset.metadata && (
                  <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Dataset Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedDataset.metadata.analysisType && (
                        <div>
                          <span className="text-sm text-purple-600 font-medium">Analysis Type:</span>
                          <p className="text-purple-800 capitalize">{selectedDataset.metadata.analysisType}</p>
                        </div>
                      )}
                      {selectedDataset.metadata.targetColumn && (
                        <div>
                          <span className="text-sm text-purple-600 font-medium">Target Column:</span>
                          <p className="text-purple-800">{selectedDataset.metadata.targetColumn}</p>
                        </div>
                      )}
                      {selectedDataset.metadata.selectedFeatures && (
                        <div>
                          <span className="text-sm text-purple-600 font-medium">Selected Features:</span>
                          <p className="text-purple-800">{selectedDataset.metadata.selectedFeatures.length} features</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Search and filters for all rows view */}
                {showAllRows && (
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search in data..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Preview Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className={`overflow-auto border-2 border-gray-100 custom-scrollbar ${
                      showAllRows ? 'max-h-96' : 'max-h-80'
                    }`}
                    style={{ 
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#CBD5E0 #F7FAFC'
                    }}
                  >
                    <table className="min-w-full divide-y divide-gray-200 relative">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 sticky left-0 z-20">
                            #
                          </th>
                          {dataPreview.headers.map((header, index) => (
                            <th
                              key={index}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 bg-gray-50"
                            >
                              <div className="flex items-center">
                                <span className="whitespace-nowrap">{header}</span>
                                {header === selectedDataset.metadata?.targetColumn && (
                                  <Target className="ml-2 w-3 h-3 text-purple-600" />
                                )}
                                {header.includes('_encoded') && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded-full whitespace-nowrap">
                                    Encoded
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          let rowsToShow = showAllRows ? dataPreview.rows : dataPreview.rows.slice(0, 5);
                          
                          if (searchTerm.trim() && showAllRows) {
                            rowsToShow = rowsToShow.filter(row => 
                              row.some(cell => 
                                cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
                              )
                            );
                          }
                          
                          return rowsToShow.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              <td className="px-3 py-3 text-xs text-gray-500 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 font-medium">
                                {showAllRows && searchTerm.trim() ? 
                                  dataPreview.rows.indexOf(row) + 1 : 
                                  rowIndex + 1
                                }
                              </td>
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                                >
                                  {searchTerm.trim() && showAllRows ? (
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: cell.toString().replace(
                                          new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                          '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                        )
                                      }}
                                    />
                                  ) : (
                                    cell || '-'
                                  )}
                                </td>
                              ))}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Model Training Action */}
                <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <h4 className="text-lg font-semibold text-purple-900 mb-2 flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    Ready for Model Training
                  </h4>
                  <p className="text-purple-700 mb-4">
                    This dataset is processed and ready for machine learning model training. 
                    Start training to build predictive models.
                  </p>
                  
                  <button
                    onClick={handleStartModelTraining}
                    disabled={isTrainingStarted}
                    className={`w-full px-6 py-3 font-medium rounded-lg transition-colors flex items-center justify-center ${
                      isTrainingStarted 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isTrainingStarted ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Training Initiated
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5 mr-2" />
                        🚀 Start Model Training
                      </>
                    )}
                  </button>

                  {isTrainingStarted && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 text-sm">
                        🎯 Model training functionality will be implemented in the next development phase. 
                        This will include algorithm selection, hyperparameter tuning, cross-validation, 
                        and model evaluation metrics.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
