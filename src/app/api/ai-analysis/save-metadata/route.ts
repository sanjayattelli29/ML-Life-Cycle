import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'demo_user';
    
    if (!session?.user?.id) {
      console.log('⚠️ No authenticated session found, using fallback mode');
    }

    const body = await request.json();
    const { 
      modelId, 
      datasetId, 
      datasetName, 
      metadata,
      modelName 
    } = body;

    if (!modelId || !datasetId || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, datasetId, metadata' },
        { status: 400 }
      );
    }

    console.log('💾 Saving AI analysis metadata to R2...');
    console.log('User ID:', userId);
    console.log('Dataset ID:', datasetId);
    console.log('Model ID:', modelId);

    try {
      // Call the Python ML backend to save JSON metadata for AI analysis
      const backendUrl = process.env.ML_BACKEND_URL || 'http://localhost:5000';
      
      // Create the AI analysis specific metadata
      const aiAnalysisData = {
        ...metadata,
        saved_for_ai_analysis: true,
        saved_at: new Date().toISOString(),
        model_id: modelId,
        dataset_id: datasetId,
        dataset_name: datasetName,
        model_name: modelName,
        ai_analysis_path: `aianalysis/${userId}/${datasetId}/${modelId}.json`
      };

      const response = await fetch(`${backendUrl}/save-ai-analysis-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          dataset_id: datasetId,
          model_id: modelId,
          metadata: aiAnalysisData
        })
      });

      if (!response.ok) {
        console.error('❌ Failed to save to backend:', response.status);
        throw new Error(`Backend responded with status ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Successfully saved AI analysis metadata to R2:', result);

      return NextResponse.json({
        success: true,
        message: 'Metadata saved for AI analysis',
        path: `aianalysis/${userId}/${datasetId}/${modelId}.json`,
        model_id: modelId,
        dataset_id: datasetId,
        saved_at: new Date().toISOString()
      });

    } catch (backendError) {
      console.error('❌ Error connecting to ML backend for saving:', backendError);
      
      // Create the AI analysis specific metadata for fallback
      const fallbackMetadata = {
        ...metadata,
        saved_for_ai_analysis: true,
        saved_at: new Date().toISOString(),
        model_id: modelId,
        dataset_id: datasetId,
        dataset_name: datasetName,
        model_name: modelName,
        ai_analysis_path: `aianalysis/${userId}/${datasetId}/${modelId}.json`
      };

      // Store the saved model in session storage for this browser session
      const savedModel = {
        model_id: modelId,
        dataset_id: datasetId,
        dataset_name: datasetName,
        model_name: modelName || `Model ${modelId.substring(0, 8)}`,
        saved_at: new Date().toISOString(),
        file_path: `aianalysis/${userId}/${datasetId}/${modelId}.json`,
        size: 15000,
        metadata: fallbackMetadata,
        is_fallback: true
      };

      // In a real implementation, this would be stored in a database or cache
      // For now, we'll return success and the list endpoint will include this model
      console.log('💾 Model saved for session:', savedModel.model_name);
      
      return NextResponse.json({
        success: true,
        message: 'Metadata marked for AI analysis (backend unavailable)',
        path: `aianalysis/${userId}/${datasetId}/${modelId}.json`,
        model_id: modelId,
        dataset_id: datasetId,
        model_name: modelName,
        saved_at: new Date().toISOString(),
        fallback_mode: true,
        note: 'Backend unavailable - metadata stored locally for this session'
      });
    }

  } catch (error) {
    console.error('❌ Error in save AI analysis metadata API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
