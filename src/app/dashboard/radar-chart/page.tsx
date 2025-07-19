'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function RadarChart() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<any[]>([]);
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
              
              // Set default category and metrics based on column types
              const categoryColumn = selectedDataset.columns.find((col: unknown) => col.type === 'text');
              const numericColumns = selectedDataset.columns.filter((col: unknown) => col.type === 'numeric');
              
              setAvailableMetrics(numericColumns);
              
              if (categoryColumn) setSelectedCategory(categoryColumn.name);
              if (numericColumns.length > 0) {
                // Select up to 5 metrics by default
                setSelectedMetrics(numericColumns.slice(0, 5).map((col: unknown) => col.name));
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
    if (currentDataset) {
      // Update available metrics when dataset changes
      const numericColumns = currentDataset.columns.filter((col: unknown) => col.type === 'numeric');
      setAvailableMetrics(numericColumns);
      
      // Set default category based on column types
      const categoryColumn = currentDataset.columns.find((col: unknown) => col.type === 'text');
      if (categoryColumn) setSelectedCategory(categoryColumn.name);
      
      // Select up to 5 metrics by default
      if (numericColumns.length > 0) {
        setSelectedMetrics(numericColumns.slice(0, 5).map((col: unknown) => col.name));
      }
    }
  }, [currentDataset]);

  useEffect(() => {
    if (currentDataset && selectedCategory && selectedMetrics.length > 0) {
      generateChartData();
    }
  }, [currentDataset, selectedCategory, selectedMetrics]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
    }
  };

  const handleMetricToggle = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedCategory || selectedMetrics.length === 0) return;

    // Get unique categories
    const uniqueCategories = [...new Set(currentDataset.data.map((item: unknown) => item[selectedCategory]))];
    
    if (uniqueCategories.length === 0) {
      setError('No valid categories found in the selected column');
      setChartData(null);
      return;
    }

    // Generate random colors for each category
    const colors = uniqueCategories.map(() => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 1)`,
      };
    });

    // Calculate average values for each category and metric
    const datasets = uniqueCategories.map((category, index) => {
      const categoryData = currentDataset.data.filter((item: unknown) => item[selectedCategory] === category);
      
      const data = selectedMetrics.map(metric => {
        const values = categoryData
          .map((item: unknown) => parseFloat(item[metric]))
          .filter((value: number) => !isNaN(value));
        
        // Calculate average or return 0 if no valid values
        return values.length > 0 
          ? values.reduce((sum: number, val: number) => sum + val, 0) / values.length
          : 0;
      });

      return {
        label: category,
        data,
        backgroundColor: colors[index].backgroundColor,
        borderColor: colors[index].borderColor,
        borderWidth: 1,
      };
    });

    setChartData({
      labels: selectedMetrics,
      datasets,
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="text-gray-700 font-medium">Loading Smart Analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Smart Data Analyser
            </h1>
            <p className="text-lg text-gray-700">
              Powered by <span className="font-semibold text-blue-600">AI Agents</span> & <span className="font-semibold text-purple-600">Deep Learning</span>
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Datasets Found</h3>
              <p className="text-gray-600 mb-6">Upload your first dataset to unlock AI-powered multi-dimensional analysis</p>
            </div>
            <Link 
              href="/dashboard/upload"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              Upload Dataset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link 
              href={`/dashboard/data-table?id=${currentDataset?._id}`}
              className="mr-4 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
            >
              <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Multi-Dimensional Radar Analysis
              </h1>
              <p className="text-lg text-gray-700">
                AI-powered comparative analysis across multiple metrics • 
                <span className="font-semibold text-blue-600 ml-1">Smart Data Analyser</span>
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Deep Learning Insights:</span> Visualize complex relationships between multiple variables simultaneously using advanced radar visualization techniques.
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuration Panel</h2>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-800">
                  Dataset Selection
                </label>
                <select
                  id="dataset-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                  Category Dimension
                </label>
                <select
                  id="category-select"
                  className="w-full px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {currentDataset?.columns?.filter((column: unknown) => column.type === 'text').map((column: unknown) => (
                    <option key={column.name} value={column.name}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-8">
              <label className="block text-sm font-semibold text-gray-800 mb-4">
                Metric Dimensions <span className="text-gray-600 font-normal">(Select multiple for comprehensive analysis)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {availableMetrics.map((metric) => (
                  <div key={metric.name} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200">
                    <input
                      id={`metric-${metric.name}`}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedMetrics.includes(metric.name)}
                      onChange={() => handleMetricToggle(metric.name)}
                    />
                    <label htmlFor={`metric-${metric.name}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                      {metric.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-white">
            {chartData ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    AI-Generated Radar Analysis
                  </h3>
                  <p className="text-gray-600">
                    Multi-dimensional comparison of <span className="font-semibold text-blue-600">{selectedMetrics.length} metrics</span> across <span className="font-semibold text-purple-600">{selectedCategory}</span> categories
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                  <div className="h-96 lg:h-[500px]">
                    <Radar 
                      data={chartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              padding: 20,
                              font: {
                                size: 12,
                                weight: 'bold'
                              },
                              color: '#374151'
                            }
                          },
                          title: {
                            display: true,
                            text: `Deep Learning Analysis: ${selectedCategory} Performance Matrix`,
                            font: {
                              size: 16,
                              weight: 'bold'
                            },
                            color: '#111827',
                            padding: {
                              bottom: 20
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#111827',
                            bodyColor: '#374151',
                            borderColor: '#D1D5DB',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12
                          }
                        },
                        scales: {
                          r: {
                            beginAtZero: true,
                            grid: {
                              color: '#E5E7EB'
                            },
                            angleLines: {
                              color: '#D1D5DB'
                            },
                            pointLabels: {
                              font: {
                                size: 12,
                                weight: 'bold'
                              },
                              color: '#374151'
                            },
                            ticks: {
                              color: '#6B7280',
                              font: {
                                size: 10
                              }
                            }
                          }
                        },
                        elements: {
                          line: {
                            borderWidth: 2
                          },
                          point: {
                            radius: 4,
                            hoverRadius: 6
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">AI Analysis Insights</h4>
                      <p className="text-sm text-gray-700">
                        This radar chart reveals performance patterns across {selectedMetrics.length} key metrics. 
                        Larger areas indicate higher overall performance, while shape variations highlight specific strengths and opportunities for improvement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Configure Analysis Parameters</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {!selectedCategory
                    ? 'Select a category dimension to group your data for comparative analysis'
                    : selectedMetrics.length === 0
                      ? 'Choose at least one metric dimension to generate your AI-powered radar visualization'
                      : 'No data available for the selected configuration - try adjusting your parameters'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}