import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { publicId } = await req.json();

    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId parameter' }, { status: 400 });
    }

    // Create signature for Cloudinary API
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!apiSecret) {
      return NextResponse.json({ error: 'Cloudinary API secret not configured' }, { status: 500 });
    }

    // In a real implementation, you would generate a signature here using crypto
    // For simplicity, we&apos;ll use a fetch request to Cloudinary&apos;s API
    
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', process.env.CLOUDINARY_API_KEY || '');
    
    // In a production environment, you would generate a proper signature
    // This is a simplified example
    const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${apiSecret}`).toString('base64')}`
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.result === 'ok') {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: data.error?.message || 'Failed to delete image' });
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete image from Cloudinary' 
    }, { status: 500 });
  }
}
