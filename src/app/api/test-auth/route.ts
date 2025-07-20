import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    console.log('=== Test Auth API Route Called ===');
    const session = await getServerSession(authOptions);
    console.log('Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ 
        authenticated: false,
        error: 'No session found',
        session: session 
      }, { status: 401 });
    }

    console.log('User authenticated:', session.user.id);
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      }
    });

  } catch (error) {
    console.error('Error in test auth:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Authentication test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
