import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const datasetId = searchParams.get('datasetId');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Define query interface
    interface MetricsQuery {
      userId: string;
      datasetId?: string;
    }
    
    // Build query
    const query: MetricsQuery = { userId };
    if (datasetId) {
      query.datasetId = datasetId;
    }

    // Fetch metrics history from database
    const history = await db.collection('metrics')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // If datasetId is provided, also fetch the dataset details
    const datasetDetails = null;
    if (datasetId) {
      datasetDetails = await db.collection('datasets')
        .findOne({ _id: datasetId, userId });
    }

    return NextResponse.json({ 
      success: true,
      history,
      datasetDetails
    });
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch metrics history' 
    }, { status: 500 });
  }
}
