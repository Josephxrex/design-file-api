export type StandardPageFormatName = 'A4' | 'LETTER' | 'LEGAL';

export type PageFormat =
  | StandardPageFormatName
  | { width: number; height: number };

export const STANDARD_FORMATS: Record<StandardPageFormatName, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },
  LETTER: { width: 816, height: 1056 },
  LEGAL: { width: 816, height: 1344 },
};

export function getPageFormatDimensions(format: PageFormat): { width: number; height: number } {
  if (typeof format === 'string') return STANDARD_FORMATS[format];
  return format;
}

export function resolvePageFormat(width: number, height: number): PageFormat {
  const match = (Object.keys(STANDARD_FORMATS) as StandardPageFormatName[]).find((name) => {
    const dims = STANDARD_FORMATS[name];
    return dims.width === width && dims.height === height;
  });
  return match || { width, height };
}

export function pageFormatsMatch(a: PageFormat, b: PageFormat): boolean {
  const dimsA = getPageFormatDimensions(a);
  const dimsB = getPageFormatDimensions(b);
  return dimsA.width === dimsB.width && dimsA.height === dimsB.height;
}
