'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Script from 'next/script';
import { 
  ArrowUpTrayIcon, 
  XMarkIcon, 
  DocumentChartBarIcon, 
  CpuChipIcon, 
  BeakerIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import Papa from 'papaparse';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

// Razorpay Types
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayWindow extends Window {
  Razorpay: any; // This is acceptable as it's a third-party type
}

export default function UploadDataset() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const [uploadCount, setUploadCount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCalculatingSize, setIsCalculatingSize] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Constants
  const FREE_UPLOAD_LIMIT = 5;
  const BYTES_PER_CELL = 12;
  const PRICE_PER_MB = 49;

  // Calculate estimated size and price
  const calculateEstimatedSize = (rows: number, cols: number) => {
    const bytesPerCell = BYTES_PER_CELL;
    const totalBytes = rows * cols * bytesPerCell;
    const mbSize = totalBytes / (1024 * 1024);
    return Math.ceil(mbSize);
  };

  const calculatePrice = (sizeInMB: number) => {
    return sizeInMB * PRICE_PER_MB;
  };

  // Initialize Razorpay payment
  const initializeRazorpayPayment = async () => {
    try {
      setIsProcessingPayment(true);
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalPrice,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      const order = await response.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Data-VizAI',
        description: `Payment for dataset upload (${estimatedSize}MB)`,
        order_id: order.id,
        handler: async function (response: RazorpayResponse) {
          try {
            const verifyResponse = await fetch('/api/payments/confirm-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              setShowPaymentModal(false);
              // Continue with upload process
              processUpload();
            } else {
              setError('Payment verification failed');
            }
          } catch {
            setError('Payment verification failed');
          }
        },
        prefill: {
          name: session?.user?.name || 'User',
          email: session?.user?.email || 'user@example.com',
        },
        theme: {
          color: '#3B82F6',
        },
      };

      const razorpayWindow = window as unknown as RazorpayWindow;
      const paymentObject = new razorpayWindow.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      setError('Failed to initialize payment');
      console.error('Payment initialization error:', err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch current upload count when component mounts
  useEffect(() => {
    const fetchUploadCount = async () => {
      try {
        const response = await fetch('/api/datasets');
        if (response.ok) {
          const data = await response.json();
          setUploadCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching upload count:', error);
      }
    };

    fetchUploadCount();
  }, []);

  // Function to check if user has reached upload limit
  const hasReachedUploadLimit = () => {
    return uploadCount >= FREE_UPLOAD_LIMIT;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    
    // Check file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'csv') {
      setError('Only CSV files are supported at the moment.');
      return;
    }

    setFile(file);
    setFileName(file.name);
    setDatasetName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for dataset name
    setError('');

    // Parse CSV for preview (first 5 rows)
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setPreviewData(results.data as Record<string, unknown>[]);
          if (results.meta.fields) {
            setColumns(results.meta.fields);
          }
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
      }
    });

    // Calculate size and price if over limit
    if (hasReachedUploadLimit()) {
      calculateSizeAndPrice(file);
    }
  };

  const calculateSizeAndPrice = (file: File) => {
    setIsCalculatingSize(true);
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.data && results.meta.fields) {
          const rows = results.data.length;
          const cols = results.meta.fields.length;
          const size = calculateEstimatedSize(rows, cols);
          setEstimatedSize(size);
          setTotalPrice(calculatePrice(size));
        }
        setIsCalculatingSize(false);
      },
      error: (error) => {
        setError(`Error calculating file size: ${error.message}`);
        setIsCalculatingSize(false);
      }
    });
  };

  const clearFile = () => {
    setFile(null);
    setFileName('');
    setPreviewData(null);
    setColumns([]);
    setEstimatedSize(0);
    setTotalPrice(0);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!datasetName.trim()) {
      setError('Please provide a name for your dataset.');
      return;
    }

    // If user has reached upload limit, show payment modal
    if (hasReachedUploadLimit()) {
      if (estimatedSize === 0) {
        calculateSizeAndPrice(file);
      }
      setShowPaymentModal(true);
      return;
    }

    // Process upload directly for free users
    processUpload();
  };

  // Function to determine column types (text, numeric, or mixed)
  const determineColumnTypes = (data: Record<string, unknown>[], columns: string[]) => {
    const columnTypes: Record<string, 'text' | 'numeric' | 'mixed'> = {};

    columns.forEach(column => {
      let hasNumeric = false;
      let hasText = false;

      // Check first 100 rows or all rows if less than 100
      const sampleSize = Math.min(data.length, 100);
      for (let i = 0; i < sampleSize; i++) {
        const value = data[i][column];
        
        // Skip empty values
        if (value === undefined || value === null || value === '') continue;
        
        // Check if value is numeric
        const isValueNumeric = !isNaN(Number(value)) && String(value).trim() !== '';
        
        if (isValueNumeric) {
          hasNumeric = true;
        } else {
          hasText = true;
        }
        
        // If we've found both numeric and non-numeric values, it's mixed
        if (hasNumeric && hasText) {
          columnTypes[column] = 'mixed';
          break;
        }
      }

      // Determine final type
      if (hasNumeric && !hasText) {
        columnTypes[column] = 'numeric';
      } else if (hasText && !hasNumeric) {
        columnTypes[column] = 'text';
      } else {
        columnTypes[column] = 'mixed';
      }
    });

    return columnTypes;
  };

  // Separate the upload process for after payment
  const processUpload = async () => {
    setIsUploading(true);
    setError('');

    try {
      // Parse the entire CSV file
      Papa.parse(file as File, {
        header: true,
        complete: async (results) => {
          if (!results.data || results.data.length === 0) {
            throw new Error('The CSV file appears to be empty');
          }

          if (!results.meta.fields || results.meta.fields.length === 0) {
            throw new Error('No columns found in the CSV file');
          }

          const columnTypes = determineColumnTypes(results.data as Record<string, unknown>[], results.meta.fields);
            
          const dataset = {
            name: datasetName,
            columns: results.meta.fields.map(field => ({
              name: field,
              type: columnTypes[field]
            })),
            data: results.data
          };

          try {
            // Upload to API
            const response = await fetch('/api/datasets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(dataset),
            });

            // Update the text with proper escaping
            if (!response.ok) {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload dataset');
              } else {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to upload dataset');
              }
            }

            // Handle successful upload
            await response.json(); // consume the response
            router.push('/dashboard/quality-metrics');
          } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'An error occurred while uploading the dataset');
          }
        },
        error: (error) => {
          throw new Error(`Error parsing CSV: ${error.message}`);
        }
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while uploading the dataset.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Payment Modal Component
  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <ArrowUpTrayIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Dataset Upload Payment</h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500 mb-4">
                You&apos;ve reached the free upload limit. Select a file to see pricing for additional storage.
              </p>
              {isCalculatingSize ? (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mr-2"></div>
                    <span className="text-gray-600">Calculating size...</span>
                  </div>
                </div>
              ) : (
<div className="bg-gray-50 rounded-lg p-4 mb-4">
  <div className="flex justify-between mb-2">
    <span className="text-gray-800 font-semibold">Dataset:</span>
    <span className="font-semibold text-gray-900">{fileName}</span>
  </div>
  <div className="flex justify-between mb-2">
    <span className="text-gray-800 font-semibold">Estimated Size:</span>
    <span className="font-semibold text-gray-900">{estimatedSize} MB</span>
  </div>
  <div className="flex justify-between text-lg font-semibold mb-2">
    <span className="text-gray-900">Total Price:</span>
    <span className="text-blue-700 font-bold">₹{totalPrice}</span>
  </div>
  <div>
    <p className="text-sm font-medium text-blue-600">
      We recommend using <span className="underline">net banking</span> for secure payment.
    </p>
  </div>
</div>

              )}
            </div>
            <div className="flex justify-center gap-4 px-4 py-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={initializeRazorpayPayment}
                disabled={isProcessingPayment || isCalculatingSize}
                className={`bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  (isProcessingPayment || isCalculatingSize) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessingPayment ? 'Processing...' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="beforeInteractive"
      />
      <PaymentModal />
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <DocumentChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Smart Data Analyser
                  </h1>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <span className="font-medium">powered by</span>
                    <div className="flex items-center space-x-1">
                      <CpuChipIcon className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-blue-600">AI Agents</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Usage Indicator */}
              <div className="flex items-center space-x-4">
                <div className={`bg-white/90 px-4 py-2 rounded-xl shadow-sm border ${hasReachedUploadLimit() ? 'border-red-200' : 'border-gray-200/50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm ${hasReachedUploadLimit() ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      Upload Usage: <span className="font-semibold">{uploadCount}/{FREE_UPLOAD_LIMIT}</span>
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          hasReachedUploadLimit()
                            ? 'bg-red-500'
                            : uploadCount >= FREE_UPLOAD_LIMIT * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(uploadCount / FREE_UPLOAD_LIMIT) * 100}%` }}
                      />
                    </div>
                  </div>
                  {hasReachedUploadLimit() && (
                    <div className="mt-2 text-xs text-red-600">
                      Upload limit reached. Select a file to see pricing for additional storage.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">Upload Your Dataset</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Transform your raw data into actionable insights with our advanced AI-powered analytics platform. 
            Upload your CSV file to begin intelligent data exploration and visualization.
          </p>
          <p className="text-sm text-slate-500 mt-2">
    Maximum file size: <strong>10MB</strong>.
  </p>
          <div className="mt-6 flex justify-center space-x-6 text-sm text-slate-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Automated Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Smart Insights</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Real-time Processing</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit}>
              {!file ? (
                <div 
                  className="border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <div className="flex flex-col items-center space-y-6">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-300">
                      <ArrowUpTrayIcon className="h-16 w-16 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex text-lg leading-6 text-slate-700">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <span>Choose your CSV file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".csv"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                          />
                        </label>
                      </div>
                      <p className="text-slate-500 text-lg">or drag and drop it here</p>
                    </div>
                    <div className="bg-slate-100 rounded-lg px-4 py-2">
                      <p className="text-sm text-slate-600 font-medium">Supported format: CSV files only</p>
                    </div>
                    {hasReachedUploadLimit() && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-amber-800 font-medium">
                          You've reached the free upload limit. Select a file to see pricing for additional storage.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* File Info Card */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                          <DocumentChartBarIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-800">{fileName}</p>
                          <p className="text-sm text-slate-600">{(file.size / 1024).toFixed(2)} KB • CSV Format</p>
                          {hasReachedUploadLimit() && estimatedSize > 0 && (
                            <p className="text-sm text-blue-600 font-medium">
                              Estimated upload size: {estimatedSize} MB • Price: ₹{totalPrice}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                        onClick={clearFile}
                      >
                        <span className="sr-only">Remove file</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Dataset Name Input */}
                  <div className="space-y-3">
                    <label htmlFor="dataset-name" className="block text-lg font-semibold leading-6 text-slate-800">
                      Dataset Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="dataset-name"
                        id="dataset-name"
                        className="block w-full rounded-xl border-0 py-4 px-4 text-slate-800 text-lg shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
                        placeholder="Enter a descriptive name for your dataset"
                        value={datasetName}
                        onChange={(e) => setDatasetName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Data Preview */}
                  {previewData && columns.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-slate-800">Data Preview</h3>
                        <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                          {columns.length} columns detected
                        </div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/80">
                              <tr>
                                {columns.map((column) => (
                                  <th
                                    key={column}
                                    scope="col"
                                    className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider"
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {previewData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors duration-150">
                                  {columns.map((column) => (
                                    <td
                                      key={`${rowIndex}-${column}`}
                                      className="px-6 py-4 text-sm text-slate-600 font-mono"
                                    >
                                      {String(row[column] || '') || <span className="text-slate-400 italic">empty</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-200">
                          <p className="text-sm text-slate-500">
                            Showing first {previewData.length} rows • AI analysis will process complete dataset
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <button
                      type="button"
                      className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all duration-200"
                      onClick={clearFile}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                        isUploading 
                          ? 'bg-slate-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      }`}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Processing...</span>
                        </div>
                      ) : hasReachedUploadLimit() ? (
                        'Continue with Payment'
                      ) : (
                        'Start AI Analysis'
                      )}
                    </button>
                  </div>
                </div>
              )}

             {/* Error Message */}
              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                <CpuChipIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">AI-Powered Analysis</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Our advanced AI algorithms automatically detect patterns, outliers, and relationships in your data, 
              providing instant insights without manual configuration.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                <DocumentChartBarIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Smart Visualizations</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Generate interactive charts and graphs automatically based on your data structure. 
              Our system chooses the most appropriate visualization for each data type.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                <BeakerIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Data Insights</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Discover hidden trends and correlations with our intelligent data mining capabilities. 
              Get actionable recommendations based on statistical analysis.
            </p>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-slate-800 mb-12">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                1
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">Upload Data</h4>
              <p className="text-slate-600">Upload your CSV file with just a few clicks</p>
              {/* Connector line */}
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                2
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">AI Processing</h4>
              <p className="text-slate-600">Our AI analyzes patterns and data structure</p>
              {/* Connector line */}
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                3
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">Generate Insights</h4>
              <p className="text-slate-600">Automatic visualization and trend detection</p>
              {/* Connector line */}
            </div>
            
            <div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                4
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">Explore Results</h4>
              <p className="text-slate-600">Interactive dashboard with actionable insights</p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-20 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-12 text-center text-white shadow-2xl">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Data?</h3>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of users who have discovered powerful insights in their data using our AI-powered platform.
            </p>
            <div className="flex items-center justify-center space-x-8 text-blue-100">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Fast Processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>Secure Upload</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                <span>Expert Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}