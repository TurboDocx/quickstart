import HTMLtoDOCX from '@turbodocx/html-to-docx';

/**
 * Default document options with sensible defaults for font, margins, and page size.
 * All measurements are in TWIP (1 inch = 1440 TWIP).
 */
const defaultOptions = {
  font: 'Arial',
  fontSize: 24, // 12pt (half-points)
  pageSize: {
    width: 12240,  // Letter width
    height: 15840, // Letter height
  },
  margins: {
    top: 1440,    // 1 inch
    right: 1440,
    bottom: 1440,
    left: 1440,
    header: 720,
    footer: 720,
  },
};

/**
 * Convert an HTML string to a DOCX buffer.
 *
 * @param {string} html - The HTML content to convert.
 * @param {object} [options] - Optional document options (font, margins, pageSize, etc.).
 *   Merged with sensible defaults. See @turbodocx/html-to-docx docs for all options.
 * @param {string} [headerHtml] - Optional HTML string for the page header.
 * @param {string} [footerHtml] - Optional HTML string for the page footer.
 * @returns {Promise<Buffer>} A buffer containing the .docx file bytes.
 */
export async function generateDocx(html, options = {}, headerHtml = null, footerHtml = null) {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    margins: { ...defaultOptions.margins, ...options.margins },
    pageSize: { ...defaultOptions.pageSize, ...options.pageSize },
  };

  // Enable header/footer flags if HTML is provided
  if (headerHtml) {
    mergedOptions.header = true;
  }
  if (footerHtml) {
    mergedOptions.footer = true;
  }

  const buffer = await HTMLtoDOCX(html, headerHtml, mergedOptions, footerHtml);
  return buffer;
}
