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

// Function to calculate quartiles and other statistics for box plot
function calculateBoxPlotData(data: number[]) {
  if (data.length === 0) return null;
  
  // Sort the data
  const sortedData = [...data].sort((a, b) => a - b);
  
  // Calculate min, max, and quartiles
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  
  // Calculate median (Q2)
  const medianIndex = Math.floor(sortedData.length / 2);
  const median = sortedData.length % 2 === 0
    ? (sortedData[medianIndex - 1] + sortedData[medianIndex]) / 2
    : sortedData[medianIndex];
  
  // Calculate Q1 (first quartile)
  const q1Index = Math.floor(sortedData.length / 4);
  const q1 = sortedData.length % 4 === 0
    ? (sortedData[q1Index - 1] + sortedData[q1Index]) / 2
    : sortedData[q1Index];
  
  // Calculate Q3 (third quartile)
  const q3Index = Math.floor(sortedData.length * 3 / 4);
  const q3 = sortedData.length % 4 === 0
    ? (sortedData[q3Index - 1] + sortedData[q3Index]) / 2
    : sortedData[q3Index];
  
  // Calculate IQR (Interquartile Range)
  const iqr = q3 - q1;
  
  // Calculate whiskers (typically 1.5 * IQR from the box)
  const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
  const upperWhisker = Math.min(max, q3 + 1.5 * iqr);
  
  // Identify outliers
  const outliers = sortedData.filter(value => value < lowerWhisker || value > upperWhisker);
  
  return {
    min,
    q1,
    median,
    q3,
    max,
    lowerWhisker,
    upperWhisker,
    outliers
  };
}

