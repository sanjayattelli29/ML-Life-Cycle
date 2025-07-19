import mongoose from 'mongoose';

// Explicitly define the Note document interface
interface INote {
  userId: string;
  title: string;
  content: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new mongoose.Schema<INote>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  content: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: false,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        try {
          new URL(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: 'Invalid URL format'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // This will automatically manage createdAt and updatedAt
  strict: true,
  collection: 'notes' // Explicitly set collection name
});

// Update the timestamps on save
noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);

export default Note;
