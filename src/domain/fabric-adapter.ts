import { DocumentElement, TextElement, TextStyleRange } from './document-element';

let counter = 0;
function elementId(obj: any): string {
  if (obj.id) return String(obj.id);
  counter += 1;
  return `el_${Date.now()}_${counter}`;
}

function fabricTextToElement(obj: any, x: number, y: number, width: number, height: number): TextElement {
  const fontSize = (obj.fontSize || 20) * (obj.scaleX || 1);
  const styleRanges: TextStyleRange[] = Array.isArray(obj.styles)
    ? obj.styles.map((r: any) => ({
        start: r.start,
        end: r.end,
        fontWeight: r.style?.fontWeight,
        fontStyle: r.style?.fontStyle,
        color: r.style?.fill,
        underline: r.style?.underline,
      }))
    : [];

  return {
    id: elementId(obj),
    type: 'text',
    x,
    y,
    width,
    height,
    text: obj.text || '',
    fontSize,
    fontFamily: obj.fontFamily,
    fontWeight: obj.fontWeight,
    fontStyle: obj.fontStyle,
    color: obj.fill || '#000000',
    textAlign: obj.textAlign || 'left',
    lineHeight: obj.lineHeight || 1.16,
    underline: !!obj.underline,
    styleRanges,
  };
}

/**
 * Único punto del backend que conoce la forma de un objeto serializado por Fabric.js.
 * Convierte (de forma recursiva para 'group') a DocumentElement[] con coordenadas
 * absolutas en top-left, sin scaleX/scaleY/origin — esos conceptos de Fabric ya
 * quedan resueltos aquí y no se propagan al resto del backend.
 */
export function fabricObjectToDocumentElement(obj: any, offsetX = 0, offsetY = 0): DocumentElement[] {
  if (!obj || !obj.type) return [];

  const scaleX = obj.scaleX || 1;
  const scaleY = obj.scaleY || 1;
  const width = (obj.width || 0) * scaleX;
  const height = (obj.height || 0) * scaleY;
  let x = (obj.left || 0) + offsetX;
  let y = (obj.top || 0) + offsetY;
  if (obj.originX === 'center') x -= width / 2;
  if (obj.originY === 'center') y -= height / 2;

  switch (obj.type) {
    case 'rect':
      return [{ id: elementId(obj), type: 'rect', x, y, width, height, fill: obj.fill || '#cccccc' }];

    case 'image': {
      const src = obj.src || obj.originalSrc;
      if (!src) return [];
      return [{ id: elementId(obj), type: 'image', x, y, width, height, src }];
    }

    case 'textbox':
    case 'text':
    case 'i-text':
      return [fabricTextToElement(obj, x, y, width, height)];

    case 'group': {
      if (!Array.isArray(obj.objects)) return [];
      const centerX = x + (obj.originX === 'center' ? 0 : width / 2);
      const centerY = y + (obj.originY === 'center' ? 0 : height / 2);
      const children: DocumentElement[] = [];
      for (const child of obj.objects) {
        const scaledChild = {
          ...child,
          left: centerX + (child.left || 0) * scaleX,
          top: centerY + (child.top || 0) * scaleY,
          scaleX: (child.scaleX || 1) * scaleX,
          scaleY: (child.scaleY || 1) * scaleY,
        };
        children.push(...fabricObjectToDocumentElement(scaledChild, 0, 0));
      }
      return children;
    }

    default:
      return [];
  }
}

export function fabricCanvasToDocumentElements(canvasJson: any): DocumentElement[] {
  if (!canvasJson || !Array.isArray(canvasJson.objects)) return [];
  const elements: DocumentElement[] = [];
  for (const obj of canvasJson.objects) {
    elements.push(...fabricObjectToDocumentElement(obj));
  }
  return elements;
}
