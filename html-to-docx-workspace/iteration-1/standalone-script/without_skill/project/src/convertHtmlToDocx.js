import { writeFile } from "fs/promises";
import HTMLtoDOCX from "@turbodocx/html-to-docx";

/**
 * Convert an HTML string to a DOCX buffer.
 *
 * @param {string} htmlString - The HTML content to convert.
 * @param {string} [headerHTMLString] - Optional HTML for the document header.
 * @param {string} [footerHTMLString] - Optional HTML for the document footer.
 * @param {object} [documentOptions] - Optional configuration passed to html-to-docx.
 * @returns {Promise<Buffer>} The generated DOCX file as a Buffer.
 */
export async function convertHtmlToDocx(
  htmlString,
  headerHTMLString = "",
  footerHTMLString = "",
  documentOptions = {}
) {
  if (!htmlString) {
    throw new Error("htmlString is required");
  }

  const defaultOptions = {
    margin: {
      top: 720,    // half-inch in twips
      right: 720,
      bottom: 720,
      left: 720,
    },
    title: "",
    ...documentOptions,
  };

  const docxBuffer = await HTMLtoDOCX(
    htmlString,
    headerHTMLString,
    defaultOptions,
    footerHTMLString
  );

  return docxBuffer;
}

/**
 * Convert an HTML string and write the result directly to a file.
 *
 * @param {string} htmlString - The HTML content to convert.
 * @param {string} outputPath - Destination file path (e.g. "./output.docx").
 * @param {object} [options] - Optional settings.
 * @param {string} [options.headerHTML] - HTML for the document header.
 * @param {string} [options.footerHTML] - HTML for the document footer.
 * @param {object} [options.documentOptions] - Configuration passed to html-to-docx.
 * @returns {Promise<void>}
 */
export async function convertHtmlToDocxFile(
  htmlString,
  outputPath,
  { headerHTML = "", footerHTML = "", documentOptions = {} } = {}
) {
  const buffer = await convertHtmlToDocx(
    htmlString,
    headerHTML,
    footerHTML,
    documentOptions
  );

  await writeFile(outputPath, buffer);
}
