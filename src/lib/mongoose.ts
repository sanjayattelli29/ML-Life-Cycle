import mongoose from 'mongoose';

// Extend global type to include mongoose
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('Creating new MongoDB connection...');
    console.log('MongoDB URI exists:', !!MONGODB_URI);
    
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 60000, // Increased from 30s to 60s
      socketTimeoutMS: 120000, // Increased from 75s to 120s
      connectTimeoutMS: 60000, // Increased from 30s to 60s
      maxIdleTimeMS: 300000, // 5 minutes idle timeout
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      bufferCommands: false, // Disable buffering to prevent timeout issues
      bufferMaxEntries: 0, // Disable buffering completely
      retryReads: true,
    };

    // Disable mongoose buffering globally to prevent timeout issues
    mongoose.set('bufferCommands', false);
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB connected successfully via Mongoose');
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    console.error('❌ MongoDB connection failed:', e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;