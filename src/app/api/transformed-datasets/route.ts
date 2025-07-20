import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongoose';
import TransformedDataset from '@/models/TransformedDataset';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    // Try using native MongoDB client like the working datasets route
    console.log('Using native MongoDB client...');
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    console.log('Connected to database:', process.env.DB_NAME);
    console.log('User ID for query:', session.user.id);
    
    // Query using native MongoDB client
    const datasets = await db.collection('transformeddatasets')
      .find({ userId: session.user.id })
      .sort({ uploadedAt: -1 })
      .toArray();

    console.log('Native MongoDB query completed. Found datasets:', datasets.length);

    // Format the response
    const formattedDatasets = datasets.map((dataset: Record<string, unknown>) => ({
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
