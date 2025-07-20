import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongoose';
import TransformedDataset from '@/models/TransformedDataset';
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
    console.log('=== Upload API Route Called ===');
    const session = await getServerSession(authOptions);
    console.log('Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);

    const body = await request.json();
    console.log('Received body keys:', Object.keys(body));
    const { 
      csvData, 
      originalDatasetName, 
      processingSteps = [], 
      preprocessingReport = null 
    } = body;

    if (!csvData || !originalDatasetName) {
      console.log('Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: csvData and originalDatasetName' 
      }, { status: 400 });
    }

    console.log('Processing dataset:', originalDatasetName);
    console.log('CSV data length:', csvData.length);
    console.log('Processing steps:', processingSteps);

    // Generate unique filename
    const timestamp = Date.now();
    const transformedDatasetName = `transformed_${originalDatasetName}_${timestamp}`;
    const r2Key = `transformed-datasets/${session.user.id}/${transformedDatasetName}.csv`;

    console.log('Generated R2 key:', r2Key);

    // Convert CSV data to buffer
    const csvBuffer = Buffer.from(csvData, 'utf-8');
    const fileSize = csvBuffer.length;

    console.log('File size:', fileSize, 'bytes');

    // Upload to R2
    console.log('Starting R2 upload...');
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2Key,
      Body: csvBuffer,
      ContentType: 'text/csv',
      Metadata: {
        'uploaded-by': session.user.id,
        'original-dataset': originalDatasetName,
        'upload-timestamp': timestamp.toString(),
      },
    });

    await s3Client.send(uploadCommand);
    console.log('R2 upload completed successfully');

    // Generate public URL
    const r2Url = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${r2Key}`;
    console.log('Generated R2 URL:', r2Url);

    // Extract metadata from CSV
    const lines = csvData.split('\n').filter((line: string) => line.trim());
    const headers = lines[0]?.split(',') || [];
    const rowCount = lines.length - 1; // Subtract header row
    const columnCount = headers.length;

    console.log('CSV metadata - Rows:', rowCount, 'Columns:', columnCount);

    // Connect to database
    console.log('Connecting to MongoDB...');
    await dbConnect();
    console.log('MongoDB connected successfully');

    // Save to MongoDB
    console.log('Creating TransformedDataset document...');
    const transformedDataset = new TransformedDataset({
      userId: session.user.id,
      originalDatasetName,
      transformedDatasetName,
      r2Url,
      r2Key,
      fileSize,
      processingSteps,
      preprocessingReport,
      metadata: {
        rowCount,
        columnCount,
        fileType: 'csv'
      }
    });

    console.log('Saving to MongoDB...');
    const savedDataset = await transformedDataset.save();
    console.log('MongoDB save completed. Document ID:', savedDataset._id);

    return NextResponse.json({
      success: true,
      dataset: {
        id: savedDataset._id,
        name: transformedDatasetName,
        url: r2Url,
        size: fileSize,
        rowCount,
        columnCount,
        uploadedAt: savedDataset.uploadedAt,
        processingSteps
      }
    });

  } catch (error) {
    console.error('Error uploading to R2 and saving to MongoDB:', error);
    return NextResponse.json({ 
      error: 'Failed to upload dataset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
