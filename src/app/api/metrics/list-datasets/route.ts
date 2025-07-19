import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('user_metrics_cache');

    // Get unique datasets with their names
    const datasets = await collection.distinct('datasetId');
    const datasetList = await Promise.all(
      datasets.map(async (id) => {
        const doc = await collection.findOne({ datasetId: id });
        return {
          _id: id,
          name: doc?.name || id // Use ID as name if name not found
        };
      })
    );

    return NextResponse.json(datasetList);
  } catch (error) {
    console.error('Error listing datasets:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to list datasets' 
    }, { status: 500 });
  }
}
