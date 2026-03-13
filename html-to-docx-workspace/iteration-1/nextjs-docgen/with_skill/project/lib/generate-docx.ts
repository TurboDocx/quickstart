import HTMLtoDOCX from '@turbodocx/html-to-docx';

export interface GenerateDocxOptions {
  orientation?: 'portrait' | 'landscape';
  font?: string;
  fontSize?: number;
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  title?: string;
  subject?: string;
  creator?: string;
  headerHtml?: string;
  footerHtml?: string;
  header?: boolean;
  footer?: boolean;
  pageNumber?: boolean;
}

const DEFAULT_OPTIONS = {
  font: 'Arial',
  fontSize: 24, // 12pt (half-points)
  margins: {
    top: 1440,    // 1 inch
    right: 1440,
    bottom: 1440,
    left: 1440,
  },
};

/**
 * Convert an HTML string to a DOCX Buffer.
 *
 * Uses @turbodocx/html-to-docx under the hood. All options are optional
 * and sensible defaults (Arial 12pt, 1-inch margins) are applied.
 */
export async function generateDocx(
  html: string,
  options: GenerateDocxOptions = {},
): Promise<Buffer> {
  const {
    headerHtml,
    footerHtml,
    header,
    footer,
    pageNumber,
    ...rest
  } = options;

  const documentOptions = {
    ...DEFAULT_OPTIONS,
    ...rest,
    margins: { ...DEFAULT_OPTIONS.margins, ...rest.margins },
    ...(header != null && { header }),
    ...(footer != null && { footer }),
    ...(pageNumber != null && { pageNumber }),
  };

  const buffer = await HTMLtoDOCX(
    html,
    headerHtml ?? null,
    documentOptions,
    footerHtml ?? null,
  );

  return buffer;
}
