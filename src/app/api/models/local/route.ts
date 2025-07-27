import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

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
    
    // Check local saved models first
    const savedModelsPath = path.join(process.cwd(), 'src', 'python-codes', 'ml_backend', 'saved_models');
    
    if (!fs.existsSync(savedModelsPath)) {
      return NextResponse.json({
        success: true,
        models: [],
        source: 'local',
        message: 'No saved models directory found'
      });
    }

    const foundModels = [];
    const files = fs.readdirSync(savedModelsPath);
    const metadataFiles = files.filter(file => file.endsWith('_metadata.json'));

    for (const metadataFile of metadataFiles) {
      try {
        const metadataPath = path.join(savedModelsPath, metadataFile);
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        // Check if this model matches the dataset and user
        if (metadata.dataset_name === datasetName && metadata.user_id === userId) {
          foundModels.push({
            model_id: metadata.model_id,
            model_name: metadata.model_name || 'Unknown',
            task_type: metadata.task_type || 'Unknown',
            created_at: metadata.created_at || new Date().toISOString(),
            r2_model_path: metadata.r2_model_path,
            r2_metadata_path: metadata.r2_metadata_path,
            source: 'local',
            metadataPath: metadataPath
          });
        }
      } catch (error) {
        // Skip invalid metadata files
        console.warn('Invalid metadata file:', metadataFile, error);
        continue;
      }
    }

    // Sort by creation date (most recent first)
    foundModels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      models: foundModels,
      datasetName,
      userId,
      source: 'local'
    });

  } catch (error) {
    console.error('Error listing local models:', error);
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: 500 }
    );
  }
}
