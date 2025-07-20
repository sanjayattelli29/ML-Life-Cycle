import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// R2 Cloudflare Storage Configuration from environment variables
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;

// Validate environment variables
if (!R2_ENDPOINT || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing required R2 environment variables. Please check your .env file.');
}

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `datasets/${userId}/${timestamp}_${sanitizedFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'text/csv',
      Metadata: {
        'original-name': file.name,
        'user-id': userId,
        'upload-timestamp': timestamp.toString(),
      },
    });

    await r2Client.send(uploadCommand);

    // Generate public URL
    const publicUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key: key,
      size: file.size,
      originalName: file.name,
      message: 'File uploaded successfully to R2 storage',
    });

  } catch (error) {
    console.error('R2 upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file to R2 storage' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'R2 Cloudflare Storage API is running',
    endpoint: 'POST /api/cloudinary - Upload files to R2 storage'
  });
}
