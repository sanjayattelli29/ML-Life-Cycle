import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple test to ensure the API is working
    return NextResponse.json({
      success: true,
      message: 'API endpoints are working properly',
      timestamp: new Date().toISOString(),
      tests: {
        mongodb_configured: !!process.env.MONGODB_URI,
        r2_configured: !!process.env.R2_ENDPOINT && !!process.env.R2_ACCESS_KEY_ID,
        db_name: process.env.DB_NAME || 'Not set'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
