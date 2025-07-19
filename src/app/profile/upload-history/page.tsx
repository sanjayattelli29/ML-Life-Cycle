'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  EyeIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { CldImage } from 'next-cloudinary';

interface UploadHistoryItem {
  _id: string;
  datasetId: string;
  datasetName: string;
  metrics: Record<string, any>;
  graphUrls: Array<{
    type: string;
    url: string;
    publicId: string;
  }>;
  createdAt: string;
}

export default function UploadHistoryPage() {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UploadHistoryItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchUploadHistory(session.user.id);
    } else if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status, session]);

  const fetchUploadHistory = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/upload-history?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.history || []);
      } else {
        console.error('Failed to fetch upload history:', data.error);
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewItem = (item: UploadHistoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/upload-history/${itemToDelete}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the deleted item from the state
        setHistory(history.filter(item => item._id !== itemToDelete));
        setShowDeleteModal(false);
        setItemToDelete(null);
      } else {
        console.error('Failed to delete upload history:', data.error);
      }
    } catch (error) {
      console.error('Error deleting upload history:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Please sign in to view your upload history</h1>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          onClick={() => window.location.href = '/api/auth/signin'}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Previous Upload History</h1>
          <p className="text-gray-500">View and manage your previous data uploads</p>
        </div>
        <Link href="/profile" className="text-blue-500 hover:underline flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Profile
        </Link>
      </div>

      {selectedItem ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{selectedItem.datasetName}</h2>
            <button 
              onClick={handleCloseDetails}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center text-gray-500 mb-2">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
              <ClockIcon className="h-4 w-4 ml-4 mr-2" />
              <span>{new Date(selectedItem.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(selectedItem.metrics).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm">{key.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Visualizations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedItem.graphUrls.map((graph, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm mb-2">{graph.type}</p>
                  <CldImage
                    src={graph.publicId}
                    width="400"
                    height="300"
                    alt={`${graph.type} visualization`}
                    className="rounded-md"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {history.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Upload History Found</h2>
              <p className="text-gray-500 mb-6">You haven&apos;t uploaded any datasets yet.</p>
              <Link
                href="/dashboard/upload"
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Upload Your First Dataset
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dataset Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.datasetName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.metrics.Data_Quality_Score || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewItem(item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this upload history? This will permanently remove all associated graphs and metrics.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
