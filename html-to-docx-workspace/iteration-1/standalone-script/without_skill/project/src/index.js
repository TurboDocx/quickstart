import { convertHtmlToDocxFile } from "./convertHtmlToDocx.js";

const html = `
<h1>Hello from html-to-docx</h1>
<p>This document was generated from an <strong>HTML string</strong> using
<code>@turbodocx/html-to-docx</code>.</p>
<ul>
  <li>Item one</li>
  <li>Item two</li>
  <li>Item three</li>
</ul>
`;

const outputPath = new URL("../output.docx", import.meta.url).pathname;

await convertHtmlToDocxFile(html, outputPath);
console.log(`DOCX written to ${outputPath}`);
