import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    console.log('=== Feature-Importance Dataset Upload API Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);

    const body = await request.json();
    const {
      csvData,
      originalDatasetName,
      transformedName,
      processingSteps = [],
    } = body;

    if (!csvData || !transformedName) {
      return NextResponse.json({ 
        error: 'Missing required fields: csvData and transformedName' 
      }, { status: 400 });
    }

    console.log('Processing dataset:', originalDatasetName);
    console.log('Transformed name:', transformedName);
    console.log('CSV data length:', csvData.length);
    console.log('Processing steps:', processingSteps);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `${transformedName}_${timestamp}.csv`;
    
    // Create R2 key in feature-importance folder structure: feature-importance/{userId}/{filename}
    const r2Key = `feature-importance/${session.user.id}/${fileName}`;
    console.log('Generated R2 key:', r2Key);

    // Convert CSV data to buffer
    const csvBuffer = Buffer.from(csvData, 'utf-8');
    const fileSize = csvBuffer.length;
    console.log('File size:', fileSize, 'bytes');

    // Upload CSV to R2
    console.log('Starting R2 CSV upload...');
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2Key,
      Body: csvBuffer,
      ContentType: 'text/csv',
      Metadata: {
        'uploaded-by': session.user.id,
        'original-dataset': originalDatasetName || 'Unknown',
        'upload-timestamp': timestamp.toString(),
        'dataset-type': 'feature-importance'
      },
    });

    await s3Client.send(uploadCommand);
    console.log('R2 CSV upload completed successfully');

    // Generate public URL using standard R2 format
    const csvUrl = `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${r2Key}`;
    console.log('Generated CSV URL:', csvUrl);

    // Extract metadata from CSV
    const lines = csvData.split('\n').filter((line: string) => line.trim());
    const headers = lines[0]?.split(',') || [];
    const rowCount = lines.length - 1; // Subtract header row
    const columnCount = headers.length;

    console.log('CSV metadata - Rows:', rowCount, 'Columns:', columnCount);

    // Create metadata object
    const metadata = {
      id: `feat_${transformedName}_${timestamp}`,
      originalDatasetName: originalDatasetName || 'Unknown',
      transformedName: transformedName,
      fileName: fileName,
      url: csvUrl,
      fileSize: fileSize,
      rowCount: rowCount,
      columnCount: columnCount,
      processingSteps: processingSteps,
      uploadedAt: new Date().toISOString(),
      datasetType: 'feature-importance',
      uploadedBy: session.user.id
    };

    // Upload metadata JSON to R2
    const metadataKey = `metadata/feature-importance/${session.user.id}/${fileName.replace('.csv', '.json')}`;
    console.log('Uploading metadata to:', metadataKey);

    const metadataUploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: metadataKey,
      Body: Buffer.from(JSON.stringify(metadata, null, 2)),
      ContentType: 'application/json',
      Metadata: {
        'uploaded-by': session.user.id,
        'upload-timestamp': timestamp.toString(),
        'metadata-type': 'feature-importance-dataset'
      },
    });

    await s3Client.send(metadataUploadCommand);
    console.log('Metadata upload completed successfully');

    console.log('=== Feature-Importance Dataset Upload Successful ===');

    return NextResponse.json({
      success: true,
      message: 'Dataset saved to feature-importance folder successfully',
      dataset: metadata
    });

  } catch (error) {
    console.error('Error uploading feature-importance dataset:', error);
    return NextResponse.json({ 
      error: 'Failed to upload dataset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
