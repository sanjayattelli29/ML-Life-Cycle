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

    // Connect to database with improved connection handling
    console.log('Connecting to MongoDB...');
    let connectionAttempts = 0;
    const maxConnectionAttempts = 3;
    
    while (connectionAttempts < maxConnectionAttempts) {
      try {
        connectionAttempts++;
        console.log(`MongoDB connection attempt ${connectionAttempts}/${maxConnectionAttempts}`);
        
        await Promise.race([
          dbConnect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('MongoDB connection timeout after 60 seconds')), 60000)
          )
        ]);
        console.log('MongoDB connected successfully');
        break; // Success, exit retry loop
        
      } catch (dbError) {
        console.error(`MongoDB connection attempt ${connectionAttempts} failed:`, dbError);
        
        if (connectionAttempts >= maxConnectionAttempts) {
          throw new Error(`Database connection failed after ${maxConnectionAttempts} attempts: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        }
        
        // Wait before retry
        const waitTime = connectionAttempts * 2000; // 2s, 4s, 6s
        console.log(`Waiting ${waitTime}ms before connection retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Optimize preprocessing report to reduce document size
    let optimizedReport = preprocessingReport;
    if (preprocessingReport && typeof preprocessingReport === 'object') {
      // Keep only essential information to reduce document size
      optimizedReport = {
        preprocessing_stats: preprocessingReport.preprocessing_stats || {},
        final_dataset_info: {
          shape: preprocessingReport.final_dataset_info?.shape || [rowCount, columnCount],
          missing_values: preprocessingReport.final_dataset_info?.missing_values || 0
        },
        preprocessing_log: Array.isArray(preprocessingReport.preprocessing_log) 
          ? preprocessingReport.preprocessing_log.slice(0, 20) // Limit log entries
          : []
      };
    }

    // Save to MongoDB with improved error handling and retry logic
    console.log('Creating TransformedDataset document...');
    
    console.log('Saving to MongoDB with retry logic...');
    let savedDataset;
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        attempt++;
        console.log(`MongoDB save attempt ${attempt}/${maxAttempts}`);
        
        // Create a fresh document instance for each attempt
        const transformedDataset = new TransformedDataset({
          userId: session.user.id,
          originalDatasetName,
          transformedDatasetName,
          r2Url,
          r2Key,
          fileSize,
          processingSteps,
          preprocessingReport: optimizedReport,
          metadata: {
            rowCount,
            columnCount,
            fileType: 'csv'
          }
        });
        
        // Validate the document before saving
        await transformedDataset.validate();
        console.log('Document validation passed');
        
        // Use direct save without buffering and with extended timeout
        savedDataset = await transformedDataset.save({ 
          validateBeforeSave: false, // Already validated above
          writeConcern: { w: 'majority', wtimeout: 60000 } // 60 second write timeout
        });
        
        console.log('MongoDB save completed. Document ID:', savedDataset._id);
        break; // Success, exit retry loop
        
      } catch (saveError) {
        console.error(`MongoDB save attempt ${attempt} failed:`, saveError);
        
        if (attempt >= maxAttempts) {
          // Final attempt failed - but don't fail the entire operation
          // The file was already uploaded to R2 successfully
          console.error('All MongoDB save attempts failed, but R2 upload succeeded');
          
          // Note: Backup metadata removed as per user request
          // MongoDB is the single source of truth for dataset metadata
          
          // Return a partial success response
          return NextResponse.json({
            success: true,
            warning: 'Dataset uploaded to cloud storage successfully, but database save failed. Please try uploading again.',
            dataset: {
              id: `temp_${Date.now()}`, // Temporary ID
              name: transformedDatasetName,
              url: r2Url,
              size: fileSize,
              rowCount,
              columnCount,
              uploadedAt: new Date().toISOString(),
              processingSteps
            },
            database_save_failed: true,
            error: `Database save failed after ${maxAttempts} attempts: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`
          });
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
        console.log(`Waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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
