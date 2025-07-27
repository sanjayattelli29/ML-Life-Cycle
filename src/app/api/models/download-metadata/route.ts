import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const datasetName = searchParams.get('datasetName');
    
    // Use session user ID if available, otherwise use a default for development
    const userId = session?.user?.id || 'demo_user';
    
    if (!session?.user?.id) {
      console.log('⚠️ No authenticated session found, using fallback mode');
    }

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    console.log('📥 Downloading model metadata from R2 via backend...');
    console.log('User ID:', userId);
    console.log('Model ID:', modelId);
    console.log('Dataset:', datasetName);

    try {
      // Call the Python ML backend to download metadata from R2
      const backendUrl = process.env.ML_BACKEND_URL || 'http://localhost:5000';
      const metadataPath = datasetName 
        ? `models/${userId}/${datasetName}/${modelId}_metadata.json`
        : `models/${userId}/${modelId}_metadata.json`;
      
      const downloadUrl = `${backendUrl}/download-r2-metadata?user_id=${userId}&model_id=${modelId}${datasetName ? `&dataset_name=${encodeURIComponent(datasetName)}` : ''}`;
      
      console.log('🔗 Backend download URL:', downloadUrl);
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to download metadata from backend:', response.status);
        throw new Error(`Backend responded with status ${response.status}`);
      }

      const metadata = await response.json();
      console.log('✅ Successfully downloaded metadata from R2 via backend');

      // Return the metadata directly
      return NextResponse.json({
        success: true,
        model_id: modelId,
        dataset_name: datasetName,
        metadata: metadata,
        downloaded_from: 'r2_cloud_storage',
        download_path: metadataPath
      });

    } catch (backendError) {
      console.error('❌ Error connecting to ML backend for metadata download:', backendError);
      
      // Fallback: Try to download directly from R2 using the public URL
      console.log('🔄 Attempting direct R2 download as fallback...');
      
      try {
        const directR2Url = datasetName 
          ? `https://my-datasets.r2.cloudflarestorage.com/models/${userId}/${datasetName}/${modelId}_metadata.json`
          : `https://my-datasets.r2.cloudflarestorage.com/models/${userId}/${modelId}_metadata.json`;
        
        console.log('🔗 Direct R2 URL:', directR2Url);
        
        const directResponse = await fetch(directR2Url);
        
        if (!directResponse.ok) {
          throw new Error(`Direct R2 access failed with status ${directResponse.status}`);
        }
        
        const metadata = await directResponse.json();
        console.log('✅ Successfully downloaded metadata directly from R2');
        
        return NextResponse.json({
          success: true,
          model_id: modelId,
          dataset_name: datasetName,
          metadata: metadata,
          downloaded_from: 'r2_direct_access',
          download_path: directR2Url,
          fallback_mode: true
        });
        
      } catch (directError) {
        console.error('❌ Direct R2 access also failed:', directError);
        
        return NextResponse.json(
          { 
            error: 'Failed to download metadata from both backend and direct R2 access',
            details: 'The backend service is unavailable and direct R2 access failed. Please ensure the model metadata exists in R2 storage.',
            model_id: modelId,
            dataset_name: datasetName,
            backend_error: backendError instanceof Error ? backendError.message : 'Unknown backend error',
            direct_error: directError instanceof Error ? directError.message : 'Unknown direct access error'
          },
          { status: 503 }
        );
      }
    }

  } catch (error) {
    console.error('❌ Error in metadata download API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
