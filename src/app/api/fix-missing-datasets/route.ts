import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function POST() {
  try {
    console.log('=== Fix Missing Datasets API Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User:', session.user.id);

    // Get existing MongoDB records
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    const existingDatasets = await db.collection('transformeddatasets')
      .find({ userId: session.user.id })
      .toArray();

    const existingUrls = new Set(existingDatasets.map((d: Record<string, unknown>) => d.r2Url));
    console.log('Existing MongoDB datasets:', existingDatasets.length);

    // Check R2 for CSV files
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: `transformed-datasets/${session.user.id}/`,
    });

    const response = await s3Client.send(listCommand);
    const missingDatasets = [];

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Key.endsWith('.csv')) {
          const csvUrl = `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${object.Key}`;
          
          // Check if this URL exists in MongoDB
          if (!existingUrls.has(csvUrl)) {
            console.log('Found missing dataset:', object.Key);
            
            const fileName = object.Key.split('/').pop() || 'unknown';
            const transformedName = fileName.replace('.csv', '');
            
            // Create a minimal MongoDB record for this orphaned CSV
            const newRecord = {
              userId: session.user.id,
              originalDatasetName: 'Unknown (recovered from R2)',
              transformedDatasetName: transformedName,
              r2Url: csvUrl,
              r2Key: object.Key,
              fileSize: object.Size || 0,
              processingSteps: [],
              metadata: {
                rowCount: null,
                columnCount: null,
                fileType: 'csv'
              },
              uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const result = await db.collection('transformeddatasets').insertOne(newRecord);
            console.log('Created MongoDB record for:', transformedName, 'ID:', result.insertedId);
            
            missingDatasets.push({
              id: result.insertedId,
              name: transformedName,
              url: csvUrl,
              fileSize: object.Size || 0
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found and fixed ${missingDatasets.length} missing datasets`,
      fixedDatasets: missingDatasets,
      existingInMongoDB: existingDatasets.length
    });

  } catch (error) {
    console.error('Error fixing missing datasets:', error);
    return NextResponse.json({ 
      error: 'Failed to fix missing datasets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
