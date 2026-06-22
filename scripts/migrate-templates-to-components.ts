/**
 * Migración manual, NO destructiva: lee la colección `templates` y crea un
 * ComponentDefinition equivalente (con una variante) en la colección `components`
 * para cada template de categoría header/footer/component. No borra ni modifica
 * `templates`. Los templates de categoría 'page'/'document' se omiten porque
 * representan documentos completos, no piezas reutilizables del catálogo.
 *
 * Uso: npx ts-node-dev --transpile-only scripts/migrate-templates-to-components.ts [ownerIdFallback]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/db';
import { Template } from '../src/models/template.model';
import { ComponentDefinition, ComponentType } from '../src/models/component.model';
import { User } from '../src/models/user.model';
import { fabricCanvasToDocumentElements } from '../src/domain/fabric-adapter';
import { resolvePageFormat } from '../src/domain/page-format';

const CATEGORY_TO_TYPE: Record<string, ComponentType | undefined> = {
  header: 'header',
  footer: 'footer',
  component: 'info-box',
};

async function resolveFallbackOwnerId(cliArg?: string): Promise<string | null> {
  if (cliArg) return cliArg;
  const firstUser = await User.findOne();
  return firstUser ? String(firstUser._id) : null;
}

async function run() {
  await connectDB();
  const fallbackOwnerId = await resolveFallbackOwnerId(process.argv[2]);

  const templates = await Template.find();
  let migrated = 0;
  let skipped = 0;

  for (const tpl of templates) {
    const type = CATEGORY_TO_TYPE[tpl.category];
    if (!type) {
      console.log(`omitido "${tpl.name}" (categoría '${tpl.category}' no es parte del catálogo de componentes)`);
      skipped++;
      continue;
    }

    const ownerId = tpl.userId ? String(tpl.userId) : fallbackOwnerId;
    if (!ownerId) {
      console.log(`omitido "${tpl.name}" (sin userId y no hay usuario de respaldo disponible)`);
      skipped++;
      continue;
    }

    let canvasJson: any;
    try {
      canvasJson = JSON.parse(tpl.canvasJSON || '{}');
    } catch {
      console.log(`omitido "${tpl.name}" (canvasJSON inválido)`);
      skipped++;
      continue;
    }

    const width = tpl.width || 794;
    const height = tpl.height || 120;
    const pageFormat = resolvePageFormat(width, height);
    const elements = fabricCanvasToDocumentElements(canvasJson);

    await new ComponentDefinition({
      name: tpl.name,
      type,
      ownerId,
      visibility: 'private',
      variants: [{ pageFormat, width, height, elements }],
    }).save();

    migrated++;
    console.log(`migrado "${tpl.name}" -> components (${elements.length} elementos)`);
  }

  console.log(`\nListo: ${migrated} migrados, ${skipped} omitidos.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error en la migración:', err);
  process.exit(1);
});
