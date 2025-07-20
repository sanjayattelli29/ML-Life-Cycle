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
    console.log('=== Save Normalized Dataset API Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);

    const body = await request.json();
    const { 
      csvData, 
      originalDatasetId,
      originalDatasetName,
      normalizationConfig = {},
      replaceExisting = true
    } = body;

    if (!csvData || !originalDatasetId || !originalDatasetName) {
      console.log('Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: csvData, originalDatasetId, and originalDatasetName' 
      }, { status: 400 });
    }

    console.log('Processing normalized dataset for:', originalDatasetName);
    console.log('CSV data length:', csvData.length);
    console.log('Normalization config:', normalizationConfig);
    console.log('Replace existing:', replaceExisting);

    // Generate name for normalized dataset
    const timestamp = Date.now();
    const normalizedDatasetName = `${originalDatasetName}_normalized_${timestamp}`;
    const r2Key = `transformed-datasets/${session.user.id}/${normalizedDatasetName}.csv`;

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
        'processing-type': 'normalization',
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

    if (replaceExisting) {
      // Update the existing dataset record
      console.log('Updating existing dataset with ID:', originalDatasetId);
      
      // First get the existing dataset to preserve processing steps
      // @ts-expect-error - Mongoose model typing issue
      const existingDataset = await TransformedDataset.findById(originalDatasetId);
      if (!existingDataset || existingDataset.userId !== session.user.id) {
        throw new Error('Dataset not found or unauthorized');
      }

      // @ts-expect-error - Mongoose model typing issue
      const updatedDataset = await TransformedDataset.findOneAndUpdate(
        { 
          _id: originalDatasetId, 
          userId: session.user.id 
        },
        {
          transformedDatasetName: normalizedDatasetName,
          r2Url,
          r2Key,
          fileSize,
          processingSteps: [
            ...existingDataset.processingSteps || [],
            'normalization'
          ],
          metadata: {
            rowCount,
            columnCount,
            fileType: 'csv',
            normalizationConfig
          },
          uploadedAt: new Date()
        },
        { new: true }
      );

      if (!updatedDataset) {
        throw new Error('Dataset not found or unauthorized');
      }

      console.log('Dataset updated successfully:', updatedDataset._id);

      return NextResponse.json({
        success: true,
        message: 'Normalized dataset saved successfully',
        dataset: {
          id: updatedDataset._id,
          originalName: updatedDataset.originalDatasetName,
          transformedName: updatedDataset.transformedDatasetName,
          url: updatedDataset.r2Url,
          fileSize: updatedDataset.fileSize,
          rowCount,
          columnCount,
          processingSteps: updatedDataset.processingSteps,
          uploadedAt: updatedDataset.uploadedAt
        }
      });
    } else {
      // Create a new dataset record
      console.log('Creating new normalized dataset record...');
      
      const transformedDataset = new TransformedDataset({
        userId: session.user.id,
        originalDatasetName,
        transformedDatasetName: normalizedDatasetName,
        r2Url,
        r2Key,
        fileSize,
        processingSteps: ['normalization'],
        metadata: {
          rowCount,
          columnCount,
          fileType: 'csv',
          normalizationConfig
        }
      });

      const savedDataset = await transformedDataset.save();
      console.log('New normalized dataset saved successfully:', savedDataset._id);

      return NextResponse.json({
        success: true,
        message: 'Normalized dataset saved as new dataset',
        dataset: {
          id: savedDataset._id,
          originalName: savedDataset.originalDatasetName,
          transformedName: savedDataset.transformedDatasetName,
          url: savedDataset.r2Url,
          fileSize: savedDataset.fileSize,
          rowCount,
          columnCount,
          processingSteps: savedDataset.processingSteps,
          uploadedAt: savedDataset.uploadedAt
        }
      });
    }

  } catch (error) {
    console.error('Error saving normalized dataset:', error);
    return NextResponse.json({ 
      error: 'Failed to save normalized dataset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
