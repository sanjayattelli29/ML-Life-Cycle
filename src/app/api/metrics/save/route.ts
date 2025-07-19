import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { userId, datasetId, metrics, timestamp } = await req.json();

    // Validate required fields
    if (!userId || !datasetId || !metrics) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();    // Save metrics to the new user_metrics_cache collection
    const result = await db.collection('user_metrics_cache').updateOne(
      { userId, datasetId },
      {
        $set: {
          userId,
          datasetId,
          metrics,
          timestamp: timestamp || new Date().toISOString(),
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );    return NextResponse.json({ 
      success: true, 
      message: 'Metrics saved successfully',
      metricId: result.upsertedId 
    });
  } catch (error) {
    console.error('Error saving metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save metrics' 
    }, { status: 500 });
  }
}
