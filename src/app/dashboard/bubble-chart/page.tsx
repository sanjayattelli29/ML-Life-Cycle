'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bubble } from 'react-chartjs-2';
import { ArrowLeftIcon, ChartBarIcon, CpuChipIcon, BeakerIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function BubbleChart() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedXAxis, setSelectedXAxis] = useState<string>('');
  const [selectedYAxis, setSelectedYAxis] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
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
              
              // Set default X, Y, and Size axes based on column types
              const numericColumns = selectedDataset.columns.filter((col: unknown) => col.type === 'numeric');
              if (numericColumns.length >= 3) {
                setSelectedXAxis(numericColumns[0].name);
                setSelectedYAxis(numericColumns[1].name);
                setSelectedSize(numericColumns[2].name);
              } else if (numericColumns.length === 2) {
                setSelectedXAxis(numericColumns[0].name);
                setSelectedYAxis(numericColumns[1].name);
                setSelectedSize(numericColumns[0].name);
              } else if (numericColumns.length === 1) {
                setSelectedXAxis(numericColumns[0].name);
                setSelectedYAxis(numericColumns[0].name);
                setSelectedSize(numericColumns[0].name);
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
    if (currentDataset && selectedXAxis && selectedYAxis && selectedSize) {
      generateChartData();
    }
  }, [currentDataset, selectedXAxis, selectedYAxis, selectedSize]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset axis selections
      setSelectedXAxis('');
      setSelectedYAxis('');
      setSelectedSize('');
      
      // Set default X, Y, and Size axes based on column types
      const numericColumns = selected.columns.filter((col: unknown) => col.type === 'numeric');
      if (numericColumns.length >= 3) {
        setSelectedXAxis(numericColumns[0].name);
        setSelectedYAxis(numericColumns[1].name);
        setSelectedSize(numericColumns[2].name);
      } else if (numericColumns.length === 2) {
        setSelectedXAxis(numericColumns[0].name);
        setSelectedYAxis(numericColumns[1].name);
        setSelectedSize(numericColumns[0].name);
      } else if (numericColumns.length === 1) {
        setSelectedXAxis(numericColumns[0].name);
        setSelectedYAxis(numericColumns[0].name);
        setSelectedSize(numericColumns[0].name);
      }
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedXAxis || !selectedYAxis || !selectedSize) return;

    const xAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedXAxis)?.type;
    const yAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedYAxis)?.type;
    const sizeType = currentDataset.columns.find((col: unknown) => col.name === selectedSize)?.type;

    // For bubble charts, all three axes should be numeric
    if (xAxisType !== 'numeric' || yAxisType !== 'numeric' || sizeType !== 'numeric') {
      setError('X-axis, Y-axis, and Size must all be numeric columns for bubble charts');
      setChartData(null);
      return;
    }

    // Extract X, Y, and Size values as point objects
    const points = currentDataset.data.map((item: unknown) => ({
      x: parseFloat(item[selectedXAxis]),
      y: parseFloat(item[selectedYAxis]),
      r: Math.max(4, Math.min(20, parseFloat(item[selectedSize]) / 5)), // Scale the size for better visualization
    })).filter((point: unknown) => !isNaN(point.x) && !isNaN(point.y) && !isNaN(point.r));

    if (points.length === 0) {
      setError('No valid data points found for the selected axes');
      setChartData(null);
      return;
    }

    // Generate modern gradient colors
    const gradientColors = [
      { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' }, // Blue
      { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgba(16, 185, 129, 1)' }, // Emerald
      { bg: 'rgba(245, 101, 101, 0.7)', border: 'rgba(245, 101, 101, 1)' }, // Red
      { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgba(139, 92, 246, 1)' }, // Purple
      { bg: 'rgba(251, 191, 36, 0.7)', border: 'rgba(251, 191, 36, 1)' }, // Amber
    ];
    const randomColor = gradientColors[Math.floor(Math.random() * gradientColors.length)];

    setChartData({
      datasets: [
        {
          label: `${selectedYAxis} vs ${selectedXAxis} (Size: ${selectedSize})`,
          data: points,
          backgroundColor: randomColor.bg,
          borderColor: randomColor.border,
          borderWidth: 2,
          hoverBackgroundColor: randomColor.border,
          hoverBorderWidth: 3,
        },
      ],
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex justify-center items-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="ml-4">
            <p className="text-gray-700 font-semibold">Loading Smart Analytics...</p>
            <p className="text-gray-500 text-sm">AI is preparing your data visualization</p>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
              Smart Data Analyser
            </h1>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <CpuChipIcon className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-700">Powered by AI Agents & Deep Learning</span>
              <BeakerIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Visualize complex relationships between three numeric variables with advanced bubble chart analytics
            </p>
          </div>
          
          {/* Empty State Card */}
          <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl border border-gray-100 overflow-hidden">
            <div className="p-12 text-center">
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                <ChartBarIcon className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready for Deep Data Analysis</h3>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                Upload your dataset to unlock AI-powered multidimensional analysis and discover hidden patterns in your data
              </p>
              <Link 
                href="/dashboard/upload"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-2xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:scale-105 transition-all duration-200"
              >
                <BeakerIcon className="h-6 w-6 mr-2" />
                Start AI Analysis
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Link 
              href={`/dashboard/data-table?id=${currentDataset?._id}`}
              className="mr-6 p-3 rounded-2xl text-gray-600 hover:text-blue-600 hover:bg-white/50 transition-all duration-200 group"
            >
              <ArrowLeftIcon className="h-6 w-6 group-hover:transform group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                  Bubble Chart Analytics
                </h1>
                <div className="flex items-center space-x-2 mt-2">
                  <CpuChipIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-600 font-medium">AI-Powered Multidimensional Analysis</span>
                  <BeakerIcon className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-2xl p-6 border border-blue-200/50">
            <p className="text-gray-700 text-lg leading-relaxed">
              Explore complex relationships between three numeric variables simultaneously. Our AI engine analyzes 
              patterns, correlations, and outliers to provide deep insights into your data dimensions.
            </p>
          </div>
        </div>

        {/* Main Chart Container */}
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl border border-gray-100 overflow-hidden">
          {/* Controls Section */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-8 border-b border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                <CpuChipIcon className="h-5 w-5 mr-2 text-blue-600" />
                AI Analysis Configuration
              </h3>
              <p className="text-gray-600">Configure your multidimensional analysis parameters</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                  📊 Dataset Source
                </label>
                <select
                  id="dataset-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm"
                  value={currentDataset?._id || ''}
                  onChange={handleDatasetChange}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset._id} value={dataset._id} className="py-2">
                      {dataset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="x-axis-select" className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                  📈 X-Axis (Horizontal)
                </label>
                <select
                  id="x-axis-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm"
                  value={selectedXAxis}
                  onChange={(e) => setSelectedXAxis(e.target.value)}
                >
                  <option value="">Select X-Axis Variable</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name} className="py-2">
                      {column.name} • numeric
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="y-axis-select" className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                  📊 Y-Axis (Vertical)
                </label>
                <select
                  id="y-axis-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm"
                  value={selectedYAxis}
                  onChange={(e) => setSelectedYAxis(e.target.value)}
                >
                  <option value="">Select Y-Axis Variable</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name} className="py-2">
                      {column.name} • numeric
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="size-select" className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                  🔮 Bubble Size
                </label>
                <select
                  id="size-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                >
                  <option value="">Select Size Variable</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name} className="py-2">
                      {column.name} • numeric
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-xl">
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
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Multidimensional Analysis Results
                    </h3>
                    <p className="text-gray-600 mt-1">
                      AI-generated insights from {chartData.datasets[0].data.length} data points
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-800 font-semibold text-sm">Analysis Active</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-inner">
                  <div className="h-[500px]">
                    <Bubble 
                      data={chartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151',
                              usePointStyle: true,
                              pointStyle: 'circle'
                            }
                          },
                          title: {
                            display: true,
                            text: `AI Analysis: ${selectedYAxis} vs ${selectedXAxis} (Size: ${selectedSize})`,
                            font: {
                              size: 18,
                              weight: 'bold'
                            },
                            color: '#1f2937',
                            padding: {
                              top: 10,
                              bottom: 30
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#1f2937',
                            bodyColor: '#374151',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            cornerRadius: 12,
                            padding: 12,
                            titleFont: {
                              size: 14,
                              weight: 'bold'
                            },
                            bodyFont: {
                              size: 13
                            },
                            callbacks: {
                              title: () => 'Data Point Analysis',
                              label: (context) => {
                                const point = context.raw as { x: number; y: number; r: number };
                                return [
                                  `${selectedXAxis}: ${point.x.toFixed(2)}`,
                                  `${selectedYAxis}: ${point.y.toFixed(2)}`,
                                  `${selectedSize}: ${(point.r * 5).toFixed(2)}`
                                ];
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
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
                              drawBorder: false
                            },
                            ticks: {
                              color: '#6b7280',
                              font: {
                                size: 12,
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
                              color: '#f3f4f6',
                              drawBorder: false
                            },
                            ticks: {
                              color: '#6b7280',
                              font: {
                                size: 12,
                                weight: '500'
                              }
                            }
                          }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'point'
                        },
                        animation: {
                          duration: 1500,
                          easing: 'easeInOutQuart'
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BeakerIcon className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ready for AI Analysis</h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                  {!selectedXAxis || !selectedYAxis || !selectedSize
                    ? 'Configure all three variables above to start your multidimensional analysis'
                    : 'Processing your data with AI algorithms...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}