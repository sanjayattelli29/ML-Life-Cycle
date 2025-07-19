'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function ScatterPlot() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedXAxis, setSelectedXAxis] = useState<string>('');
  const [selectedYAxis, setSelectedYAxis] = useState<string>('');
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
              
              // Set default X and Y axes based on column types
              const numericColumns = selectedDataset.columns.filter((col: unknown) => col.type === 'numeric');
              if (numericColumns.length >= 2) {
                setSelectedXAxis(numericColumns[0].name);
                setSelectedYAxis(numericColumns[1].name);
              } else if (numericColumns.length === 1) {
                setSelectedXAxis(numericColumns[0].name);
              }
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

  useEffect(() => {
    if (currentDataset && selectedXAxis && selectedYAxis) {
      generateChartData();
    }
  }, [currentDataset, selectedXAxis, selectedYAxis]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset axis selections
      setSelectedXAxis('');
      setSelectedYAxis('');
      
      // Set default X and Y axes based on column types
      const numericColumns = selected.columns.filter((col: unknown) => col.type === 'numeric');
      if (numericColumns.length >= 2) {
        setSelectedXAxis(numericColumns[0].name);
        setSelectedYAxis(numericColumns[1].name);
      } else if (numericColumns.length === 1) {
        setSelectedXAxis(numericColumns[0].name);
      }
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedXAxis || !selectedYAxis) return;

    const xAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedXAxis)?.type;
    const yAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedYAxis)?.type;

    // For scatter plots, both axes should be numeric
    if (xAxisType !== 'numeric' || yAxisType !== 'numeric') {
      setError('Both X and Y axes must be numeric columns for scatter plots');
      setChartData(null);
      return;
    }

    // Extract X and Y values as point objects
    const points = currentDataset.data.map((item: unknown) => ({
      x: parseFloat(item[selectedXAxis]),
      y: parseFloat(item[selectedYAxis]),
    })).filter((point: unknown) => !isNaN(point.x) && !isNaN(point.y));

    if (points.length === 0) {
      setError('No valid data points found for the selected axes');
      setChartData(null);
      return;
    }

    // Generate vibrant gradient colors
    const colors = [
      'rgba(99, 102, 241, 0.8)', // Indigo
      'rgba(34, 197, 94, 0.8)',  // Green
      'rgba(239, 68, 68, 0.8)',  // Red
      'rgba(245, 158, 11, 0.8)', // Amber
      'rgba(168, 85, 247, 0.8)', // Purple
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const borderColor = randomColor.replace('0.8', '1');

    setChartData({
      datasets: [
        {
          label: `${selectedYAxis} vs ${selectedXAxis}`,
          data: points,
          backgroundColor: randomColor,
          borderColor: borderColor,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="text-gray-700 font-medium">Loading your data analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Smart Data <span className="text-blue-600">Analyser</span>
            </h1>
            <p className="text-lg text-gray-600 mb-2">Powered by <strong>AI Agents</strong> & <em>Deep Learning</em></p>
            <p className="text-sm text-gray-500">Advanced Scatter Plot Analysis</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No Datasets Available</h3>
            <p className="text-gray-600 mb-6">Upload your first dataset to start analyzing relationships between variables with AI-powered insights.</p>
            <Link 
              href="/dashboard/upload"
              className="inline-flex items-center px-6 py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Dataset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Link 
              href={`/dashboard/data-table?id=${currentDataset?._id}`}
              className="mr-4 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            >
              <ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Smart Data <span className="text-blue-600">Analyser</span>
              </h1>
              <p className="text-lg text-gray-600 mb-1">Powered by <strong>AI Agents</strong> & <em>Deep Learning</em></p>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Scatter Plot Analysis
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Multi-Dimensional Insights
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white border border-gray-200 rounded-xl mb-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Analysis Configuration</h2>
            <p className="text-sm text-gray-600">Configure your scatter plot parameters for deep data exploration</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-800">
                  Dataset Selection
                </label>
                <select
                  id="dataset-select"
                  className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={currentDataset?._id || ''}
                  onChange={handleDatasetChange}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset._id} value={dataset._id}>
                      {dataset.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Choose your data source for analysis</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="x-axis-select" className="block text-sm font-semibold text-gray-800">
                  X-Axis Variable
                </label>
                <select
                  id="x-axis-select"
                  className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={selectedXAxis}
                  onChange={(e) => setSelectedXAxis(e.target.value)}
                >
                  <option value="">Select X-Axis Variable</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name}>
                      {column.name} (numeric)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Independent variable for correlation analysis</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="y-axis-select" className="block text-sm font-semibold text-gray-800">
                  Y-Axis Variable
                </label>
                <select
                  id="y-axis-select"
                  className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={selectedYAxis}
                  onChange={(e) => setSelectedYAxis(e.target.value)}
                >
                  <option value="">Select Y-Axis Variable</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name}>
                      {column.name} (numeric)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Dependent variable for relationship mapping</p>
              </div>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-red-800">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visualization Panel */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {chartData ? `${selectedYAxis} vs ${selectedXAxis}` : 'Scatter Plot Visualization'}
                </h2>
                <p className="text-sm text-gray-600">
                  {chartData ? 'AI-powered correlation and pattern analysis' : 'Configure parameters to generate visualization'}
                </p>
              </div>
              {chartData && (
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                    Active Analysis
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {chartData.datasets[0].data.length} Data Points
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {chartData ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="h-96">
                  <Scatter 
                    data={chartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            color: '#374151',
                            font: {
                              size: 12,
                              weight: '500'
                            }
                          }
                        },
                        title: {
                          display: true,
                          text: `Relationship Analysis: ${selectedYAxis} vs ${selectedXAxis}`,
                          color: '#111827',
                          font: {
                            size: 16,
                            weight: 'bold'
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: '#e5e7eb',
                          borderWidth: 1
                        }
                      },
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: selectedYAxis,
                            color: '#374151',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          },
                          ticks: {
                            color: '#6b7280'
                          },
                          grid: {
                            color: '#e5e7eb'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: selectedXAxis,
                            color: '#374151',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          },
                          ticks: {
                            color: '#6b7280'
                          },
                          grid: {
                            color: '#e5e7eb'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Analysis</h3>
                <p className="text-gray-600 mb-4">
                  {!selectedXAxis || !selectedYAxis
                    ? 'Select both X and Y axes to generate your AI-powered scatter plot analysis'
                    : 'No valid data points found for the selected variables'}
                </p>
                <p className="text-sm text-gray-500">
                  Our deep learning algorithms will identify patterns, correlations, and insights in your data
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Insights Panel */}
        {chartData && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="font-medium text-gray-900 mb-1">Data Points</p>
                <p className="text-2xl font-bold text-blue-600">{chartData.datasets[0].data.length}</p>
                <p className="text-gray-600 text-xs">Valid observations analyzed</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="font-medium text-gray-900 mb-1">Variables</p>
                <p className="text-2xl font-bold text-indigo-600">2</p>
                <p className="text-gray-600 text-xs">Numeric dimensions explored</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="font-medium text-gray-900 mb-1">Analysis Type</p>
                <p className="text-sm font-semibold text-purple-600">Correlation</p>
                <p className="text-gray-600 text-xs">Relationship mapping active</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}