'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import {
  Zap,
  Database,
  Download,
  Calendar,
  FileText,
  Trash2,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Play
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
}

export default function DataTransformation() {
  const { data: session } = useSession();
  const [datasets, setDatasets] = useState<TransformedDataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<TransformedDataset | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchDatasets = React.useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/transformed-datasets');
      
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      
      const data = await response.json();
      setDatasets(data.datasets || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch datasets');
      toast.error('Failed to load datasets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleDelete = async (datasetId: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      const response = await fetch(`/api/transformed-datasets?id=${datasetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }

      setDatasets(datasets.filter(d => d.id !== datasetId));
      toast.success('Dataset deleted successfully');
    } catch (err) {
      toast.error('Failed to delete dataset');
      console.error('Delete error:', err);
    }
  };

  const handleDownload = async (dataset: TransformedDataset) => {
    try {
      const response = await fetch(dataset.url);
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.transformedName}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download started!');
    } catch (err) {
      toast.error('Failed to download dataset');
      console.error('Download error:', err);
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your transformed datasets...</p>
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
            <h2 className="text-lg font-semibold text-gray-800">Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDatasets}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-3 rounded-lg mr-4">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Data Transformation</h1>
                <p className="text-gray-600 mt-1">Manage and access your preprocessed datasets stored in cloud storage</p>
              </div>
            </div>
            <button
              onClick={fetchDatasets}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Transformed Datasets Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You haven&apos;t uploaded any preprocessed datasets yet. Start by preprocessing a dataset in the Pre-processing section.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span>Go to</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">Pre-processing</span>
              <ArrowRight className="w-4 h-4" />
              <span>Process Dataset</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">Proceed to Data Transformation</span>
            </div>
          </div>
        ) : (
          // Dataset Selection and Preview
          <div className="space-y-6">
            {/* Step 1: Dataset Selection Dropdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <span className="text-indigo-600 font-bold text-sm">1</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Select Dataset for Transformation</h2>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 truncate mr-4">
                    {selectedDataset ? selectedDataset.transformedName : 'Choose a dataset to transform...'}
                  </span>
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
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-medium text-gray-800 truncate">{dataset.transformedName}</p>
                            <p className="text-sm text-gray-500 truncate">From: {dataset.originalName}</p>
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            {formatFileSize(dataset.fileSize)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Dataset Preview (shown when dataset is selected) */}
            {selectedDataset && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <span className="text-green-600 font-bold text-sm">2</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">Dataset Preview</h2>
                  </div>
                  <div className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                    Processed
                  </div>
                </div>

                {/* Horizontal Layout Preview */}
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-6 mb-6">
                  {/* Left Section - Dataset Info */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-lg mb-2 truncate">
                        {selectedDataset.transformedName}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3 truncate">
                        From: {selectedDataset.originalName}
                      </p>
                      
                      {/* Horizontal Stats */}
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium text-blue-600">{formatFileSize(selectedDataset.fileSize)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-gray-600">Dimensions:</span>
                          <span className="font-medium text-purple-600">
                            {selectedDataset.rowCount || 0} × {selectedDataset.columnCount || 0}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-500">
                            {formatDate(selectedDataset.uploadedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center Section - Processing Steps */}
                  <div className="flex-shrink-0 mx-6 max-w-md">
                    {selectedDataset.processingSteps && selectedDataset.processingSteps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                          Processing Steps
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedDataset.processingSteps.slice(0, 4).map((step, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                            >
                              {step.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {selectedDataset.processingSteps.length > 4 && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                              +{selectedDataset.processingSteps.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(selectedDataset)}
                      className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(selectedDataset.id)}
                      className="flex items-center justify-center p-2 bg-red-100 text-red-600 text-sm font-medium rounded-md hover:bg-red-200 transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Step 3: Next Steps */}
                <div className="bg-indigo-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <span className="text-indigo-600 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Ready for Transformation</h3>
                        <p className="text-gray-600 text-sm">Apply advanced transformations to your dataset</p>
                      </div>
                    </div>
                    <button className="flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                      <Play className="w-5 h-5 mr-2" />
                      Start Transformation
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
