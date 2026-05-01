import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAsset extends Document {
  url: string;
  filename: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const assetSchema = new Schema<IAsset>({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Asset = mongoose.model<IAsset>('Asset', assetSchema);
