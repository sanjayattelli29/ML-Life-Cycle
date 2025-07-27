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
    console.log('=== R2 Datasets API Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);

    // List all CSV files for this user
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: `transformed-datasets/${session.user.id}/`,
    });

    const response = await s3Client.send(listCommand);
    const datasets = [];

    if (response.Contents) {
      console.log(`Found ${response.Contents.length} files in R2 for user`);
      
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.csv')) {
          const fileName = object.Key.split('/').pop() || 'unknown';
          const transformedName = fileName.replace('.csv', '');
          const csvUrl = `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${object.Key}`;
          
          // Try to get metadata file if it exists
          let metadata = null;
          let originalName = 'Unknown';
          let processingSteps: string[] = [];
          
          try {
            const metadataKey = `metadata/${session.user.id}/${fileName.replace('.csv', '.json')}`;
            const metadataCommand = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME!,
              Key: metadataKey,
            });
            
            const metadataResponse = await s3Client.send(metadataCommand);
            const metadataText = await metadataResponse.Body?.transformToString() || '{}';
            metadata = JSON.parse(metadataText);
            
            originalName = metadata.originalDatasetName || 'Unknown';
            processingSteps = metadata.processingSteps || [];
          } catch {
            console.log('No metadata found for:', fileName);
          }
          
          datasets.push({
            id: `r2_${transformedName}_${Date.now()}`,
            originalName: originalName,
            transformedName: transformedName,
            url: csvUrl,
            fileSize: object.Size || 0,
            rowCount: metadata?.metadata?.rowCount || null,
            columnCount: metadata?.metadata?.columnCount || null,
            processingSteps: processingSteps,
            uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
            preprocessingReport: metadata?.preprocessingReport || null
          });
        }
      }
    }

    // Sort by upload date (newest first)
    datasets.sort((a, b) => {
      const dateA = new Date(a.uploadedAt).getTime();
      const dateB = new Date(b.uploadedAt).getTime();
      return dateB - dateA;
    });

    console.log(`Total datasets found: ${datasets.length}`);

    return NextResponse.json({
      success: true,
      datasets: datasets
    });

  } catch (error) {
    console.error('Error fetching R2 datasets:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch datasets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
