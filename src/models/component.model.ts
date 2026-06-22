import mongoose, { Schema, Document, Types } from 'mongoose';
import { DocumentElement } from '../domain/document-element';
import { PageFormat } from '../domain/page-format';

export type ComponentType =
  | 'header'
  | 'footer'
  | 'cover'
  | 'table'
  | 'text-section'
  | 'info-box'
  | 'signature'
  | 'graphic';

export interface IComponentVariant {
  pageFormat: PageFormat;
  width: number;
  height: number;
  elements: DocumentElement[];
}

export interface IComponentDefinition extends Document {
  name: string;
  type: ComponentType;
  tags: string[];
  thumbnail?: string;
  visibility: 'private' | 'team' | 'public';
  ownerId: Types.ObjectId;
  variants: IComponentVariant[];
  createdAt: Date;
}

const variantSchema = new Schema(
  {
    pageFormat: { type: Schema.Types.Mixed, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    elements: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const componentSchema = new Schema<IComponentDefinition>({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['header', 'footer', 'cover', 'table', 'text-section', 'info-box', 'signature', 'graphic'],
    required: true,
  },
  tags: { type: [String], default: [] },
  thumbnail: { type: String },
  visibility: { type: String, enum: ['private', 'team', 'public'], default: 'private' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  variants: { type: [variantSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const ComponentDefinition = mongoose.model<IComponentDefinition>('ComponentDefinition', componentSchema, 'components');
