import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    console.log('=== Model-Training Datasets Fetch API Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching model-training datasets for user:', session.user.id);

    // List objects in model-training/{userId}/ folder
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: `model-training/${session.user.id}/`,
      Delimiter: '/'
    });

    const result = await s3Client.send(listCommand);
    console.log('R2 list result:', {
      KeyCount: result.KeyCount,
      Objects: result.Contents?.length || 0
    });

    if (!result.Contents || result.Contents.length === 0) {
      console.log('No model-training datasets found for user');
      return NextResponse.json({ 
        datasets: [],
        message: 'No model-training datasets found'
      });
    }

    // Filter for CSV files only
    const csvFiles = result.Contents.filter(obj => 
      obj.Key && obj.Key.endsWith('.csv')
    );

    console.log('Found CSV files:', csvFiles.length);

    const datasets = [];

    // Process each CSV file and try to get its metadata
    for (const file of csvFiles) {
      if (!file.Key) continue;

      console.log('Processing file:', file.Key);

      try {
        // Try to get metadata file
        const metadataKey = file.Key
          .replace('model-training/', 'metadata/model-training/')
          .replace('.csv', '.json');

        console.log('Looking for metadata at:', metadataKey);

        const metadataCommand = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: metadataKey
        });

        const metadataResult = await s3Client.send(metadataCommand);
        const metadataText = await metadataResult.Body?.transformToString();
        
        if (metadataText) {
          const metadata = JSON.parse(metadataText);
          console.log('Found metadata for:', file.Key);
          datasets.push(metadata);
        } else {
          throw new Error('No metadata content');
        }

      } catch {
        // If metadata not found, create basic dataset info from file info
        console.log('No metadata found for', file.Key, '- creating basic info');
        
        const fileName = file.Key.split('/').pop() || '';
        const nameWithoutExt = fileName.replace('.csv', '');
        const publicUrl = `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${file.Key}`;

        const basicDataset = {
          id: `model_${nameWithoutExt}_${file.LastModified?.getTime() || Date.now()}`,
          originalDatasetName: nameWithoutExt,
          transformedName: nameWithoutExt,
          fileName: fileName,
          url: publicUrl,
          fileSize: file.Size || 0,
          rowCount: null,
          columnCount: null,
          processingSteps: ['feature_importance_analysis', 'model_training_ready'],
          uploadedAt: file.LastModified?.toISOString() || new Date().toISOString(),
          datasetType: 'model-training',
          uploadedBy: session.user.id,
          selectedFeatures: [],
          targetColumn: '',
          analysisMetadata: {}
        };

        datasets.push(basicDataset);
      }
    }

    // Sort datasets by upload date (newest first)
    datasets.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    console.log('Returning model-training datasets:', datasets.length);
    console.log('=== Model-Training Datasets Fetch Complete ===');

    return NextResponse.json({
      datasets,
      count: datasets.length,
      message: `Found ${datasets.length} model-training dataset(s)`
    });

  } catch (error) {
    console.error('Error fetching model-training datasets:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch model-training datasets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
