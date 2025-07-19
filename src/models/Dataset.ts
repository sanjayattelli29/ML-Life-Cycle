import mongoose, { Schema, Document } from 'mongoose';

export interface IDataset extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  columns: Array<{
    name: string;
    type: 'text' | 'numeric' | 'mixed';
  }>;
  data: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    columns: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ['text', 'numeric', 'mixed'], required: true },
      },
    ],
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Dataset || mongoose.model<IDataset>('Dataset', DatasetSchema);
