import { DocumentElement, TextElement, TextStyleRange } from '../domain/document-element';

const getPDFFont = (fontWeight: any, fontStyle: string | undefined) => {
  const fw = String(fontWeight || 'normal').toLowerCase();
  const fsStr = String(fontStyle || 'normal').toLowerCase();
  const isBold = fw === 'bold' || (!isNaN(Number(fw)) && Number(fw) >= 600);
  const isItalic = fsStr === 'italic' || fsStr === 'oblique';
  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
};

function renderTextElement(pdfDoc: any, el: TextElement, values: Record<string, any>) {
  // 1. Reemplazar placeholders {{key}} en el texto, ajustando los rangos de estilo en simultáneo.
  let text = el.text || '';
  let styleRanges: TextStyleRange[] = Array.isArray(el.styleRanges) ? [...el.styleRanges] : [];

  Object.keys(values || {}).forEach((key) => {
    const placeholder = `{{${key}}}`;
    const value = String(values[key] ?? '');
    let idx = text.indexOf(placeholder);
    while (idx !== -1) {
      const diff = value.length - placeholder.length;
      styleRanges = styleRanges.map((range) => {
        if (range.end <= idx) return range;
        if (range.start >= idx + placeholder.length) {
          return { ...range, start: range.start + diff, end: range.end + diff };
        }
        const newStart = Math.min(range.start, idx);
        const newEnd = Math.max(range.end, idx + placeholder.length) + diff;
        return { ...range, start: newStart, end: newEnd };
      });
      text = text.substring(0, idx) + value + text.substring(idx + placeholder.length);
      idx = text.indexOf(placeholder, idx + value.length);
    }
  });

  const charStyleMap = new Map<number, TextStyleRange>();
  styleRanges.forEach((range) => {
    for (let ci = range.start; ci < range.end; ci++) charStyleMap.set(ci, range);
  });

  const baseFill = el.color || 'black';
  const textAlign = el.textAlign || 'left';
  const lineHeight = el.lineHeight || 1.16;

  const getCharStyle = (absIdx: number) => {
    const s = charStyleMap.get(absIdx);
    return {
      fw: s?.fontWeight !== undefined ? s.fontWeight : el.fontWeight,
      fs: s?.fontStyle !== undefined ? s.fontStyle : el.fontStyle,
      fill: s?.color !== undefined ? s.color : el.color,
      und: s?.underline !== undefined ? s.underline : el.underline,
    };
  };

  pdfDoc.save();
  const lines = text.split('\n');
  let currentY = el.y;
  let absOffset = 0;

  lines.forEach((lineText: string) => {
    if (lineText.length === 0) {
      absOffset += 1;
      currentY += el.fontSize * lineHeight;
      return;
    }

    const segments: any[] = [];
    let curStyle = getCharStyle(absOffset);
    let curSeg = {
      text: lineText[0],
      font: getPDFFont(curStyle.fw, curStyle.fs),
      fill: curStyle.fill || baseFill,
      und: !!curStyle.und,
    };

    for (let i = 1; i < lineText.length; i++) {
      const s = getCharStyle(absOffset + i);
      const f = getPDFFont(s.fw, s.fs);
      const fill = s.fill || baseFill;
      const und = !!s.und;
      if (f === curSeg.font && fill === curSeg.fill && und === curSeg.und) {
        curSeg.text += lineText[i];
      } else {
        segments.push(curSeg);
        curSeg = { text: lineText[i], font: f, fill, und };
      }
    }
    segments.push(curSeg);

    segments.forEach((seg, sIdx) => {
      pdfDoc.font(seg.font).fontSize(el.fontSize).fillColor(seg.fill);
      const opts: any = {
        width: el.width > 0 ? el.width : undefined,
        align: textAlign,
        continued: sIdx < segments.length - 1,
        underline: seg.und,
        lineBreak: false,
      };
      if (sIdx === 0) pdfDoc.text(seg.text, el.x, currentY, opts);
      else pdfDoc.text(seg.text, opts);
    });

    pdfDoc.font(getPDFFont(el.fontWeight, el.fontStyle)).fontSize(el.fontSize);
    const lineH = pdfDoc.heightOfString(lineText, { width: el.width > 0 ? el.width : undefined });
    currentY += Math.max(lineH, el.fontSize * lineHeight);
    absOffset += lineText.length + 1;
  });

  pdfDoc.restore();
}

async function renderImageElement(pdfDoc: any, el: { src: string; x: number; y: number; width: number; height: number }, fetchImage: (src: string) => Promise<Buffer>) {
  try {
    const data = await fetchImage(el.src);
    pdfDoc.image(data, el.x, el.y, { width: el.width, height: el.height });
  } catch {
    // imagen no disponible: se omite en silencio, igual que el comportamiento previo
  }
}

function renderTableElement(pdfDoc: any, el: Extract<DocumentElement, { type: 'table' }>) {
  const headerHeight = Math.min(36, el.height);
  pdfDoc.save().rect(el.x, el.y, el.width, headerHeight).fill(el.headerColor || '#f1f5f9').restore();
  const colWidth = el.width / Math.max(el.columns.length, 1);
  pdfDoc.font('Helvetica-Bold').fontSize(el.fontSize || 12).fillColor('#1e293b');
  el.columns.forEach((label, i) => {
    pdfDoc.text(label, el.x + i * colWidth + 6, el.y + 10, { width: colWidth - 12 });
  });
  pdfDoc
    .save()
    .rect(el.x, el.y + headerHeight, el.width, el.height - headerHeight)
    .fill(el.rowColor || '#ffffff')
    .restore();
  if (el.showBorder) {
    pdfDoc.save().lineWidth(1).strokeColor('#cbd5e1').rect(el.x, el.y, el.width, el.height).stroke().restore();
  }
}

function renderSignatureElement(pdfDoc: any, el: Extract<DocumentElement, { type: 'signature' }>) {
  const lineY = el.y + el.height * 0.6;
  pdfDoc
    .save()
    .lineWidth(1)
    .strokeColor(el.lineColor || '#000000')
    .moveTo(el.x, lineY)
    .lineTo(el.x + el.width, lineY)
    .stroke()
    .restore();
  if (el.label) {
    pdfDoc.font('Helvetica').fontSize(10).fillColor('#000000').text(el.label, el.x, lineY + 4, { width: el.width, align: 'center' });
  }
}

export async function renderDocumentElement(
  pdfDoc: any,
  element: DocumentElement,
  values: Record<string, any>,
  fetchImage: (src: string) => Promise<Buffer>
) {
  switch (element.type) {
    case 'rect':
      pdfDoc.save().rect(element.x, element.y, element.width, element.height).fill(element.fill).restore();
      return;
    case 'image':
      await renderImageElement(pdfDoc, element, fetchImage);
      return;
    case 'text':
      renderTextElement(pdfDoc, element, values);
      return;
    case 'table':
      renderTableElement(pdfDoc, element);
      return;
    case 'signature':
      renderSignatureElement(pdfDoc, element);
      return;
    case 'group':
      for (const child of element.children) {
        const offsetChild = { ...child, x: element.x + child.x, y: element.y + child.y } as DocumentElement;
        await renderDocumentElement(pdfDoc, offsetChild, values, fetchImage);
      }
      return;
  }
}
