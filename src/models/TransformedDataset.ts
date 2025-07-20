import mongoose from 'mongoose';

export interface ITransformedDataset {
  _id: mongoose.Types.ObjectId;
  userId: string;
  originalDatasetName: string;
  transformedDatasetName: string;
  r2Url: string;
  r2Key: string;
  fileSize: number;
  processingSteps: string[];
  preprocessingReport?: Record<string, unknown>;
  uploadedAt: Date;
  metadata: {
    rowCount?: number;
    columnCount?: number;
    fileType: string;
  };
}

const TransformedDatasetSchema = new mongoose.Schema<ITransformedDataset>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  originalDatasetName: {
    type: String,
    required: true
  },
  transformedDatasetName: {
    type: String,
    required: true
  },
  r2Url: {
    type: String,
    required: true
  },
  r2Key: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  processingSteps: [{
    type: String
  }],
  preprocessingReport: {
    type: mongoose.Schema.Types.Mixed
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    rowCount: Number,
    columnCount: Number,
    fileType: {
      type: String,
      default: 'csv'
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
TransformedDatasetSchema.index({ userId: 1, uploadedAt: -1 });

// Force collection name to match what exists in database
const modelName = 'TransformedDataset';
const collectionName = 'transformeddatasets'; // Match the existing collection

export default mongoose.models[modelName] || 
  mongoose.model<ITransformedDataset>(modelName, TransformedDatasetSchema, collectionName);
