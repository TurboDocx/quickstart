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
    header?: number;
    footer?: number;
  };
  title?: string;
  subject?: string;
  creator?: string;
  [key: string]: unknown;
}

const defaultOptions: GenerateDocxOptions = {
  font: 'Arial',
  fontSize: 24, // 12pt (half-points)
  margins: {
    top: 1440,    // 1 inch
    right: 1440,
    bottom: 1440,
    left: 1440,
    header: 720,
    footer: 720,
  },
};

export async function generateDocx(
  html: string,
  options?: GenerateDocxOptions,
  headerHtml?: string | null,
  footerHtml?: string | null,
): Promise<Buffer> {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    margins: {
      ...defaultOptions.margins,
      ...options?.margins,
    },
  };

  const buffer = await HTMLtoDOCX(
    html,
    headerHtml ?? undefined,
    mergedOptions,
    footerHtml ?? undefined,
  );

  return buffer;
}
