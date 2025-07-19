import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/datasets - Get all datasets for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Get user ID from session
    const userId = session.user.id as string;
    
    // Find all datasets for this user
    const datasets = await db.collection('datasets')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching datasets' },
      { status: 500 }
    );
  }
}

// POST /api/datasets - Create a new dataset
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, columns, data } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'Dataset name is required' }, { status: 400 });
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json({ message: 'Dataset must have at least one column' }, { status: 400 });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ message: 'Dataset must have at least one row of data' }, { status: 400 });
    }

    // Validate data size (optional - adjust limit as needed)
    const dataSize = JSON.stringify(data).length;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (dataSize > MAX_SIZE) {
      return NextResponse.json({ 
        message: 'Dataset is too large. Please reduce the size or contact support.' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Get user ID from session and convert to ObjectId
    const userId = new ObjectId(session.user.id as string);
    
    // Create the dataset document
    const dataset = {
      name,
      columns,
      data,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert the dataset
    const result = await db.collection('datasets').insertOne(dataset);

    if (!result.insertedId) {
      throw new Error('Failed to create dataset');
    }

    // Return success response with the created dataset ID
    return NextResponse.json({ 
      message: 'Dataset created successfully',
      datasetId: result.insertedId 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'An error occurred while creating the dataset' },
      { status: 500 }
    );
  }
}

// PUT /api/datasets/:id/preprocess - Apply preprocessing to a dataset
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { datasetId, operations } = body;

    if (!datasetId || !operations) {
      return NextResponse.json({ message: 'Dataset ID and operations are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Get user ID from session
    const userId = new ObjectId(session.user.id as string);
    
    // Find the dataset
    const dataset = await db.collection('datasets').findOne({
      _id: new ObjectId(datasetId),
      userId
    });

    if (!dataset) {
      return NextResponse.json({ message: 'Dataset not found' }, { status: 404 });
    }

    // Process the data based on operations
    let processedData = [...dataset.data];
    let processedColumns = [...dataset.columns];

    for (const operation of operations) {
      switch (operation.type) {
        case 'removeColumn':
          processedColumns = processedColumns.filter(col => col.name !== operation.column);
          processedData = processedData.map(row => {
            const newRow = { ...row };
            delete newRow[operation.column];
            return newRow;
          });
          break;

        case 'renameColumn':
          processedColumns = processedColumns.map(col =>
            col.name === operation.oldName ? { ...col, name: operation.newName } : col
          );
          processedData = processedData.map(row => {
            const newRow = { ...row };
            if (operation.oldName in newRow) {
              newRow[operation.newName] = newRow[operation.oldName];
              delete newRow[operation.oldName];
            }
            return newRow;
          });
          break;

        case 'fillNulls':
          processedData = processedData.map(row => ({
            ...row,
            [operation.column]: row[operation.column] ?? operation.value
          }));
          break;

        // Add more preprocessing operations as needed
      }
    }

    // Update the dataset with processed data
    const result = await db.collection('datasets').updateOne(
      { _id: new ObjectId(datasetId) },
      { 
        $set: { 
          data: processedData,
          columns: processedColumns,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Failed to update dataset');
    }

    return NextResponse.json({ 
      message: 'Dataset preprocessed successfully',
      columns: processedColumns,
      rowCount: processedData.length
    });

  } catch (error) {
    console.error('Error preprocessing dataset:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'An error occurred while preprocessing the dataset' },
      { status: 500 }
    );
  }
}