import type { FastifyInstance } from 'fastify';
import { Project } from '../models/project.model';
import { Template } from '../models/template.model';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';

export default async function renderRoutes(fastify: FastifyInstance) {
  const logFile = 'render_debug.log';
  const debugLog = (msg: string) => {
    console.log(msg);
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
  };

  fastify.post('/:id/render', async (request: any, reply) => {
    const { id } = request.params;
    const { values } = request.body;

    let source: any = await Project.findById(id);
    if (!source) source = await Template.findById(id);
    if (!source) return reply.status(404).send({ message: 'Recurso no encontrado' });

    debugLog(`🖨️ Procesando: ${source.name}`);

    const SCALE = 1.0;
    const widthPx = source.width || 794;
    const heightPx = source.height || 1123;
    const pageSize = [widthPx * SCALE, heightPx * SCALE];

    const doc = new PDFDocument({ size: pageSize, margin: 0 });
    const chunks: any[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      let pagesData: any[] = [];
      try {
        const parsed = JSON.parse(source.canvasJSON || '{}');
        if (Array.isArray(parsed)) pagesData = parsed;
        else if (parsed.pages && Array.isArray(parsed.pages)) pagesData = parsed.pages;
        else pagesData = [parsed];
      } catch (e) {
        debugLog(`❌ Error JSON: ${e}`);
        pagesData = [];
      }

      // --- HELPERS ---
      const getPDFFont = (fontWeight: any, fontStyle: string) => {
        const fw = String(fontWeight || 'normal').toLowerCase();
        const fsStr = String(fontStyle || 'normal').toLowerCase();
        const isBold = fw === 'bold' || (!isNaN(Number(fw)) && Number(fw) >= 600);
        const isItalic = fsStr === 'italic' || fsStr === 'oblique';
        if (isBold && isItalic) return 'Helvetica-BoldOblique';
        if (isBold) return 'Helvetica-Bold';
        if (isItalic) return 'Helvetica-Oblique';
        return 'Helvetica';
      };

      const renderRichText = (pdfDoc: any, obj: any, x: number, y: number, width: number, values: any) => {
        // 1. Construir mapa de estilos ANTES de reemplazar variables
        //    Fabric guarda styles como array de rangos: [{start, end, style}]
        const rawStyles: any[] = Array.isArray(obj.styles) ? obj.styles : [];

        // 2. Reemplazar variables en el texto Y ajustar los rangos simultáneamente
        let text = obj.text || '';
        
        // Crear lista de rangos mutable que actualizaremos al reemplazar
        let styleRanges: { start: number; end: number; style: any }[] = rawStyles.map(r => ({
          start: r.start,
          end: r.end,
          style: r.style || {}
        }));

        Object.keys(values || {}).forEach(key => {
          const placeholder = `{{${key}}}`;
          const value = String(values[key] || '');
          let idx = text.indexOf(placeholder);
          while (idx !== -1) {
            const diff = value.length - placeholder.length;
            // Ajustar todos los rangos de estilo para que apunten a las posiciones correctas
            styleRanges = styleRanges.map(range => {
              if (range.end <= idx) {
                // Rango completamente antes del placeholder: sin cambio
                return range;
              } else if (range.start >= idx + placeholder.length) {
                // Rango completamente después del placeholder: desplazar
                return { start: range.start + diff, end: range.end + diff, style: range.style };
              } else {
                // Rango que se superpone con el placeholder: extender/contraer para cubrir el valor
                const newStart = Math.min(range.start, idx);
                const newEnd = Math.max(range.end, idx + placeholder.length) + diff;
                return { start: newStart, end: newEnd, style: range.style };
              }
            });
            text = text.substring(0, idx) + value + text.substring(idx + placeholder.length);
            idx = text.indexOf(placeholder, idx + value.length);
          }
        });

        // 3. Construir mapa de estilos POR CARÁCTER con las posiciones ya actualizadas
        const charStyleMap = new Map<number, any>();
        styleRanges.forEach(range => {
          for (let ci = range.start; ci < range.end; ci++) {
            charStyleMap.set(ci, range.style);
          }
        });

        const realFontSize = (obj.fontSize || 20) * (obj.scaleX || 1) * SCALE;
        const baseFill = obj.fill || 'black';
        const textAlign = obj.textAlign || 'left';
        const lineHeight = obj.lineHeight || 1.16;

        // 4. Función para obtener el estilo efectivo de un carácter (carácter override > objeto base)
        const getCharStyle = (absIdx: number) => {
          const s = charStyleMap.get(absIdx) || {};
          return {
            fw: s.fontWeight !== undefined ? s.fontWeight : obj.fontWeight,
            fs: s.fontStyle !== undefined ? s.fontStyle : obj.fontStyle,
            fill: s.fill !== undefined ? s.fill : obj.fill,
            und: s.underline !== undefined ? s.underline : obj.underline
          };
        };

        // 5. Renderizado línea a línea con segmentos de estilo
        pdfDoc.save();
        const lines = text.split('\n');
        let currentY = y;
        let absOffset = 0;

        lines.forEach((lineText: string) => {
          if (lineText.length === 0) {
            absOffset += 1;
            currentY += realFontSize * lineHeight;
            return;
          }

          // Agrupar caracteres por estilo contiguo
          const segments: any[] = [];
          let curStyle = getCharStyle(absOffset);
          let curSeg = {
            text: lineText[0],
            font: getPDFFont(curStyle.fw, curStyle.fs),
            fill: curStyle.fill || baseFill,
            und: !!curStyle.und
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

          // Para texto justify con un solo segmento: PDFKit lo maneja perfectamente.
          // Para texto justify con múltiples segmentos: usamos continued:true.
          // Nota: justify+continued en PDFKit solo es perfecto en texto de un segmento,
          // pero es la mejor aproximación sin reimplementar el motor de layout.
          segments.forEach((seg, sIdx) => {
            pdfDoc.font(seg.font).fontSize(realFontSize).fillColor(seg.fill);
            const opts: any = {
              width: width > 0 ? width : undefined,
              align: textAlign,
              continued: sIdx < segments.length - 1,
              underline: seg.und,
              lineBreak: false  // Controlamos los saltos manualmente
            };
            if (sIdx === 0) pdfDoc.text(seg.text, x, currentY, opts);
            else pdfDoc.text(seg.text, opts);
          });

          // Avanzar Y basándonos en la línea completa con el font base del objeto
          pdfDoc.font(getPDFFont(obj.fontWeight, obj.fontStyle)).fontSize(realFontSize);
          const lineH = pdfDoc.heightOfString(lineText, {
            width: width > 0 ? width : undefined
          });
          currentY += Math.max(lineH, realFontSize * lineHeight);
          absOffset += lineText.length + 1;
        });

        pdfDoc.restore();
      };

      const renderFabricObject = async (pdfDoc: any, obj: any, offsetX = 0, offsetY = 0) => {
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        const width = (obj.width || 0) * scaleX * SCALE;
        const height = (obj.height || 0) * scaleY * SCALE;
        let x = obj.left * SCALE + offsetX;
        let y = obj.top * SCALE + offsetY;
        if (obj.originX === 'center') x -= width / 2;
        if (obj.originY === 'center') y -= height / 2;

        if (obj.type === 'rect') {
          pdfDoc.save().rect(x, y, width, height).fill(obj.fill || '#ccc').restore();
        } else if (obj.type === 'image') {
          const src = obj.src || obj.originalSrc;
          if (src) {
            try {
              const res = await axios.get(src, { responseType: 'arraybuffer' });
              pdfDoc.image(res.data, x, y, { width, height });
            } catch (e) { }
          }
        } else if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
          renderRichText(pdfDoc, obj, x, y, width, values);
        } else if (obj.type === 'group') {
          if (obj.objects) {
            const centerX = x + (obj.originX === 'center' ? 0 : width / 2);
            const centerY = y + (obj.originY === 'center' ? 0 : height / 2);
            for (const child of obj.objects) {
              const childX = centerX + child.left * scaleX * SCALE;
              const childY = centerY + child.top * scaleY * SCALE;
              const scaledChild = {
                ...child,
                left: childX,
                top: childY,
                scaleX: (child.scaleX || 1) * scaleX,
                scaleY: (child.scaleY || 1) * scaleY
              };
              await renderFabricObject(pdfDoc, scaledChild, 0, 0);
            }
          }
        }
      };

      for (let i = 0; i < pagesData.length; i++) {
        if (i > 0) doc.addPage();
        const p = pagesData[i];
        const canvas = p.json || (p.objects ? p : (p.canvas || p));
        if (canvas && canvas.objects) {
          for (const obj of canvas.objects) {
            await renderFabricObject(doc, obj);
          }
        } else {
          debugLog(`⚠️ Página ${i} vacía. Keys: ${Object.keys(p).join(',')}`);
        }
      }
      doc.end();
    });

    reply.header('Content-Type', 'application/pdf').send(pdfBuffer);
  });
}
