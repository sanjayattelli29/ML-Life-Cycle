import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // Test MongoDB connection
    await Promise.race([
      dbConnect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);

    // Check if connection is ready
    const isConnected = mongoose.connection.readyState === 1;
    const connectionStatus = [
      'disconnected',
      'connected', 
      'connecting',
      'disconnecting'
    ][mongoose.connection.readyState];

    if (!isConnected) {
      throw new Error(`MongoDB not ready. Status: ${connectionStatus}`);
    }

    // Test a simple operation
    const testResult = await mongoose.connection.db.admin().ping();

    return NextResponse.json({
      success: true,
      status: 'healthy',
      connection: {
        state: connectionStatus,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      },
      ping: testResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('MongoDB health check failed:', error);
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      connection: {
        state: mongoose.connection.readyState,
        readyState: mongoose.connection.readyState
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
