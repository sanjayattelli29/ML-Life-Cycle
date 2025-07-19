'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ArrowLeftIcon, ChartBarIcon, CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AreaCharts() {
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
              const textColumn = selectedDataset.columns.find((col: unknown) => col.type === 'text');
              const numericColumn = selectedDataset.columns.find((col: unknown) => col.type === 'numeric');
              
              if (textColumn) setSelectedXAxis(textColumn.name);
              if (numericColumn) setSelectedYAxis(numericColumn.name);
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
      const textColumn = selected.columns.find((col: unknown) => col.type === 'text');
      const numericColumn = selected.columns.find((col: unknown) => col.type === 'numeric');
      
      if (textColumn) setSelectedXAxis(textColumn.name);
      if (numericColumn) setSelectedYAxis(numericColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedXAxis || !selectedYAxis) return;

    const xAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedXAxis)?.type;
    const yAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedYAxis)?.type;

    // For area charts, X-axis is typically categorical (text) or sequential, and Y-axis should be numeric
    if (yAxisType !== 'numeric') {
      setError('Y-axis must be a numeric column for area charts');
      setChartData(null);
      return;
    }

    // Sort data by X-axis values if they are numeric or dates
    const sortedData = [...currentDataset.data];
    if (xAxisType === 'numeric') {
      sortedData.sort((a, b) => parseFloat(a[selectedXAxis]) - parseFloat(b[selectedXAxis]));
    }

    // Extract X and Y values
    const labels = sortedData.map(item => item[selectedXAxis]);
    const data = sortedData.map(item => parseFloat(item[selectedYAxis]));

    // Generate professional gradient colors
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgb(59, 130, 246)' }, // Blue
      { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgb(16, 185, 129)' }, // Emerald
      { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgb(139, 92, 246)' }, // Violet
      { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgb(236, 72, 153)' }, // Pink
      { bg: 'rgba(245, 101, 101, 0.15)', border: 'rgb(245, 101, 101)' }, // Red
    ];
    
    const colorIndex = Math.floor(Math.random() * colors.length);
    const selectedColor = colors[colorIndex];

    setChartData({
      labels,
      datasets: [
        {
          label: `${selectedYAxis} by ${selectedXAxis}`,
          data,
          backgroundColor: selectedColor.bg,
          borderColor: selectedColor.border,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: selectedColor.border,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex justify-center items-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <CpuChipIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <ChartBarIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
              Smart Data Analyser
            </h1>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <span className="text-lg text-gray-700 font-medium">Powered by</span>
              <CpuChipIcon className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-bold text-blue-600">AI Agents</span>
              <span className="text-lg text-gray-700">&</span>
              <SparklesIcon className="h-5 w-5 text-indigo-600" />
              <span className="text-lg font-bold text-indigo-600">Deep Learning</span>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Analyze your datasets in all dimensions with in-depth insights using advanced area chart visualizations
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl border border-white/20 p-12 text-center max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Datasets Found</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Upload your first dataset to unlock powerful AI-driven analytics and create stunning area chart visualizations
              </p>
            </div>
            <Link 
              href="/dashboard/upload"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              Upload Your Dataset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start space-x-6">
            <Link 
              href={`/dashboard/data-table?id=${currentDataset?._id}`}
              className="mt-2 p-3 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl text-gray-600 hover:text-blue-600 transform hover:scale-105 transition-all duration-200 border border-white/20"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                    Area Chart Analytics
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-gray-700 font-medium">Powered by</span>
                <CpuChipIcon className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-blue-600">AI Agents</span>
                <span className="text-gray-700">&</span>
                <SparklesIcon className="h-4 w-4 text-indigo-600" />
                <span className="font-bold text-indigo-600">Deep Learning</span>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">
                Visualize trends and patterns with intelligent area charts. Analyze your data across multiple dimensions with AI-powered insights.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl border border-white/20 overflow-hidden">
          {/* Controls Section */}
          <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm p-8 border-b border-gray-200/50">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <CpuChipIcon className="h-6 w-6 text-blue-600 mr-2" />
              Smart Configuration Panel
            </h3>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                  Dataset Selection
                </label>
                <div className="relative">
                  <select
                    id="dataset-select"
                    className="block w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    value={currentDataset?._id || ''}
                    onChange={handleDatasetChange}
                  >
                    {datasets.map((dataset) => (
                      <option key={dataset._id} value={dataset._id} className="py-2">
                        {dataset.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChartBarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="x-axis-select" className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                  X-Axis (Categories)
                </label>
                <div className="relative">
                  <select
                    id="x-axis-select"
                    className="block w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    value={selectedXAxis}
                    onChange={(e) => setSelectedXAxis(e.target.value)}
                  >
                    <option value="" className="text-gray-500">Select X-Axis</option>
                    {currentDataset?.columns?.map((column: unknown) => (
                      <option key={column.name} value={column.name} className="py-2">
                        {column.name} ({column.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="y-axis-select" className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                  Y-Axis (Values)
                </label>
                <div className="relative">
                  <select
                    id="y-axis-select"
                    className="block w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    value={selectedYAxis}
                    onChange={(e) => setSelectedYAxis(e.target.value)}
                  >
                    <option value="" className="text-gray-500">Select Y-Axis</option>
                    {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                      <option key={column.name} value={column.name} className="py-2">
                        {column.name} (numeric)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart Section */}
          <div className="p-8">
            {chartData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    AI-Generated Area Chart Analysis
                  </h3>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full">
                    <SparklesIcon className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">AI Powered</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-inner border border-gray-100">
                  <div className="h-96">
                    <Line 
                      data={chartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              usePointStyle: true,
                              pointStyle: 'circle',
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151'
                            }
                          },
                          title: {
                            display: true,
                            text: `Deep Learning Analysis: ${selectedYAxis} by ${selectedXAxis}`,
                            font: {
                              size: 18,
                              weight: 'bold'
                            },
                            color: '#1f2937'
                          },
                          tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#1f2937',
                            bodyColor: '#374151',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            cornerRadius: 12,
                            titleFont: {
                              weight: 'bold'
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: selectedYAxis,
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151'
                            },
                            grid: {
                              color: '#f3f4f6',
                              lineWidth: 1
                            },
                            ticks: {
                              color: '#6b7280',
                              font: {
                                weight: '500'
                              }
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: selectedXAxis,
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151'
                            },
                            grid: {
                              color: '#f9fafb',
                              lineWidth: 1
                            },
                            ticks: {
                              color: '#6b7280',
                              font: {
                                weight: '500'
                              }
                            }
                          }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'index'
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChartBarIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Analysis</h3>
                <p className="text-gray-600 text-lg">
                  {!selectedXAxis || !selectedYAxis
                    ? 'Configure your X and Y axes above to generate an intelligent area chart visualization'
                    : 'No data available for the selected configuration'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}