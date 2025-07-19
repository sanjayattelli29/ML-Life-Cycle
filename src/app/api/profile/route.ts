import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET endpoint to fetch user profile
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Find user profile
    const userProfile = await db.collection('userprofiles').findOne({ 
      userId: new ObjectId(userId) 
    });

    // If profile doesn&apos;t exist, return basic info from user
    if (!userProfile) {
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(userId) 
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        profile: {
          name: user.name || '',
          email: user.email || '',
          phone: '',
          bio: '',
          imageUrl: user.image || '',
        }
      });
    }    return NextResponse.json({ 
      success: true,
      profile: {
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        bio: userProfile.bio || '',
        imageUrl: userProfile.imageUrl || '',
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user profile' 
    }, { status: 500 });
  }
}

// POST endpoint to create or update user profile
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // Also check Authorization header as backup
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    if (!session?.user?.id && !token) {
      console.log('Unauthorized request:', { 
        hasSession: !!session, 
        hasToken: !!token,
        headers: Object.fromEntries(req.headers.entries())
      });
      return NextResponse.json({ error: 'Unauthorized - No valid session or token' }, { status: 401 });
    }

    const userId = session?.user?.id || token;

    // Get request body
    const { name, email, phone, bio, imageUrl } = await req.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();    // Update the main user document first
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          name,
          email,
          image: imageUrl || '',
          updatedAt: new Date()
        }
      }
    );

    // Create or update user profile
    const result = await db.collection('userprofiles').updateOne(
      { userId: new ObjectId(userId) },
      { 
        $set: {
          name,
          email,
          phone: phone || '',
          bio: bio || '',
          imageUrl: imageUrl || '',
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: new ObjectId(userId),
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profileId: result.upsertedId || userId
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update user profile' 
    }, { status: 500 });
  }
}
