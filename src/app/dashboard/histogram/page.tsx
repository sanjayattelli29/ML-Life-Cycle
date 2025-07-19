'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ArrowLeftIcon, ChartBarIcon, CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Histogram() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [binCount, setBinCount] = useState<number>(10);
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
              
              // Set default column based on column types
              const numericColumn = selectedDataset.columns.find((col: unknown) => col.type === 'numeric');
              if (numericColumn) setSelectedColumn(numericColumn.name);
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
    if (currentDataset && selectedColumn) {
      generateChartData();
    }
  }, [currentDataset, selectedColumn, binCount]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset column selection
      setSelectedColumn('');
      
      // Set default column based on column types
      const numericColumn = selected.columns.find((col: unknown) => col.type === 'numeric');
      if (numericColumn) setSelectedColumn(numericColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedColumn) return;

    const columnType = currentDataset.columns.find((col: unknown) => col.name === selectedColumn)?.type;

    // For histograms, we need numeric data
    if (columnType !== 'numeric') {
      setError('Selected column must be numeric for histograms');
      setChartData(null);
      return;
    }

    // Extract numeric values
    const numericValues = currentDataset.data
      .map((item: unknown) => parseFloat(item[selectedColumn]))
      .filter((value: number) => !isNaN(value));

    if (numericValues.length === 0) {
      setError('No valid numeric data found in the selected column');
      setChartData(null);
      return;
    }

    // Calculate min and max values
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);
    
    // Calculate bin width
    const binWidth = (maxValue - minValue) / binCount;
    
    // Create bins
    const bins = Array(binCount).fill(0).map((_, i) => ({
      start: minValue + i * binWidth,
      end: minValue + (i + 1) * binWidth,
      count: 0,
    }));
    
    // Count values in each bin
    numericValues.forEach((value: number) => {
      const binIndex = Math.min(
        Math.floor((value - minValue) / binWidth),
        binCount - 1
      );
      bins[binIndex].count++;
    });
    
    // Generate labels and data
    const labels = bins.map(bin => `${bin.start.toFixed(2)} - ${bin.end.toFixed(2)}`);
    const data = bins.map(bin => bin.count);

    // Professional gradient colors for Smart Data Analyser
    const gradientColors = [
      'rgba(99, 102, 241, 0.8)',   // Indigo
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(16, 185, 129, 0.8)',   // Emerald
      'rgba(245, 158, 11, 0.8)',   // Amber
      'rgba(239, 68, 68, 0.8)',    // Red
    ];
    
    const randomColor = gradientColors[Math.floor(Math.random() * gradientColors.length)];
    const backgroundColor = randomColor;
    const borderColor = randomColor.replace('0.8', '1');

    setChartData({
      labels,
      datasets: [
        {
          label: `Frequency Distribution of ${selectedColumn}`,
          data,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          barPercentage: 0.9,
          categoryPercentage: 0.9,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
            <CpuChipIcon className="h-6 w-6 text-indigo-600 absolute top-5 left-5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with AI Branding */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl shadow-xl">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-blue-900 bg-clip-text text-transparent mb-3">
              Histogram Distribution Analysis
            </h1>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <SparklesIcon className="h-5 w-5 text-indigo-600" />
              <p className="text-lg text-gray-700 font-medium">Smart Data Analyser</p>
              <SparklesIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Powered by <span className="font-semibold text-indigo-700">AI Agents & Deep Learning</span> • 
              Visualize data distributions with intelligent binning and statistical insights
            </p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm shadow-2xl rounded-3xl border border-white/20 p-12 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Datasets Available</h3>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                Upload your first dataset to unlock powerful AI-driven histogram analysis and data distribution insights.
              </p>
            </div>
            
            <Link 
              href="/dashboard/upload"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 space-x-3"
            >
              <CpuChipIcon className="h-5 w-5" />
              <span>Upload Dataset</span>
              <SparklesIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Link 
              href={`/dashboard/data-table?id=${currentDataset?._id}`}
              className="mr-6 p-3 rounded-2xl text-gray-500 hover:text-indigo-600 hover:bg-white/50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-3">
                <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl shadow-xl">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-blue-900 bg-clip-text text-transparent">
                    Histogram Distribution Analysis
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <SparklesIcon className="h-4 w-4 text-indigo-600" />
                    <p className="text-indigo-700 font-semibold">Smart Data Analyser</p>
                    <span className="text-gray-400">•</span>
                    <p className="text-gray-600">AI-Powered Statistical Insights</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 max-w-3xl leading-relaxed">
                Analyze data distributions with intelligent binning algorithms powered by 
                <span className="font-semibold text-indigo-700"> AI Agents & Deep Learning</span>. 
                Discover patterns, outliers, and statistical properties in your dataset.
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Controls Panel */}
        <div className="bg-white/70 backdrop-blur-sm shadow-2xl rounded-3xl border border-white/20 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600/5 to-blue-600/5 p-8 border-b border-indigo-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <CpuChipIcon className="h-6 w-6 text-indigo-600 mr-3" />
              Analysis Configuration
            </h3>
            
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-3">
                <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Dataset Selection
                </label>
                <select
                  id="dataset-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 font-medium shadow-sm"
                  value={currentDataset?._id || ''}
                  onChange={handleDatasetChange}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset._id} value={dataset._id}>
                      📊 {dataset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label htmlFor="column-select" className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Numeric Column
                </label>
                <select
                  id="column-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 font-medium shadow-sm"
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                >
                  <option value="">🔍 Select Column</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name}>
                      📈 {column.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label htmlFor="bin-count" className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Number of Bins
                </label>
                <input
                  id="bin-count"
                  type="number"
                  min="2"
                  max="50"
                  className="w-full px-4 py-3 text-gray-900 bg-white/80 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 font-medium shadow-sm"
                  value={binCount}
                  onChange={(e) => setBinCount(Math.max(2, Math.min(50, parseInt(e.target.value) || 10)))}
                />
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
                  <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Chart Section */}
          <div className="p-8">
            {chartData ? (
              <div className="space-y-6">
                {/* Chart Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">Total Records</p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {currentDataset?.data?.length || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100">
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Bins Count</p>
                    <p className="text-2xl font-bold text-green-900">{binCount}</p>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100">
                    <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Column</p>
                    <p className="text-lg font-bold text-amber-900 truncate">{selectedColumn}</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
                    <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Analysis</p>
                    <p className="text-lg font-bold text-purple-900">Distribution</p>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                  <div className="h-96 relative">
                    <Bar 
                      data={chartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          intersect: false,
                          mode: 'index',
                        },
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              padding: 20,
                              font: {
                                size: 14,
                                weight: '600',
                              },
                              color: '#374151',
                            },
                          },
                          title: {
                            display: true,
                            text: `AI-Powered Distribution Analysis: ${selectedColumn}`,
                            font: {
                              size: 18,
                              weight: 'bold',
                            },
                            color: '#1f2937',
                            padding: {
                              top: 10,
                              bottom: 30,
                            },
                          },
                          tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#1f2937',
                            bodyColor: '#374151',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            cornerRadius: 12,
                            displayColors: true,
                            padding: 12,
                            titleFont: {
                              size: 14,
                              weight: 'bold',
                            },
                            bodyFont: {
                              size: 13,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Frequency Count',
                              font: {
                                size: 14,
                                weight: '600',
                              },
                              color: '#374151',
                            },
                            grid: {
                              color: 'rgba(156, 163, 175, 0.3)',
                              drawBorder: false,
                            },
                            ticks: {
                              color: '#6b7280',
                              font: {
                                size: 12,
                              },
                            },
                          },
                          x: {
                            title: {
                              display: true,
                              text: `${selectedColumn} (Range Values)`,
                              font: {
                                size: 14,
                                weight: '600',
                              },
                              color: '#374151',
                            },
                            grid: {
                              display: false,
                            },
                            ticks: {
                              color: '#6b7280',
                              font: {
                                size: 11,
                              },
                              maxRotation: 45,
                              minRotation: 0,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChartBarIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {!selectedColumn ? 'Select Analysis Parameters' : 'No Data Available'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                  {!selectedColumn
                    ? 'Choose a numeric column from your dataset to generate an intelligent histogram analysis with AI-powered insights.'
                    : 'The selected column does not contain valid numeric data for histogram generation.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}