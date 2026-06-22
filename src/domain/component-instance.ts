import { DocumentElement } from './document-element';
import { PageFormat } from './page-format';
import { PlacementRule } from './placement-rule';

export interface ComponentVariant {
  pageFormat: PageFormat;
  width: number;
  height: number;
  elements: DocumentElement[];
}

export interface ComponentInstance {
  id: string;
  componentDefinitionId: string;
  mode: 'linked' | 'detached';
  placement: PlacementRule;
  zIndex?: number;
  /** Solo aplica cuando mode === 'detached': copia propia de los elementos, ya independiente del catálogo. */
  detachedElements?: DocumentElement[];
  /** Tamaño declarado del componente en el momento de desvincularlo (para poder seguir recortando su contenido a esos límites). */
  detachedWidth?: number;
  detachedHeight?: number;
}
