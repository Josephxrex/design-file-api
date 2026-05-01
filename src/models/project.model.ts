import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
  id: string;
  text: string;
  userId: Types.ObjectId;
  userName: string;
  x: number;
  y: number;
  createdAt: Date;
}

export interface ICollaborator {
  userId: Types.ObjectId;
  role: 'viewer' | 'editor' | 'commenter';
}

export interface IProject extends Document {
  name: string;
  canvasJSON: string;
  thumbnail?: string;
  userId: Types.ObjectId;
  folderId?: Types.ObjectId;
  variables?: { key: string; value?: string }[];
  collaborators: ICollaborator[];
  accessRequests: { userId: Types.ObjectId; status: 'pending' | 'denied' }[];
  comments: IComment[];
  createdAt: Date;
}

const projectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  canvasJSON: { type: String, default: '{}' },
  thumbnail: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder' },
  variables: { type: [{ key: String, value: String }], default: [] },
  collaborators: {
    type: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['viewer', 'editor', 'commenter'], default: 'viewer' }
    }],
    default: []
  },
  accessRequests: {
    type: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'denied'], default: 'pending' }
    }],
    default: []
  },
  comments: {
    type: [{
      id: String,
      text: String,
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      x: Number,
      y: Number,
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  createdAt: { type: Date, default: Date.now },
});

export const Project = mongoose.model<IProject>('Project', projectSchema);
