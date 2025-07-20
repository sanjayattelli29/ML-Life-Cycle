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

    // Debug the request content type
    const contentType = request.headers.get('content-type');
    console.log('Request content type:', contentType);
    
    let body;
    try {
      body = await request.json();
      console.log('JSON parsing successful');
      console.log('Received body keys:', Object.keys(body));
    } catch (jsonError) {
      console.error('JSON parsing failed:', jsonError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'
      }, { status: 400 });
    }
    const { 
      csvData, 
      originalDatasetName,
      transformedName,
      processingSteps = [], 
      preprocessingReport = null,
      replaceExisting = false,
      oldDatasetId = null
    } = body;

    if (!csvData || !originalDatasetName) {
      console.log('Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: csvData and originalDatasetName' 
      }, { status: 400 });
    }

    // Generate transformedName if not provided
    const finalTransformedName = transformedName || `transformed_${originalDatasetName}`;

    console.log('Processing dataset:', originalDatasetName);
    console.log('Transformed name:', finalTransformedName);
    console.log('CSV data length:', csvData.length);
    console.log('Processing steps:', processingSteps);
    console.log('Replace existing:', replaceExisting);
    console.log('Old dataset ID:', oldDatasetId);

    // Generate unique filename
    const timestamp = Date.now();
    const transformedDatasetName = `${finalTransformedName}_${timestamp}`;
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

    // Connect to database with timeout handling
    console.log('Connecting to MongoDB...');
    try {
      await Promise.race([
        dbConnect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MongoDB connection timeout')), 25000)
        )
      ]);
      console.log('MongoDB connected successfully');
      
    } catch (dbError) {
      console.error('MongoDB connection failed:', dbError);
      throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // Save to MongoDB with timeout handling and retry logic
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

    console.log('Saving to MongoDB with retry logic...');
    let savedDataset;
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        attempt++;
        console.log(`MongoDB save attempt ${attempt}/${maxAttempts}`);
        
        savedDataset = await Promise.race([
          transformedDataset.save(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('MongoDB save timeout after 45 seconds')), 45000)
          )
        ]) as typeof transformedDataset;
        
        console.log('MongoDB save completed. Document ID:', savedDataset._id);
        break; // Success, exit retry loop
        
      } catch (saveError) {
        console.error(`MongoDB save attempt ${attempt} failed:`, saveError);
        
        if (attempt >= maxAttempts) {
          // Final attempt failed
          throw new Error(`Database save failed after ${maxAttempts} attempts: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Recreate the document for retry (in case of corruption)
        if (attempt < maxAttempts) {
          console.log('Creating new document instance for retry...');
          transformedDataset.isNew = true; // Reset the document state
        }
      }
    }

    // If replacing existing dataset, delete the old one
    if (replaceExisting && oldDatasetId) {
      try {
        console.log('Deleting old dataset:', oldDatasetId);
        const deleteResult = await TransformedDataset.deleteOne({ _id: oldDatasetId });
        console.log('Old dataset deleted successfully:', deleteResult);
      } catch (deleteError) {
        console.warn('Failed to delete old dataset:', deleteError);
        // Don't fail the entire operation if deletion fails
      }
    }

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
      },
      replaced: replaceExisting && oldDatasetId ? true : false
    });

  } catch (error) {
    console.error('Error uploading to R2 and saving to MongoDB:', error);
    return NextResponse.json({ 
      error: 'Failed to upload dataset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
