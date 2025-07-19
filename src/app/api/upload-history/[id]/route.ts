import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { deleteFromCloudinary } from '@/utils/cloudinary';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing history ID' }, { status: 400 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Find the upload history entry
    const history = await db.collection('uploadhistories').findOne({
      _id: new ObjectId(id)
    });

    if (!history) {
      return NextResponse.json({ error: 'Upload history not found' }, { status: 404 });
    }

    // Define interface for graph object
    interface Graph {
      publicId: string;
      url: string;
    }
    
    // Delete images from Cloudinary
    const deletePromises = history.graphUrls.map((graph: Graph) => 
      deleteFromCloudinary(graph.publicId)
    );
    
    await Promise.all(deletePromises);

    // Delete the upload history entry
    await db.collection('uploadhistories').deleteOne({
      _id: new ObjectId(id)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Upload history and associated images deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting upload history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete upload history' 
    }, { status: 500 });
  }
}
