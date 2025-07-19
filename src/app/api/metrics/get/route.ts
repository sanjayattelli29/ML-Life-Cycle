import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const datasetId = searchParams.get('datasetId');

  if (!userId || !datasetId) {
    return NextResponse.json({ message: 'Missing userId or datasetId' }, { status: 400 });
  }

  try {
    console.log('Searching for metrics with:', { userId, datasetId });
    const { db } = await connectToDatabase();
    const collection = db.collection('user_metrics_cache');

    // Find document using exact match
    const existing = await collection.findOne({
      datasetId: datasetId,
      userId: userId
    });

    console.log('Found document:', existing);

    if (!existing) {
      return NextResponse.json({ 
        success: false,
        message: 'No metrics found' 
      }, { status: 404 });
    }return NextResponse.json({
      success: true,
      metrics: existing.metrics,
      timestamp: existing.timestamp,
    });

  } catch (error) {
    console.error('GET metrics error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
