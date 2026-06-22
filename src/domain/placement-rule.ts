export type PlacementRule =
  | { type: 'all' }
  | { type: 'first' }
  | { type: 'last' }
  | { type: 'odd' }
  | { type: 'even' }
  | { type: 'range'; range: [number, number] };

/**
 * pageIndex es 0-based. range es 1-based inclusive (página 1 = primera página),
 * para que coincida con cómo un usuario no técnico piensa en números de página.
 */
export function appliesPlacement(rule: PlacementRule, pageIndex: number, totalPages: number): boolean {
  const pageNumber = pageIndex + 1;
  switch (rule.type) {
    case 'all':
      return true;
    case 'first':
      return pageIndex === 0;
    case 'last':
      return pageIndex === totalPages - 1;
    case 'odd':
      return pageNumber % 2 === 1;
    case 'even':
      return pageNumber % 2 === 0;
    case 'range':
      return pageNumber >= rule.range[0] && pageNumber <= rule.range[1];
    default:
      return false;
  }
}
