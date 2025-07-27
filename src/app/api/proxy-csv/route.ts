import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client with proper credentials
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    console.log('=== CSV Proxy API Called ===');
    
    const session = await getServerSession(authOptions);
    console.log('Session check:', session ? 'authenticated' : 'not authenticated');
    
    if (!session?.user?.id) {
      console.log('No session or user ID, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    console.log('Requested URL parameter:', url);

    if (!url) {
      console.log('No URL parameter provided, returning 400');
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate that the URL is from our R2 storage
    console.log('Checking URL domain...');
    const validDomains = [
      'r2.cloudflarestorage.com',
      process.env.R2_CUSTOM_DOMAIN
    ].filter(Boolean);
    
    const isValidDomain = validDomains.some(domain => url.includes(domain!));
    
    if (!isValidDomain) {
      console.log('Invalid URL domain:', url);
      return NextResponse.json({ error: 'Invalid URL domain' }, { status: 400 });
    }

    console.log('✓ URL validation passed');
    
    // Extract the object key from the URL
    let key = '';
    
    if (url.includes(`/${process.env.R2_BUCKET_NAME}/`)) {
      // Extract everything after the bucket name
      const bucketPath = `/${process.env.R2_BUCKET_NAME}/`;
      const bucketIndex = url.indexOf(bucketPath);
      key = url.substring(bucketIndex + bucketPath.length);
    } else if (url.includes('.r2.cloudflarestorage.com/')) {
      // Fallback for direct R2 URLs
      const urlParts = url.split('/');
      const domainIndex = urlParts.findIndex(part => part.includes('.r2.cloudflarestorage.com'));
      key = urlParts.slice(domainIndex + 1).join('/');
    }
    
    console.log('Extracted key:', key);
    console.log('Using bucket:', process.env.R2_BUCKET_NAME || 'my-datasets');
    
    // Fetch using S3 client with proper credentials
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });
    
    console.log('Attempting S3 GetObject...');
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.log('No body in S3 response');
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Convert stream to string
    const chunks: Buffer[] = [];
    if (response.Body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of response.Body as any) {
        chunks.push(Buffer.from(chunk));
      }
    }
    const csvText = Buffer.concat(chunks).toString('utf-8');
    console.log('✓ CSV fetched successfully via S3, length:', csvText.length);
    
    // Return the CSV with proper headers
    return new NextResponse(csvText, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('=== CSV Proxy Error ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to proxy CSV',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
