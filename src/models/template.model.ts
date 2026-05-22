import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITemplate extends Document {
  name: string;
  category: 'header' | 'footer' | 'page' | 'component' | 'document';
  canvasJSON: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  userId?: Types.ObjectId;
  variables?: any[]; // Reusamos la estructura de variables
  createdAt: Date;
}

const templateSchema = new Schema<ITemplate>({
  name: { type: String, required: true },
  category: { type: String, enum: ['header', 'footer', 'page', 'component', 'document'], required: true },
  canvasJSON: { type: String, required: true },
  thumbnail: { type: String },
  width: { type: Number },
  height: { type: Number },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  variables: { 
    type: [{ 
      key: { type: String, required: true },
      label: String,
      type: { type: String, enum: ['text', 'table'], default: 'text' },
      required: { type: Boolean, default: false },
      tableColumns: [String],
      tableHeaderColor: String,
      tableRowColor: String,
      tableFontSize: Number,
      tableShowBorder: { type: Boolean, default: true },
      tableBorderRadius: { type: Number, default: 0 }
    }], 
    default: [] 
  },
  createdAt: { type: Date, default: Date.now },
});

export const Template = mongoose.model<ITemplate>('Template', templateSchema);
