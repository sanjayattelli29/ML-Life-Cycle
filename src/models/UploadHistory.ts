import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadHistory extends Document {
  userId: mongoose.Types.ObjectId;
  datasetId: mongoose.Types.ObjectId;
  datasetName: string;
  metrics: Record<string, any>;
  graphUrls: Array<{
    type: string;
    url: string;
    publicId: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UploadHistorySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true },
    datasetName: { type: String, required: true },
    metrics: { type: Schema.Types.Mixed, required: true },
    graphUrls: [
      {
        type: { type: String, required: true }, // e.g., 'bar-chart', 'pie-chart', etc.
        url: { type: String, required: true },
        publicId: { type: String, required: true }, // Cloudinary public ID for deletion
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.UploadHistory || mongoose.model<IUploadHistory>('UploadHistory', UploadHistorySchema);
