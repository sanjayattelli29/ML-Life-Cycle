import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongoose';
import TransformedDataset from '@/models/TransformedDataset';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('=== Fetch Datasets API Route Called ===');
    const session = await getServerSession(authOptions);
    console.log('Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);
    console.log('User ID type:', typeof session.user.id);
    console.log('User ID length:', session.user.id.length);

    let formattedDatasets: Record<string, unknown>[] = [];

    // Get datasets metadata from MongoDB (this contains R2 URLs linked to user ID)
    try {
      console.log('Using native MongoDB client...');
      const client = await clientPromise;
      const db = client.db(process.env.DB_NAME);
      
      console.log('Connected to database:', process.env.DB_NAME);
      console.log('User ID for query:', session.user.id);
      
      // First, let's see all datasets in the collection for debugging
      const allDatasets = await db.collection('transformeddatasets').find({}).toArray();
      console.log('All datasets in collection:', allDatasets.length);
      console.log('All user IDs in collection:', allDatasets.map(d => d.userId));
      
      // Query using native MongoDB client
      const datasets = await db.collection('transformeddatasets')
        .find({ userId: session.user.id })
        .sort({ uploadedAt: -1 })
        .toArray();

      console.log('Native MongoDB query completed. Found datasets:', datasets.length);

      // Format the response
      formattedDatasets = datasets.map((dataset: Record<string, unknown>) => ({
        id: dataset._id,
        originalName: dataset.originalDatasetName,
        transformedName: dataset.transformedDatasetName,
        url: dataset.r2Url,
        fileSize: dataset.fileSize,
        rowCount: (dataset.metadata as Record<string, unknown>)?.rowCount,
        columnCount: (dataset.metadata as Record<string, unknown>)?.columnCount,
        processingSteps: dataset.processingSteps,
        uploadedAt: dataset.uploadedAt,
        preprocessingReport: dataset.preprocessingReport
      }));

    } catch (mongoError) {
      console.error('MongoDB query failed:', mongoError);
      formattedDatasets = [];
    }

    console.log(`Total datasets found: ${formattedDatasets.length}`);

    return NextResponse.json({
      success: true,
      datasets: formattedDatasets
    });

  } catch (error) {
    console.error('Error fetching transformed datasets:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch datasets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Save Transformed Dataset API Route Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);

    // Parse request body
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    const {
      originalName,
      transformedName,
      url,
      fileSize,
      rowCount,
      columnCount,
      processingSteps,
      metadata
    } = body;

    // Validate required fields
    if (!originalName || !transformedName || !url) {
      return NextResponse.json({ 
        error: 'Missing required fields: originalName, transformedName, url' 
      }, { status: 400 });
    }

    // Use native MongoDB client for consistency
    console.log('Using native MongoDB client...');
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Create dataset document
    const datasetDoc = {
      userId: session.user.id,
      originalDatasetName: originalName,
      transformedDatasetName: transformedName,
      r2Url: url,
      fileSize: fileSize || 0,
      processingSteps: processingSteps || [],
      metadata: {
        rowCount: rowCount || 0,
        columnCount: columnCount || 0,
        ...metadata
      },
      uploadedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Inserting dataset document:', JSON.stringify(datasetDoc, null, 2));

    // Insert the document
    const result = await db.collection('transformeddatasets').insertOne(datasetDoc);

    console.log('Dataset saved successfully with ID:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'Dataset saved successfully',
      datasetId: result.insertedId
    });

  } catch (error) {
    console.error('Error saving transformed dataset:', error);
    return NextResponse.json({ 
      error: 'Failed to save dataset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('id');

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Delete dataset (only if it belongs to the user)
    // @ts-expect-error - Mongoose model typing issue
    const deletedDataset = await TransformedDataset.findOneAndDelete({ 
      _id: datasetId, 
      userId: session.user.id 
    });

    if (!deletedDataset) {
      return NextResponse.json({ error: 'Dataset not found or unauthorized' }, { status: 404 });
    }

    // TODO: Also delete from R2 storage if needed
    // const deleteCommand = new DeleteObjectCommand({
    //   Bucket: process.env.R2_BUCKET_NAME!,
    //   Key: deletedDataset.r2Key,
    // });
    // await s3Client.send(deleteCommand);

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting transformed dataset:', error);
    return NextResponse.json({ 
      error: 'Failed to delete dataset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
