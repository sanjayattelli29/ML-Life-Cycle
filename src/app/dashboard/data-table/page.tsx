'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChartBarIcon, ChartPieIcon, BeakerIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function DataTable() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/datasets');
        if (response.ok) {
          const data = await response.json();
          setDatasets(data);
          
          // If a dataset ID is provided in the URL, load that dataset
          if (datasetId && data.length > 0) {
            const selectedDataset = data.find((d: unknown) => d._id === datasetId);
            if (selectedDataset) {
              setCurrentDataset(selectedDataset);
            } else {
              // If the dataset with the provided ID is not found, load the first dataset
              setCurrentDataset(data[0]);
            }
          } else if (data.length > 0) {
            // If no dataset ID is provided, load the first dataset
            setCurrentDataset(data[0]);
          }
        } else {
          throw new Error('Failed to fetch datasets');
        }
      } catch (error: unknown) {
        setError(error.message || 'An error occurred while fetching datasets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, [datasetId]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      setCurrentPage(1); // Reset to first page when changing datasets
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentDataset?.data?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = currentDataset?.data ? Math.ceil(currentDataset.data.length / itemsPerPage) : 0;

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-800 font-medium">Loading Smart Data Analysis...</p>
            <p className="text-gray-600 text-sm mt-1">Powered by AI Agents & Deep Learning</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-red-900">Analysis Error</h3>
                <p className="mt-1 text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <BeakerIcon className="h-12 w-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">Smart Data Analyser</h1>
            </div>
            <p className="text-xl text-gray-700 mb-2">Powered by <span className="font-semibold text-blue-600">AI Agents</span> & <span className="font-semibold text-purple-600">Deep Learning</span></p>
            <p className="text-gray-600">Analyze datasets in all dimensions with intelligent insights</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <CpuChipIcon className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Datasets Found</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">Upload your first dataset to unlock powerful AI-driven analysis and deep learning insights across all data dimensions.</p>
            <Link 
              href="/dashboard/upload"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <BeakerIcon className="h-5 w-5 mr-2" />
              Upload Dataset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <BeakerIcon className="h-10 w-10 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Smart Data Analyser</h1>
              <p className="text-gray-700">Powered by <span className="font-semibold text-blue-600">AI Agents</span> & <span className="font-semibold text-purple-600">Deep Learning</span></p>
            </div>
          </div>
          <p className="text-gray-600">Comprehensive dataset exploration and intelligent analysis across all dimensions</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Controls Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <label htmlFor="dataset-select" className="block text-sm font-medium text-gray-800 mb-2">
                  Select Dataset for Analysis
                </label>
                <select
                  id="dataset-select"
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={currentDataset?._id || ''}
                  onChange={handleDatasetChange}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset._id} value={dataset._id}>
                      {dataset.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/dashboard/bar-charts?id=${currentDataset?._id}`}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Bar Analysis
                </Link>
                <Link
                  href={`/dashboard/pie-charts?id=${currentDataset?._id}`}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <ChartPieIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Distribution Analysis
                </Link>
              </div>
            </div>
            
            {currentDataset && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-900">{currentDataset.name}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium text-blue-600">{currentDataset.data?.length || 0}</span>
                    <span className="ml-1">data points</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium text-purple-600">{currentDataset.columns?.length || 0}</span>
                    <span className="ml-1">dimensions</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CpuChipIcon className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">AI Ready</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {currentDataset && currentDataset.data && currentDataset.data.length > 0 ? (
            <>
              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      {currentDataset.columns?.map((column: unknown, index: number) => (
                        <th
                          key={index}
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider"
                        >
                          <div className="flex flex-col">
                            <span>{column.name}</span>
                            <span className="text-gray-600 font-normal capitalize text-xs mt-1">
                              {column.type}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {currentItems.map((row: unknown, rowIndex: number) => (
                      <tr key={rowIndex} className="hover:bg-gray-50 transition-colors duration-150">
                        {currentDataset.columns?.map((column: unknown, colIndex: number) => (
                          <td
                            key={colIndex}
                            className="px-6 py-4 text-sm text-gray-900"
                          >
                            <div className="max-w-xs truncate">
                              {row[column.name]}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 transition-colors duration-200 ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 transition-colors duration-200 ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-semibold text-gray-900">
                        {Math.min(indexOfLastItem, currentDataset.data.length)}
                      </span>{' '}
                      of <span className="font-semibold text-gray-900">{currentDataset.data.length}</span> data points
                    </p>
                  </div>
                  <div>
                    <nav className="flex items-center space-x-1">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 transition-colors duration-200 ${
                          currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => paginate(pageNumber)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              currentPage === pageNumber
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 transition-colors duration-200 ${
                          currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No data available for analysis in this dataset.</p>
              <p className="text-gray-500 text-sm mt-2">Try uploading a dataset with valid data points.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}