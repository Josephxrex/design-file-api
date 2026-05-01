import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const folderSchema = new Schema<IFolder>({
  name: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Folder = mongoose.model<IFolder>('Folder', folderSchema);
