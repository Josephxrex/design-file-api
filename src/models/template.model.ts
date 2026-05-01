import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITemplate extends Document {
  name: string;
  category: 'header' | 'footer' | 'page' | 'component';
  canvasJSON: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  userId?: Types.ObjectId;
  createdAt: Date;
}

const templateSchema = new Schema<ITemplate>({
  name: { type: String, required: true },
  category: { type: String, enum: ['header', 'footer', 'page', 'component'], required: true },
  canvasJSON: { type: String, required: true },
  thumbnail: { type: String },
  width: { type: Number },
  height: { type: Number },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export const Template = mongoose.model<ITemplate>('Template', templateSchema);
