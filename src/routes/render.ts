import type { FastifyInstance } from 'fastify';
import { Project } from '../models/project.model';
import { Template } from '../models/template.model';
import { ComponentDefinition } from '../models/component.model';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';
import { fabricCanvasToDocumentElements } from '../domain/fabric-adapter';
import { resolveDocumentPages, ComponentDefinitionLookup, ResolvedPage } from '../domain/document-resolver';
import { resolvePageFormat, pageFormatsMatch, PageFormat } from '../domain/page-format';
import { ComponentVariant } from '../domain/component-instance';
import { DocumentElement } from '../domain/document-element';
import { renderDocumentElement } from '../render/pdfkit-renderer';

export default async function renderRoutes(fastify: FastifyInstance) {
  const logFile = 'render_debug.log';
  const debugLog = (msg: string) => {
    console.log(msg);
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
  };

  const fetchImage = async (src: string): Promise<Buffer> => {
    const res = await axios.get(src, { responseType: 'arraybuffer' });
    return res.data;
  };

  async function buildComponentLookup(componentDefinitionIds: string[]): Promise<ComponentDefinitionLookup> {
    const defs = await ComponentDefinition.find({ _id: { $in: componentDefinitionIds } });
    const byId = new Map(defs.map((d) => [String(d._id), d]));
    return {
      getVariant(componentDefinitionId: string, pageFormat: PageFormat): ComponentVariant | undefined {
        const def = byId.get(componentDefinitionId);
        if (!def) return undefined;
        return def.variants.find((v) => pageFormatsMatch(v.pageFormat, pageFormat));
      },
      getType(componentDefinitionId: string): string | undefined {
        return byId.get(componentDefinitionId)?.type;
      },
    };
  }

  function parsePagesData(canvasJSON: string | undefined): any[] {
    try {
      const parsed = JSON.parse(canvasJSON || '{}');
      if (Array.isArray(parsed)) return parsed;
      if (parsed.pages && Array.isArray(parsed.pages)) return parsed.pages;
      return [parsed];
    } catch (e) {
      debugLog(`❌ Error JSON: ${e}`);
      return [];
    }
  }

  fastify.post('/:id/render', async (request: any, reply) => {
    const { id } = request.params;
    const { values } = request.body;

    let source: any = await Project.findById(id);
    if (!source) source = await Template.findById(id);
    if (!source) return reply.status(404).send({ message: 'Recurso no encontrado' });

    debugLog(`🖨️ Procesando: ${source.name}`);

    const widthPx = source.width || 794;
    const heightPx = source.height || 1123;
    const documentPageFormat: PageFormat = source.pageFormat || resolvePageFormat(widthPx, heightPx);

    const doc = new PDFDocument({ size: [widthPx, heightPx], margin: 0 });
    const chunks: any[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfBuffer = await new Promise<Buffer>(async (resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pagesData = parsePagesData(source.canvasJSON);
      const pagesOwnElements: DocumentElement[][] = pagesData.map((p) => {
        const canvas = p.json || (p.objects ? p : p.canvas || p);
        return fabricCanvasToDocumentElements(canvas);
      });

      let resolvedPages: ResolvedPage[];
      const componentInstances = source.componentInstances || [];
      if (componentInstances.length > 0) {
        const lookup = await buildComponentLookup(componentInstances.map((ci: any) => ci.componentDefinitionId));
        resolvedPages = resolveDocumentPages(pagesOwnElements, componentInstances, documentPageFormat, lookup);
      } else {
        resolvedPages = pagesOwnElements.map((ownElements) => ({ ownElements, componentRegions: [] }));
      }

      for (let i = 0; i < resolvedPages.length; i++) {
        if (i > 0) doc.addPage();
        const page = resolvedPages[i];

        for (const element of page.ownElements) {
          await renderDocumentElement(doc, element, values, fetchImage);
        }

        // Cada componente vinculado (header/footer/etc) se dibuja recortado a su área
        // declarada, para que nada de su contenido se "escape" fuera de esos límites.
        for (const region of page.componentRegions) {
          doc.save();
          doc.rect(region.x, region.y, region.width, region.height).clip();
          for (const element of region.elements) {
            await renderDocumentElement(doc, element, values, fetchImage);
          }
          doc.restore();
        }
      }

      doc.end();
    });

    reply.header('Content-Type', 'application/pdf').send(pdfBuffer);
  });
}
