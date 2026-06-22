import { ComponentInstance, ComponentVariant } from './component-instance';
import { DocumentElement } from './document-element';
import { appliesPlacement } from './placement-rule';
import { PageFormat, pageFormatsMatch, getPageFormatDimensions } from './page-format';

export interface ResolvedComponentRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  elements: DocumentElement[];
}

export interface ResolvedPage {
  ownElements: DocumentElement[];
  componentRegions: ResolvedComponentRegion[];
}

export interface ComponentDefinitionLookup {
  getVariant(componentDefinitionId: string, pageFormat: PageFormat): ComponentVariant | undefined;
  getType(componentDefinitionId: string): string | undefined;
}

/**
 * Combina el contenido propio de cada página con los ComponentInstance cuyo
 * placement aplique a ese índice. Esta es la pieza que reemplaza el clonado manual
 * de headers/footers: el componente se referencia una sola vez y se materializa
 * aquí en cada render/preview, nunca se duplica en el dato guardado.
 *
 * Cada componente se devuelve como una "región" con su propia posición (header
 * arriba, footer abajo, el resto centrado) y sus límites exactos — el caller debe
 * recortar (clip) el dibujo de sus elementos a esos límites, para que nada se
 * salga del área declarada del componente.
 */
export function resolveDocumentPages(
  pagesOwnElements: DocumentElement[][],
  componentInstances: ComponentInstance[],
  documentPageFormat: PageFormat,
  lookup: ComponentDefinitionLookup
): ResolvedPage[] {
  const totalPages = pagesOwnElements.length;
  const pageDims = getPageFormatDimensions(documentPageFormat);

  return pagesOwnElements.map((ownElements, pageIndex) => {
    const componentRegions: ResolvedComponentRegion[] = [];

    const sortedInstances = [...componentInstances].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (const instance of sortedInstances) {
      if (!appliesPlacement(instance.placement, pageIndex, totalPages)) continue;

      const resolved = resolveInstanceRegion(instance, documentPageFormat, pageDims, lookup);
      if (!resolved) continue;
      componentRegions.push(resolved);
    }

    return { ownElements, componentRegions };
  });
}

function resolveInstanceRegion(
  instance: ComponentInstance,
  documentPageFormat: PageFormat,
  pageDims: { width: number; height: number },
  lookup: ComponentDefinitionLookup
): ResolvedComponentRegion | null {
  let elements: DocumentElement[];
  let width: number;
  let height: number;

  if (instance.mode === 'detached') {
    elements = instance.detachedElements || [];
    width = instance.detachedWidth ?? 0;
    height = instance.detachedHeight ?? 0;
  } else {
    const variant = lookup.getVariant(instance.componentDefinitionId, documentPageFormat);
    if (!variant || !pageFormatsMatch(variant.pageFormat, documentPageFormat)) return null;
    elements = variant.elements;
    width = variant.width;
    height = variant.height;
  }

  if (!elements.length || !width || !height) return null;

  const type = lookup.getType(instance.componentDefinitionId);
  const { x, y } = overlayPosition(type, width, height, pageDims);
  const translated = elements.map((el) => translateElement(el, x, y, instance.zIndex));

  return { x, y, width, height, elements: translated };
}

/** Header va arriba, footer va abajo, el resto se centra en la página. */
function overlayPosition(
  type: string | undefined,
  width: number,
  height: number,
  pageDims: { width: number; height: number }
): { x: number; y: number } {
  if (type === 'footer') return { x: 0, y: pageDims.height - height };
  if (type === 'header') return { x: 0, y: 0 };
  return { x: (pageDims.width - width) / 2, y: (pageDims.height - height) / 2 };
}

function translateElement(el: DocumentElement, dx: number, dy: number, zIndex?: number): DocumentElement {
  const base = { ...el, x: el.x + dx, y: el.y + dy, ...(zIndex !== undefined ? { zIndex } : {}) };
  if (el.type === 'group') {
    return { ...base, children: el.children.map((c) => translateElement(c, 0, 0)) } as DocumentElement;
  }
  return base as DocumentElement;
}
