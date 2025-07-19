'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { captureAndUploadChart, saveUploadHistory } from '@/utils/chartUploader';
import { CpuChipIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/solid';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Add interfaces at the top of the file after imports
interface Column {
  name: string;
  type: 'text' | 'numeric' | 'date';
}

interface DataItem {
  [key: string]: string | number;
}

interface Dataset {
  _id: string;
  name: string;
  columns: Column[];
  data: DataItem[];
}

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  tension?: number;
  fill?: boolean;
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  pointBorderWidth?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  pointHoverBackgroundColor?: string;
  pointHoverBorderColor?: string;
  pointHoverBorderWidth?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export default function BarCharts() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  const { data: session } = useSession();
  const chartRef = useRef<ChartJS<'bar'>>(null);
  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [selectedXAxis, setSelectedXAxis] = useState<string>('');
  const [selectedYAxis, setSelectedYAxis] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/datasets');
        if (response.ok) {
          const data = await response.json() as Dataset[];
          setDatasets(data);
          
          if (datasetId && data.length > 0) {
            const selectedDataset = data.find((d) => d._id === datasetId);
            if (selectedDataset) {
              setCurrentDataset(selectedDataset);
              
              const textColumn = selectedDataset.columns.find((col) => col.type === 'text');
              const numericColumn = selectedDataset.columns.find((col) => col.type === 'numeric');
              
              if (textColumn) setSelectedXAxis(textColumn.name);
              if (numericColumn) setSelectedYAxis(numericColumn.name);
            } else {
              setCurrentDataset(data[0]);
            }
          } else if (data.length > 0) {
            setCurrentDataset(data[0]);
          }
        } else {
          throw new Error('Failed to fetch datasets');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred while fetching datasets');
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
      const textColumn = selected.columns.find((col) => col.type === 'text');
      const numericColumn = selected.columns.find((col) => col.type === 'numeric');
      
      if (textColumn) setSelectedXAxis(textColumn.name);
      if (numericColumn) setSelectedYAxis(numericColumn.name);
    }
  };

  const saveChart = async () => {
    if (!session?.user?.id || !currentDataset || !chartData) {
      setError('You must be logged in and have a chart generated to save it');
      return;
    }

    try {
      setIsSaving(true);
      setSavedToCloud(false);
      
      // Create a canvas element from the chart
      const canvas = chartRef.current?.canvas;
      if (!canvas) {
        throw new Error('Chart canvas not found');
      }
      
      // Upload chart to Cloudinary
      const uploadResult = await captureAndUploadChart(
        { current: canvas },
        'bar-chart',
        session.user.id
      );
      
      if (!uploadResult) {
        throw new Error('Failed to upload chart to Cloudinary');
      }
      
      // Calculate basic metrics for the dataset
      const metrics = {
        Dataset_Size: currentDataset.data.length,
        Column_Count: currentDataset.columns.length,
        Numeric_Columns: currentDataset.columns.filter((col) => col.type === 'numeric').length,
        Text_Columns: currentDataset.columns.filter((col) => col.type === 'text').length,
        Date_Created: new Date().toISOString(),
        Chart_Type: 'Bar Chart',
        X_Axis: selectedXAxis,
        Y_Axis: selectedYAxis
      };
      
      // Save to database
      const saveResult = await saveUploadHistory(
        session.user.id,
        currentDataset._id,
        currentDataset.name,
        metrics,
        [{
          type: 'bar-chart',
          url: uploadResult.url,
          publicId: uploadResult.publicId
        }]
      );
      
      if (saveResult.success) {
        setSavedToCloud(true);
      } else {
        throw new Error(saveResult.message);
      }
    } catch (error) {
      console.error('Error saving chart:', error);
      setError(error instanceof Error ? error.message : 'Failed to save chart');
    } finally {
      setIsSaving(false);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedXAxis || !selectedYAxis) return;

    const yAxisColumn = currentDataset.columns.find((col) => col.name === selectedYAxis);

    if (yAxisColumn?.type !== 'numeric') {
      setError('Y-axis must be a numeric column for bar charts');
      setChartData(null);
      return;
    }

    // Group data by X-axis values and calculate aggregate Y-axis values
    const groupedData: Record<string, number[]> = {};
    
    currentDataset.data.forEach((item) => {
      const xValue = String(item[selectedXAxis] || 'Undefined');
      const yValue = Number(item[selectedYAxis]);
      
      if (!isNaN(yValue)) {
        if (!groupedData[xValue]) {
          groupedData[xValue] = [];
        }
        groupedData[xValue].push(yValue);
      }
    });

    // Calculate average for each group
    const labels = Object.keys(groupedData);
    const data = labels.map(label => {
      const values = groupedData[label];
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    // Enhanced gradient colors for better visual appeal
    const gradientColors = [
      { bg: 'rgba(99, 102, 241, 0.6)', border: 'rgba(99, 102, 241, 1)' }, // Indigo
      { bg: 'rgba(16, 185, 129, 0.6)', border: 'rgba(16, 185, 129, 1)' }, // Emerald
      { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgba(239, 68, 68, 1)' },   // Red
      { bg: 'rgba(245, 158, 11, 0.6)', border: 'rgba(245, 158, 11, 1)' }, // Amber
      { bg: 'rgba(168, 85, 247, 0.6)', border: 'rgba(168, 85, 247, 1)' }, // Purple
    ];
    
    const randomColor = gradientColors[Math.floor(Math.random() * gradientColors.length)];

    setChartData({
      labels,
      datasets: [
        {
          label: `${selectedYAxis} by ${selectedXAxis}`,
          data,
          backgroundColor: randomColor.bg,
          borderColor: randomColor.border,
          borderWidth: 2,
          tension: 0.1
        },
      ],
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
              <CpuChipIcon className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-4 text-slate-600 font-medium">Analyzing your data...</p>
            <p className="text-sm text-slate-500">AI agents are processing the dataset</p>
          </div>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Smart Data Analyser
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-lg text-slate-600">Powered by</span>
              <CpuChipIcon className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-700">AI Agents</span>
              <span className="text-slate-600">&</span>
              <SparklesIcon className="h-5 w-5 text-indigo-600" />
              <span className="font-semibold text-indigo-700">Deep Learning</span>
            </div>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Advanced Bar Chart Visualization - Analyze categorical relationships and distributions with AI-powered insights
            </p>
          </div>
          
          {/* Empty State Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-3xl border border-slate-200/50 p-12 text-center">
              <div className="bg-gradient-to-r from-slate-100 to-blue-100 p-6 rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                <ChartBarIcon className="h-12 w-12 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">No Datasets Found</h3>
              <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                Upload your first dataset to unlock powerful AI-driven analysis and visualization capabilities. 
                Our deep learning algorithms will help you discover hidden patterns and insights.
              </p>
              <Link 
                href="/dashboard/upload"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200"
              >
                <SparklesIcon className="h-5 w-5" />
                Upload Dataset
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Link 
              href={`/dashboard/data-table?id=${currentDataset?._id}`}
              className="mr-6 p-3 rounded-2xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-blue-600 hover:bg-white shadow-lg border border-slate-200/50 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-900">Bar Chart Analysis</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <CpuChipIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">AI-Powered</span>
                    <span className="text-slate-500">•</span>
                    <SparklesIcon className="h-4 w-4 text-indigo-600" />
                    <span className="text-indigo-700 font-medium">Deep Learning Insights</span>
                  </div>
                </div>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed max-w-4xl">
                Discover patterns and relationships in categorical data with intelligent bar charts. Our AI agents analyze distributions, 
                identify key metrics, and provide comprehensive insights for data-driven decision making.
              </p>
            </div>
          </div>
        </div>

        {/* Main Chart Container */}
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl border border-slate-200/50 overflow-hidden">
          {/* Controls Section */}
          <div className="bg-gradient-to-r from-slate-50/50 to-blue-50/50 p-8 border-b border-slate-200/50">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Analysis Configuration</h3>
              <p className="text-slate-600">Configure your visualization parameters for optimal insights</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="dataset-select" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  📊 Dataset Selection
                </label>
                <select
                  id="dataset-select"
                  className="block w-full px-4 py-3 text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 font-medium"
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
                <label htmlFor="x-axis-select" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  📈 Categories (X-Axis)
                </label>
                <select
                  id="x-axis-select"
                  className="block w-full px-4 py-3 text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 font-medium"
                  value={selectedXAxis}
                  onChange={(e) => setSelectedXAxis(e.target.value)}
                >
                  <option value="">Choose Category Variable</option>
                  {currentDataset?.columns
                    ?.filter((col: Column) => col.type === 'text')
                    .map((col: Column) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="y-axis-select" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  📊 Values (Y-Axis)
                </label>
                <select
                  id="y-axis-select"
                  className="block w-full px-4 py-3 text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 font-medium"
                  value={selectedYAxis}
                  onChange={(e) => setSelectedYAxis(e.target.value)}
                >
                  <option value="">Choose Metric Variable</option>
                  {currentDataset?.columns
                    ?.filter((col: Column) => col.type === 'numeric')
                    .map((col: Column) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-red-800">Analysis Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart Visualization */}
          <div className="p-8">
            {chartData ? (
              <div>
                <div className="mb-6">
                  <h4 className="text-2xl font-bold text-slate-900 mb-2">
                    {selectedYAxis} distribution across {selectedXAxis}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <span>AI-Enhanced Visualization</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-indigo-600" />
                      <span>Distribution Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CpuChipIcon className="h-4 w-4 text-blue-600" />
                      <span>Pattern Recognition</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border border-slate-200/50 shadow-inner">
                  <div className="h-[500px]">
                    <Bar 
                      ref={chartRef}
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              usePointStyle: true,
                              padding: 20,
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              color: '#1e293b'
                            }
                          },
                          title: {
                            display: true,
                            text: `${selectedYAxis} by ${selectedXAxis} - AI Analysis`,
                            font: {
                              size: 18,
                              weight: 'bold'
                            },
                            color: '#0f172a',
                            padding: {
                              top: 10,
                              bottom: 30
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleColor: '#ffffff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#3b82f6',
                            borderWidth: 2,
                            cornerRadius: 12,
                            padding: 12,
                            displayColors: true,
                            usePointStyle: true
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
                                weight: 500
                              },
                              color: '#1e293b'
                            },
                            grid: {
                              color: 'rgba(148, 163, 184, 0.2)',
                            },
                            ticks: {
                              color: '#64748b',
                              font: {
                                size: 12,
                                weight: 500
                              },
                              padding: 8
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: selectedXAxis,
                              font: {
                                size: 14,
                                weight: 500
                              },
                              color: '#1e293b'
                            },
                            grid: {
                              display: false
                            },
                            ticks: {
                              color: '#64748b',
                              font: {
                                size: 12,
                                weight: 500
                              },
                              padding: 8,
                              maxRotation: 45
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* AI Insights Panel */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                      <SparklesIcon className="h-5 w-5 text-white" />
                    </div>
                    <h5 className="text-lg font-bold text-slate-900">AI-Generated Insights</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white/60 p-4 rounded-xl border border-blue-200/30">
                      <div className="font-semibold text-blue-900 mb-2">📊 Distribution Analysis</div>
                      <div className="text-slate-700">AI algorithms analyze category distributions and identify key patterns</div>
                    </div>
                    <div className="bg-white/60 p-4 rounded-xl border border-indigo-200/30">
                      <div className="font-semibold text-indigo-900 mb-2">🎯 Category Comparison</div>
                      <div className="text-slate-700">Deep learning models compare and rank categorical relationships</div>
                    </div>
                    <div className="bg-white/60 p-4 rounded-xl border border-purple-200/30">
                      <div className="font-semibold text-purple-900 mb-2">💡 Smart Recommendations</div>
                      <div className="text-slate-700">Get AI-powered suggestions for optimal data visualization</div>
                    </div>
                  </div>
                </div>

                {/* Save Chart Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={saveChart}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200"
                  >
                    <CloudArrowUpIcon className="h-5 w-5" />
                    {isSaving ? 'Saving Analysis...' : savedToCloud ? 'Analysis Saved!' : 'Save Analysis'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="bg-gradient-to-r from-slate-100 to-blue-100 p-8 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                  <ChartBarIcon className="h-16 w-16 text-slate-500" />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">Ready for Analysis</h4>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  {!selectedXAxis || !selectedYAxis
                    ? 'Select both axes to generate an AI-powered bar chart visualization with deep learning insights'
                    : 'No data available for the selected axes. Try different column combinations for optimal analysis.'}
                </p>
                {(!selectedXAxis || !selectedYAxis) && (
                  <div className="mt-8 flex items-center justify-center gap-4 text-sm text-slate-500">
                    <CpuChipIcon className="h-4 w-4" />
                    <span>AI algorithms ready to process your data</span>
                    <SparklesIcon className="h-4 w-4" />
                    <span>Deep learning models on standby</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
