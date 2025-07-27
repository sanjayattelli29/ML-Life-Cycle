import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datasetName = searchParams.get('datasetName');

    if (!datasetName) {
      return NextResponse.json(
        { error: 'Dataset name is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    
    // Since we can't directly list R2 objects from the frontend, we'll try common model ID patterns
    // This is a workaround until we can implement proper R2 listing
    const possibleModelPatterns = [
      // Common timestamp-based patterns
      `model_${Date.now()}`,
      `${datasetName}_model`,
      `model_${datasetName}`,
      `${datasetName}_trained`,
      `latest_${datasetName}`,
      datasetName,
      // Try last few days worth of timestamps (rough estimate)
      ...Array.from({ length: 7 }, (_, i) => {
        const timestamp = Date.now() - (i * 24 * 60 * 60 * 1000);
        return `model_${timestamp}`;
      }),
      // Try some common auto-generated patterns
      `auto_${datasetName}`,
      `trained_${datasetName}`,
      `${datasetName}_auto`,
      `${datasetName}_latest`
    ];

    const foundModels = [];

    // Try to find existing models by checking their metadata URLs
    for (const modelId of possibleModelPatterns) {
      try {
        const metadataUrl = `https://my-datasets.r2.cloudflarestorage.com/models/${userId}/${datasetName}/${modelId}_metadata.json`;
        
        const response = await fetch(metadataUrl);
        if (response.ok) {
          const metadata = await response.json();
          foundModels.push({
            model_id: modelId,
            model_name: metadata.model_name || 'Unknown',
            task_type: metadata.task_type || 'Unknown',
            created_at: metadata.created_at || new Date().toISOString(),
            metadataUrl
          });
        }
      } catch {
        // Continue searching - this is expected for non-existent models
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      models: foundModels,
      datasetName,
      userId
    });

  } catch (error) {
    console.error('Error listing models:', error);
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: 500 }
    );
  }
}
