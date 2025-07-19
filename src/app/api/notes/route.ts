import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Note from '@/models/Note';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Get all notes for the current user
export async function GET() {
  try {
    // Connect to MongoDB first
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notes = await Note.find({ userId: session.user.email })
      .sort({ updatedAt: -1 })
      .lean(); // Convert mongoose documents to plain objects

    return NextResponse.json(notes.map(note => ({
      ...note,
      _id: note._id.toString()
    })));
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// Create a new note
export async function POST(req: Request) {
  try {
    // Connect to MongoDB first
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Create the note using Mongoose
    const note = new Note({
      userId: session.user.email,
      title: body.title.trim(),
      content: body.content.trim(),
      url: body.url?.trim() || undefined
    });

    const savedNote = await note.save();
    
    // Return a plain object instead of the mongoose document
    return NextResponse.json({
      _id: savedNote._id.toString(),
      userId: savedNote.userId,
      title: savedNote.title,
      content: savedNote.content,
      url: savedNote.url,
      createdAt: savedNote.createdAt,
      updatedAt: savedNote.updatedAt
    });
  } catch (error: any) {
    console.error('Error creating note:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to create note' 
    }, { status: 500 });
  }
}
