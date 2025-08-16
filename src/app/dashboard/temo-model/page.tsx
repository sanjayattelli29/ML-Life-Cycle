'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import ModelTrainingConfig from '@/components/ModelTrainingConfig';
import {
  Database,
  ArrowRight,
  BarChart3,
  Loader2,
  PlayCircle,
  Brain,
  Target,
  Upload,
  FileText,
  X,
  CheckCircle
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
  isTemporary?: boolean;
}

interface DataPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  sampleSize: number;
}

export default function TemporaryModelTraining() {
  const { data: session } = useSession();
  
  // State management
  const [uploadedDataset, setUploadedDataset] = useState<TransformedDataset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [selectedTargetColumn, setSelectedTargetColumn] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session?.user?.id || '');

      const response = await fetch('/api/datasets/temporary', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Create dataset object from upload result
      const tempDataset: TransformedDataset = {
        id: result.id,
        originalName: file.name,
        transformedName: file.name,
        url: result.url,
        fileSize: file.size,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        processingSteps: ['Raw Upload'],
        uploadedAt: new Date().toISOString(),
        isTemporary: true,
        metadata: {
          analysisType: 'classification'
        }
      };

      setUploadedDataset(tempDataset);
      setUploadProgress(100);
      toast.success('Dataset uploaded successfully!');
      
      // Auto-preview the dataset
      setTimeout(() => loadDataPreview(tempDataset), 500);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Load dataset preview
  const loadDataPreview = async (dataset: TransformedDataset) => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch(dataset.url);
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

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileUpload(file);
    }
  };

  const handleShowModelConfig = () => {
    if (!uploadedDataset) {
      toast.error('Please upload a dataset first');
      return;
    }

    if (!dataPreview) {
      toast.error('Please preview the dataset first');
      return;
    }

    if (!selectedTargetColumn) {
      toast.error('Please select a target column for training');
      return;
    }

    setShowModelConfig(true);
  };

  const handleBackFromConfig = () => {
    setShowModelConfig(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      {/* Show Model Configuration Interface */}
      {showModelConfig && uploadedDataset && dataPreview ? (
        <ModelTrainingConfig
          dataset={uploadedDataset}
          dataPreview={dataPreview}
          selectedTarget={selectedTargetColumn}
          onBack={handleBackFromConfig}
        />
      ) : (
        <>
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-8">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold flex items-center">
                    <Upload className="w-8 h-8 mr-3" />
                    Quick Model Training
                  </h1>
                  <p className="text-green-100 mt-2">
                    Upload a dataset and train models immediately without preprocessing
                  </p>
                </div>
                <a
                  href="/dashboard/model-training"
                  className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Back to Processed Datasets
                </a>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-6">
            {!uploadedDataset ? (
              /* Upload Section */
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-green-600" />
                    Upload Your Dataset
                  </h2>
                  
                  {/* Drag and Drop Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      dragActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <Upload className="w-16 h-16 text-gray-400" />
                      </div>
                      
                      <div>
                        <p className="text-xl font-medium text-gray-900">
                          {dragActive ? 'Drop your file here' : 'Drag and drop your dataset'}
                        </p>
                        <p className="text-gray-500 mt-2">
                          or <span className="text-green-600 font-medium">click to browse</span>
                        </p>
                      </div>
                      
                      <div className="flex justify-center space-x-6 text-sm text-gray-500">
                        <span className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                          CSV Files
                        </span>
                        <span className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                          Excel Files
                        </span>
                        <span className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                          Up to 50MB
                        </span>
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                          <p className="text-green-700 font-medium">Uploading dataset...</p>
                          <div className="mt-2 bg-gray-200 rounded-full h-2 w-64 mx-auto">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{uploadProgress}%</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">Quick Training Instructions:</h3>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div className="flex items-start">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                        <span>Upload your CSV or Excel dataset (raw data, no preprocessing required)</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                        <span>Preview your data and select the target column you want to predict</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                        <span>Configure model parameters and start training immediately</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Dataset Preview and Training */
              <div className="space-y-6">
                {/* Dataset Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                      <Database className="w-6 h-6 mr-2 text-green-600" />
                      Uploaded Dataset
                    </h2>
                    <button
                      onClick={() => {
                        setUploadedDataset(null);
                        setShowPreview(false);
                        setDataPreview(null);
                        setSelectedTargetColumn('');
                      }}
                      className="flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </button>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-green-900">{uploadedDataset.originalName}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-green-700">
                          <span>Size: {formatFileSize(uploadedDataset.fileSize)}</span>
                          {uploadedDataset.rowCount && (
                            <span>Rows: {uploadedDataset.rowCount.toLocaleString()}</span>
                          )}
                          {uploadedDataset.columnCount && (
                            <span>Columns: {uploadedDataset.columnCount}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Temporary Dataset
                      </div>
                    </div>
                  </div>

                  {!showPreview && (
                    <div className="mt-4">
                      <button
                        onClick={() => loadDataPreview(uploadedDataset)}
                        disabled={isLoadingPreview}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
                {showPreview && dataPreview && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    {/* Dataset Header */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                          Dataset Preview
                        </h3>
                        <button
                          onClick={() => setShowAllRows(!showAllRows)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                            showAllRows 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
                          }`}
                        >
                          {showAllRows ? 'Show Preview (5 rows)' : 'Show All Rows'}
                        </button>
                      </div>
                      
                      {/* Dataset Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Dimensions:</span>
                          <span className="text-sm font-semibold text-green-600">
                            {dataPreview.totalRows.toLocaleString()} rows × {dataPreview.headers.length} columns
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">File Size:</span>
                          <span className="text-sm font-semibold text-blue-600">
                            {formatFileSize(uploadedDataset.fileSize)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Type:</span>
                          <span className="text-sm font-semibold text-purple-600">
                            Raw Dataset
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Target Column Selection */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Select Target Column for Training
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Choose the column you want to predict (target variable):
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {dataPreview.headers.map((header) => (
                          <button
                            key={header}
                            onClick={() => setSelectedTargetColumn(header)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                              selectedTargetColumn === header
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'
                            }`}
                          >
                            {header}
                          </button>
                        ))}
                      </div>
                      {selectedTargetColumn && (
                        <div className="mt-3 p-2 bg-blue-100 rounded-md">
                          <p className="text-sm text-blue-800">
                            <strong>Selected Target:</strong> {selectedTargetColumn}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Features: {dataPreview.headers.filter(h => h !== selectedTargetColumn).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Search for all rows view */}
                    {showAllRows && (
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Search in data..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div 
                        className={`overflow-auto border-2 border-gray-100 custom-scrollbar ${
                          showAllRows ? 'max-h-96' : 'max-h-80'
                        }`}
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
                                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-r border-gray-200 last:border-r-0 ${
                                    selectedTargetColumn === header 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-gray-50 text-gray-500'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <span className="truncate">{header}</span>
                                    {selectedTargetColumn === header && (
                                      <Target className="w-3 h-3 ml-1 text-blue-600" />
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
                                  <td className="px-3 py-2 text-xs text-gray-500 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                                    {rowIndex + 1}
                                  </td>
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className={`px-4 py-2 text-sm border-r border-gray-200 last:border-r-0 ${
                                        selectedTargetColumn === dataPreview.headers[cellIndex]
                                          ? 'bg-blue-50 text-blue-900 font-medium'
                                          : 'text-gray-900'
                                      }`}
                                    >
                                      <div className="truncate max-w-xs" title={cell}>
                                        {cell}
                                      </div>
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
                    <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg">
                      <h4 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
                        <Brain className="w-5 h-5 mr-2" />
                        Ready for Quick Training
                      </h4>
                      <p className="text-green-700 mb-4">
                        Your dataset is uploaded and ready for immediate model training. 
                        {selectedTargetColumn ? (
                          <span className="text-green-800 font-medium"> Target column &quot;{selectedTargetColumn}&quot; selected. Ready to start training!</span>
                        ) : (
                          <span className="text-orange-700 font-medium"> Please select a target column above before starting training.</span>
                        )}
                      </p>
                      
                      <button
                        onClick={handleShowModelConfig}
                        disabled={!selectedTargetColumn}
                        className={`w-full px-6 py-3 font-medium rounded-lg transition-colors flex items-center justify-center ${
                          selectedTargetColumn 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                      >
                        <PlayCircle className="w-5 h-5 mr-2" />
                        🚀 Start Quick Training
                      </button>
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
        </>
      )}
    </div>
  );
}
