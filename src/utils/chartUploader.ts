/**
 * Utility functions for capturing chart images and uploading them to Cloudinary
 */
import { uploadToCloudinary } from './cloudinary';

/**
 * Captures a chart as an image and uploads it to Cloudinary
 * 
 * @param chartRef - React ref to the chart canvas element
 * @param chartType - Type of chart (e.g., 'bar-chart', 'pie-chart')
 * @param userId - User ID for organizing uploads
 * @returns Object containing the Cloudinary URL and public ID
 */
export async function captureAndUploadChart(
  chartRef: React.RefObject<HTMLCanvasElement>,
  chartType: string,
  userId: string
): Promise<{ url: string; publicId: string } | null> {
  try {
    // Ensure chart ref exists
    if (!chartRef.current) {
      console.error('Chart reference is not available');
      return null;
    }

    // Capture chart as base64 image
    const base64Image = chartRef.current.toDataURL('image/png');
    
    // Create folder path with user ID for organization
    const folder = `data-viz/${userId}/${chartType}`;
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(base64Image, folder);
    
    return result;
  } catch (error) {
    console.error('Error capturing and uploading chart:', error);
    return null;
  }
}

/**
 * Saves all chart data and metrics to the database
 * 
 * @param userId - User ID
 * @param datasetId - Dataset ID
 * @param datasetName - Dataset name
 * @param metrics - Calculated metrics
 * @param graphUrls - Array of uploaded graph URLs and their types
 * @returns Success status and message
 */
export async function saveUploadHistory(
  userId: string,
  datasetId: string,
  datasetName: string,
  metrics: Record<string, any>,
  graphUrls: Array<{ type: string; url: string; publicId: string }>
): Promise<{ success: boolean; message: string; historyId?: string }> {
  try {
    // Validate inputs
    if (!userId || !datasetId || !datasetName || !metrics || !graphUrls || graphUrls.length === 0) {
      return { success: false, message: 'Missing required data for saving upload history' };
    }
    
    // Save to database via API
    const response = await fetch('/api/upload-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        datasetId,
        datasetName,
        metrics,
        graphUrls,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { 
        success: true, 
        message: 'Upload history saved successfully',
        historyId: data.historyId
      };
    } else {
      return { 
        success: false, 
        message: data.error || 'Failed to save upload history'
      };
    }
  } catch (error) {
    console.error('Error saving upload history:', error);
    return { 
      success: false, 
      message: 'An error occurred while saving upload history'
    };
  }
}
