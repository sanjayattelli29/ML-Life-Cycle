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
import { ArrowLeftIcon, ChartBarIcon, CpuChipIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function WaterfallChart() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');
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
              
              // Set default columns based on column types
              const categoryColumn = selectedDataset.columns.find((col: unknown) => col.type === 'text');
              const valueColumn = selectedDataset.columns.find((col: unknown) => col.type === 'numeric');
              
              if (categoryColumn) setSelectedCategory(categoryColumn.name);
              if (valueColumn) setSelectedValue(valueColumn.name);
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
    if (currentDataset && selectedCategory && selectedValue) {
      generateChartData();
    }
  }, [currentDataset, selectedCategory, selectedValue]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset column selections
      setSelectedCategory('');
      setSelectedValue('');
      
      // Set default columns based on column types
      const categoryColumn = selected.columns.find((col: unknown) => col.type === 'text');
      const valueColumn = selected.columns.find((col: unknown) => col.type === 'numeric');
      
      if (categoryColumn) setSelectedCategory(categoryColumn.name);
      if (valueColumn) setSelectedValue(valueColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedCategory || !selectedValue) return;

    const categoryType = currentDataset.columns.find((col: unknown) => col.name === selectedCategory)?.type;
    const valueType = currentDataset.columns.find((col: unknown) => col.name === selectedValue)?.type;

    // For waterfall charts, category should be text and value should be numeric
    if (categoryType !== 'text' || valueType !== 'numeric') {
      setError('Category must be a text column and Value must be a numeric column for waterfall charts');
      setChartData(null);
      return;
    }

    // Extract categories and values
    const data = currentDataset.data.map((item: unknown) => ({
      category: item[selectedCategory],
      value: parseFloat(item[selectedValue])
    })).filter((item: unknown) => !isNaN(item.value));

    if (data.length === 0) {
      setError('No valid data found for the selected columns');
      setChartData(null);
      return;
    }

    // Sort data by value to make the waterfall more meaningful
    data.sort((a: unknown, b: unknown) => a.value - b.value);

    // Add a "Total" category at the end
    const total = data.reduce((sum: number, item: unknown) => sum + item.value, 0);
    data.push({ category: 'Total', value: total });

    // Calculate running total for the waterfall effect
    const runningTotal = 0;
    const waterfallData = data.map((item: unknown, index: number) => {
      const isTotal = index === data.length - 1;
      const result = {
        category: item.category,
        value: isTotal ? total : item.value,
        start: isTotal ? 0 : runningTotal,
        end: isTotal ? total : runningTotal + item.value,
        isTotal
      };
      
      if (!isTotal) {
        runningTotal += item.value;
      }
      
      return result;
    });

    // Prepare data for Chart.js
    const labels = waterfallData.map((item: unknown) => item.category);
    
    // Generate colors based on positive/negative values or total
    const backgroundColor = waterfallData.map((item: unknown) => {
      if (item.isTotal) return 'rgba(16, 185, 129, 0.8)'; // Emerald for total
      return item.value >= 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)'; // Blue for positive, Red for negative
    });
    
    const borderColor = waterfallData.map((item: unknown) => {
      if (item.isTotal) return 'rgba(16, 185, 129, 1)'; // Emerald for total
      return item.value >= 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(239, 68, 68, 1)'; // Blue for positive, Red for negative
    });

    setChartData({
      labels,
      datasets: [
        {
          label: 'Waterfall',
          data: waterfallData.map((item: unknown) => item.isTotal ? item.value : item.value),
          backgroundColor,
          borderColor,
          borderWidth: 2,
          borderRadius: 4,
          // Custom properties for the waterfall plugin
          start: waterfallData.map((item: unknown) => item.start),
          isTotal: waterfallData.map((item: unknown) => item.isTotal),
        },
      ],
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-96">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="text-gray-600 font-medium">Loading Smart Analysis...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex justify-center items-center mb-6">
              <CpuChipIcon className="h-12 w-12 text-blue-600 mr-3" />
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Smart Data Analyser</h1>
                <p className="text-lg text-gray-600 mt-2">Powered by <span className="font-semibold text-blue-600">AI Agents & Deep Learning</span></p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <ChartBarIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Waterfall Chart Analysis</h2>
              <p className="text-gray-600 mb-6">Visualize cumulative effects and sequential data transformations with advanced AI-powered insights</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-blue-50 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <ChartBarIcon className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">No Datasets Found</h3>
              <p className="text-gray-600 mb-8">Upload your first dataset to unlock powerful AI-driven analytics and multi-dimensional data exploration</p>
              <Link 
                href="/dashboard/upload"
                className="inline-flex items-center px-6 py-3 border-2 border-blue-600 text-base font-semibold rounded-xl text-blue-600 bg-white hover:bg-blue-600 hover:text-white transition-all duration-200 transform hover:scale-105"
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Link 
                href={`/dashboard/data-table?id=${currentDataset?._id}`}
                className="mr-6 p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center">
                <CpuChipIcon className="h-10 w-10 text-blue-600 mr-4" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Smart Data Analyser</h1>
                  <p className="text-gray-600 mt-1">Powered by <span className="font-semibold text-blue-600">AI Agents & Deep Learning</span></p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Waterfall Chart Analysis</h2>
                <p className="text-gray-600 mt-1">Multi-dimensional analysis of cumulative effects and sequential transformations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Controls Section */}
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-800">
                  Select Dataset
                </label>
                <select
                  id="dataset-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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

              <div className="space-y-2">
                <label htmlFor="category-select" className="block text-sm font-semibold text-gray-800">
                  Category Column
                </label>
                <select
                  id="category-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'text').map((column: unknown) => (
                    <option key={column.name} value={column.name}>
                      {column.name} (text)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="value-select" className="block text-sm font-semibold text-gray-800">
                  Value Column (Numeric)
                </label>
                <select
                  id="value-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                >
                  <option value="">Select Value</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                    <option key={column.name} value={column.name}>
                      {column.name} (numeric)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex">
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
                    <h3 className="text-lg font-semibold text-gray-900">
                      AI-Powered Waterfall Analysis
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Deep learning insights: {selectedValue} distribution across {selectedCategory}
                    </p>
                  </div>
                  <div className="bg-blue-50 px-4 py-2 rounded-xl">
                    <span className="text-sm font-medium text-blue-800">
                      {chartData.labels.length - 1} Data Points + Total
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="h-96">
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
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                              label: (context) => {
                                const index = context.dataIndex;
                                const dataset = context.dataset;
                                const isTotal = (dataset as any).isTotal[index];
                                const value = context.parsed.y;
                                
                                if (isTotal) {
                                  return `Total: ${value.toLocaleString()}`;
                                } else {
                                  const start = (dataset as any).start[index];
                                  return [
                                    `Value: ${value.toLocaleString()}`,
                                    `Start: ${start.toLocaleString()}`,
                                    `End: ${(start + value).toLocaleString()}`
                                  ];
                                }
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: selectedValue,
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151'
                            },
                            ticks: {
                              color: '#6B7280',
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              color: '#E5E7EB'
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: selectedCategory,
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#374151'
                            },
                            ticks: {
                              color: '#6B7280',
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* AI Insights Panel */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-start">
                    <CpuChipIcon className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-2">AI Analysis Summary</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        The waterfall analysis reveals sequential data transformations across {chartData.labels.length - 1} categories. 
                        AI-powered pattern recognition identifies positive contributions (blue bars), negative impacts (red bars), 
                        and cumulative effects leading to the final total (green bar). This multi-dimensional view enables 
                        deep insights into data flow and contribution analysis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gray-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <ChartBarIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Analysis</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {!selectedCategory || !selectedValue
                    ? 'Select both Category and Value columns to generate your AI-powered waterfall analysis'
                    : 'No valid data available for the selected columns. Please choose different columns or check your dataset.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}