export default function BoxPlot() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
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
              const categoryColumn = selectedDataset.columns.find((col: unknown) => col.type === 'text');
              
              if (numericColumn) setSelectedColumn(numericColumn.name);
              if (categoryColumn) setSelectedCategory(categoryColumn.name);
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
  }, [currentDataset, selectedColumn, selectedCategory]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset column selections
      setSelectedColumn('');
      setSelectedCategory('');
      
      // Set default columns based on column types
      const numericColumn = selected.columns.find((col: unknown) => col.type === 'numeric');
      const categoryColumn = selected.columns.find((col: unknown) => col.type === 'text');
      
      if (numericColumn) setSelectedColumn(numericColumn.name);
      if (categoryColumn) setSelectedCategory(categoryColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedColumn) return;

    const columnType = currentDataset.columns.find((col: unknown) => col.name === selectedColumn)?.type;

    // For box plots, we need numeric data
    if (columnType !== 'numeric') {
      setError('Selected column must be numeric for box plots');
      setChartData(null);
      return;
    }

    let boxPlotData;
    let labels: string[] = [];
    
    if (selectedCategory) {
      // Group data by category
      const categoryGroups: Record<string, number[]> = {};
      
      currentDataset.data.forEach((item: unknown) => {
        const categoryValue = item[selectedCategory];
        const numericValue = parseFloat(item[selectedColumn]);
        
        if (!isNaN(numericValue)) {
          if (!categoryGroups[categoryValue]) {
            categoryGroups[categoryValue] = [];
          }
          categoryGroups[categoryValue].push(numericValue);
        }
      });
      
      // Calculate box plot data for each category
      const categories = Object.keys(categoryGroups);
      const boxPlotStats = categories.map(category => {
        return {
          category,
          stats: calculateBoxPlotData(categoryGroups[category])
        };
      }).filter(item => item.stats !== null);
      
      if (boxPlotStats.length === 0) {
        setError('No valid numeric data found for the selected columns');
        setChartData(null);
        return;
      }
      
      labels = boxPlotStats.map(item => item.category);
      
      // Prepare data for Chart.js
      // Since Chart.js doesn't have a built-in box plot type, we'll simulate it with a bar chart
      boxPlotData = {
        labels,
        datasets: [
          // Min to Q1 (lower whisker)
          {
            label: 'Lower Whisker',
            data: boxPlotStats.map(item => item.stats!.lowerWhisker - item.stats!.min),
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(71, 85, 105, 0.8)',
            borderWidth: 2,
            base: boxPlotStats.map(item => item.stats!.min),
          },
          // Q1 to Median
          {
            label: 'Q1 to Median',
            data: boxPlotStats.map(item => item.stats!.median - item.stats!.q1),
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            borderColor: 'rgba(59, 130, 246, 0.8)',
            borderWidth: 2,
            base: boxPlotStats.map(item => item.stats!.q1),
          },
          // Median to Q3
          {
            label: 'Median to Q3',
            data: boxPlotStats.map(item => item.stats!.q3 - item.stats!.median),
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderColor: 'rgba(16, 185, 129, 0.8)',
            borderWidth: 2,
            base: boxPlotStats.map(item => item.stats!.median),
          },
          // Q3 to Upper Whisker
          {
            label: 'Upper Whisker',
            data: boxPlotStats.map(item => item.stats!.upperWhisker - item.stats!.q3),
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(71, 85, 105, 0.8)',
            borderWidth: 2,
            base: boxPlotStats.map(item => item.stats!.q3),
          },
        ],
      };
    } else {
      // Single box plot for the entire dataset
      const numericValues = currentDataset.data
        .map((item: unknown) => parseFloat(item[selectedColumn]))
        .filter((value: number) => !isNaN(value));
      
      if (numericValues.length === 0) {
        setError('No valid numeric data found in the selected column');
        setChartData(null);
        return;
      }
      
      const stats = calculateBoxPlotData(numericValues);
      if (!stats) {
        setError('Could not calculate statistics for the selected data');
        setChartData(null);
        return;
      }
      
      labels = [selectedColumn];
      
      // Prepare data for Chart.js
      boxPlotData = {
        labels,
        datasets: [
          // Min to Q1 (lower whisker)
          {
            label: 'Lower Whisker',
            data: [stats.lowerWhisker - stats.min],
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(71, 85, 105, 0.8)',
            borderWidth: 2,
            base: [stats.min],
          },
          // Q1 to Median
          {
            label: 'Q1 to Median',
            data: [stats.median - stats.q1],
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            borderColor: 'rgba(59, 130, 246, 0.8)',
            borderWidth: 2,
            base: [stats.q1],
          },
          // Median to Q3
          {
            label: 'Median to Q3',
            data: [stats.q3 - stats.median],
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderColor: 'rgba(16, 185, 129, 0.8)',
            borderWidth: 2,
            base: [stats.median],
          },
          // Q3 to Upper Whisker
          {
            label: 'Upper Whisker',
            data: [stats.upperWhisker - stats.q3],
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(71, 85, 105, 0.8)',
            borderWidth: 2,
            base: [stats.q3],
          },
        ],
      };
    }

    setChartData(boxPlotData);
    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex justify-center items-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
            <CpuChipIcon className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <ChartBarIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Box Plot Analysis
                  </h1>
                  <p className="mt-2 text-lg text-gray-600 font-medium">
                    AI-Powered Statistical Distribution Visualization
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-blue-200 shadow-sm">
                <SparklesIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">Smart Data Analyser</span>
              </div>
            </div>
          </div>
          
          {/* Empty State */}
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-blue-100 overflow-hidden">
            <div className="px-8 py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                  <ChartBarIcon className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Datasets Available</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Upload your first dataset to unlock powerful AI-driven box plot analysis and discover hidden patterns in your data.
              </p>
              <Link 
                href="/dashboard/upload"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                <CpuChipIcon className="h-5 w-5 mr-2" />
                Upload Dataset
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href={`/dashboard/data-table?id=${currentDataset?._id}`}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <ChartBarIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Box Plot Analysis
                </h1>
                <p className="mt-2 text-lg text-gray-600 font-medium">
                  AI-Powered Statistical Distribution Visualization
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-blue-200 shadow-sm">
              <SparklesIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Smart Data Analyser</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-blue-100 overflow-hidden">
          {/* Controls Panel */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-blue-100 p-6">
            <div className="flex items-center mb-6">
              <CpuChipIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Analysis Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-800">
                  Select Dataset
                </label>
                <select
                  id="dataset-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                  value={currentDataset?._id || ''}
                  onChange={handleDatasetChange}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset._id} value={dataset._id} className="font-medium">
                      {dataset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="column-select" className="block text-sm font-semibold text-gray-800">
                  Target Column (Numeric)
                </label>
                <select
                  id="column-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                >
                  <option value="" className="font-medium">Select Numeric Column</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name} className="font-medium">
                      {column.name} • numeric
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="category-select" className="block text-sm font-semibold text-gray-800">
                  Group By Category (Optional)
                </label>
                <select
                  id="category-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="" className="font-medium">No Grouping</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'text').map((column: unknown) => (
                    <option key={column.name} value={column.name} className="font-medium">
                      {column.name} • categorical
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
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

          {/* Chart Area */}
          <div className="p-8">
            {chartData ? (
              <div className="space-y-6">
                {/* Chart Title */}
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedCategory 
                      ? `Distribution Analysis: ${selectedColumn} by ${selectedCategory}`
                      : `Distribution Analysis: ${selectedColumn}`}
                  </h3>
                  <p className="text-gray-600 font-medium">
                    Statistical quartile analysis powered by AI algorithms
                  </p>
                </div>

                {/* Chart Container */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-lg">
                  <div style={{ height: '500px' }}>
                    <Bar 
                      data={chartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          title: {
                            display: false,
                          },
                          tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            borderWidth: 1,
                            cornerRadius: 12,
                            titleFont: {
                              size: 14,
                              weight: 'bold'
                            },
                            bodyFont: {
                              size: 13
                            },
                            callbacks: {
                              title: (tooltipItems) => {
                                return tooltipItems[0].dataset.label || '';
                              },
                              label: (tooltipItem) => {
                                return `Value: ${Number(tooltipItem.raw).toFixed(2)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: false,
                            title: {
                              display: true,
                              text: selectedColumn,
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151'
                            },
                            stacked: true,
                            grid: {
                              color: 'rgba(156, 163, 175, 0.3)',
                              lineWidth: 1
                            },
                            ticks: {
                              color: '#6B7280',
                              font: {
                                size: 12,
                                weight: '500'
                              }
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: selectedCategory || 'Dataset',
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151'
                            },
                            grid: {
                              display: false
                            },
                            ticks: {
                              color: '#6B7280',
                              font: {
                                size: 12,
                                weight: '500'
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Insights Panel */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center mb-4">
                    <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
                    <h4 className="text-lg font-bold text-gray-900">AI-Generated Insights</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
                      <div className="text-sm font-semibold text-gray-600 mb-1">Quartile Analysis</div>
                      <div className="text-lg font-bold text-gray-900">Q1 → Median → Q3</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
                      <div className="text-sm font-semibold text-gray-600 mb-1">Outlier Detection</div>
                      <div className="text-lg font-bold text-gray-900">1.5 × IQR Rule</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
                      <div className="text-sm font-semibold text-gray-600 mb-1">Distribution Shape</div>
                      <div className="text-lg font-bold text-gray-900">Whisker Analysis</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
                      <div className="text-sm font-semibold text-gray-600 mb-1">Statistical Depth</div>
                      <div className="text-lg font-bold text-gray-900">Multi-Dimensional</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-blue-100 rounded-2xl flex items-center justify-center">
                    <ChartBarIcon className="h-8 w-8 text-gray-500" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Analysis</h3>
                <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                  {!selectedColumn
                    ? 'Select a numeric column to generate an AI-powered box plot analysis'
                    : 'No data available for the selected column configuration'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}