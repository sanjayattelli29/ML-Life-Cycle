import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
// // import { ObjectId } from 'mongodb';

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Fetch upload history from database
    const history = await db.collection('uploadhistories')
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const total = await db.collection('uploadhistories').countDocuments({ userId });

    return NextResponse.json({ 
      success: true,
      history,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching upload history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch upload history' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { userId, datasetId, datasetName, metrics, graphUrls } = await req.json();

    // Validate required fields
    if (!userId || !datasetId || !datasetName || !metrics || !graphUrls) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Save upload history to database
    const result = await db.collection('uploadhistories').insertOne({
      userId,
      datasetId,
      datasetName,
      metrics,
      graphUrls,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Upload history saved successfully',
      historyId: result.insertedId 
    });
  } catch (error) {
    console.error('Error saving upload history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save upload history' 
    }, { status: 500 });
  }
}
