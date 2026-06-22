interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  fill: string;
  borderRadius?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export interface TextStyleRange {
  start: number;
  end: number;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  underline?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  underline?: boolean;
  styleRanges?: TextStyleRange[];
}

export interface TableElement extends BaseElement {
  type: 'table';
  variableKey: string;
  columns: string[];
  headerColor?: string;
  rowColor?: string;
  fontSize?: number;
  showBorder?: boolean;
  borderRadius?: number;
}

export interface SignatureElement extends BaseElement {
  type: 'signature';
  label?: string;
  lineColor?: string;
}

export interface GroupElement extends BaseElement {
  type: 'group';
  children: DocumentElement[];
}

export type DocumentElement =
  | RectElement
  | ImageElement
  | TextElement
  | TableElement
  | SignatureElement
  | GroupElement;
