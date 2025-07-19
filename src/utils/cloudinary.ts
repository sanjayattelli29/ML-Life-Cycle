/**
 * Cloudinary utility functions for uploading and managing images
 */

// Function to upload a base64 image to Cloudinary
export async function uploadToCloudinary(base64Image: string, folder: string = 'data-viz'): Promise<{url: string, publicId: string}> {
  try {
    // Remove the data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Create a unique public_id for the image
    const publicId = `${folder}/${Date.now()}`;
    
    // Prepare the form data for Cloudinary upload
    const formData = new FormData();
    formData.append('file', `data:image/png;base64,${base64Data}`);
    formData.append('upload_preset', 'ml_default'); // Default unsigned preset
    formData.append('public_id', publicId);
    
    // Upload to Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/dws3beqwu/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.secure_url) {
      return {
        url: data.secure_url,
        publicId: data.public_id,
      };
    } else {
      throw new Error('Failed to upload image to Cloudinary');
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

// Function to delete an image from Cloudinary
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    // For security reasons, we&apos;ll use a server API route to delete the image
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
}

// Function to capture a chart as a base64 image
export function captureChartAsImage(chartRef: React.RefObject<HTMLCanvasElement>): string | null {
  try {
    if (!chartRef.current) return null;
    return chartRef.current.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing chart as image:', error);
    return null;
  }
}
