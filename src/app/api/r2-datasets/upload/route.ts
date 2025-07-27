import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    console.log('=== R2 Upload API Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);

    const body = await request.json();
    const { 
      csvData, 
      originalDatasetName,
      transformedName,
      processingSteps = [],
      preprocessingReport = null
    } = body;

    if (!csvData || !originalDatasetName) {
      return NextResponse.json({ 
        error: 'Missing required fields: csvData and originalDatasetName' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = transformedName || `transformed_${originalDatasetName}_${timestamp}`;
    const csvKey = `transformed-datasets/${session.user.id}/${fileName}.csv`;
    const metadataKey = `metadata/${session.user.id}/${fileName}.json`;

    console.log('Uploading to R2...');
    console.log('CSV Key:', csvKey);
    console.log('Metadata Key:', metadataKey);

    // Calculate CSV stats
    const lines = csvData.split('\n').filter((line: string) => line.trim() !== '');
    const rowCount = Math.max(0, lines.length - 1); // Exclude header
    const columnCount = lines.length > 0 ? lines[0].split(',').length : 0;

    // Upload CSV file
    const csvCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: csvKey,
      Body: csvData,
      ContentType: 'text/csv',
    });

    await s3Client.send(csvCommand);
    console.log('CSV uploaded successfully');

    // Create metadata
    const metadata = {
      userId: session.user.id,
      originalDatasetName,
      transformedDatasetName: fileName,
      csvKey,
      fileSize: Buffer.byteLength(csvData, 'utf8'),
      processingSteps,
      preprocessingReport,
      metadata: {
        rowCount,
        columnCount,
        fileType: 'csv'
      },
      uploadedAt: new Date().toISOString()
    };

    // Upload metadata file
    const metadataCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: metadataKey,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(metadataCommand);
    console.log('Metadata uploaded successfully');

    const csvUrl = `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${csvKey}`;

    return NextResponse.json({
      success: true,
      message: 'Dataset uploaded successfully to R2 storage',
      dataset: {
        id: `r2_${fileName}_${timestamp}`,
        name: fileName,
        url: csvUrl,
        size: metadata.fileSize,
        rowCount,
        columnCount,
        uploadedAt: metadata.uploadedAt,
        processingSteps
      }
    });

  } catch (error) {
    console.error('R2 upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload to R2 storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
