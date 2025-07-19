import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PreprocessingContext } from '../context/PreprocessingContext';

interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, string | number>[];
}

interface BasePreprocessingPageProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function BasePreprocessingPage({ title, description, children }: BasePreprocessingPageProps) {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('datasetId');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processedData, setProcessedData] = useState<Dataset | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Create a context value object to pass to children
  const contextValue = {
    dataset,
    setProcessedData,
    setProcessingStatus,
    setIsProcessing,
  };

  useEffect(() => {
    const fetchDataset = async () => {
      if (!datasetId) {
        setError('No dataset selected');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/datasets/${datasetId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dataset');
        }
        const data = await response.json();
        setDataset(data);
      } catch (error) {
        console.error('Error fetching dataset:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch dataset');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataset();
  }, [datasetId]);

  const downloadProcessedData = () => {
    if (!processedData) return;

    const headers = processedData.columns.map(col => col.name).join(',');
    const rows = processedData.data.map(row => 
      processedData.columns.map(col => row[col.name]).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_${dataset?.name || 'dataset'}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error || 'Dataset not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <PreprocessingContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>

          {isProcessing && processingStatus && (
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-blue-700">{processingStatus}</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {children}
          </div>

          {processedData && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Processed Data Preview</h2>
                <button
                  onClick={downloadProcessedData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Download CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {processedData.columns.map((column) => (
                        <th
                          key={column.name}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {column.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedData.data.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {processedData.columns.map((column) => (
                          <td
                            key={column.name}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {row[column.name]?.toString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PreprocessingContext.Provider>
  );
}
