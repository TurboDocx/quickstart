import { writeFileSync } from 'fs';
import { generateDocx } from './lib/generateDocx.js';

const html = `
<h1>Sample Document</h1>
<p>This document was generated from HTML using <strong>@turbodocx/html-to-docx</strong>.</p>
<h2>Features</h2>
<ul>
  <li>Converts HTML to Word documents</li>
  <li>No Puppeteer, Chrome, or LibreOffice needed</li>
  <li>Supports tables, images, lists, and more</li>
</ul>
<h2>Example Table</h2>
<table>
  <tr><th>Item</th><th>Status</th></tr>
  <tr><td>Setup</td><td>Complete</td></tr>
  <tr><td>Testing</td><td>In Progress</td></tr>
</table>
<p>Generated on: ${new Date().toLocaleDateString()}</p>
`;

const buffer = await generateDocx(html);
writeFileSync('output.docx', buffer);
console.log('Document written to output.docx');
