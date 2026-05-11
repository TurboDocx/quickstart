# @turbodocx/html-to-docx — API Reference

## Install

```bash
npm install @turbodocx/html-to-docx
# Optional for SVG image support:
npm install @turbodocx/html-to-docx sharp
```

## Import

```typescript
// ESM / TypeScript
import HTMLtoDOCX from '@turbodocx/html-to-docx';

// CommonJS
const HTMLtoDOCX = require('@turbodocx/html-to-docx');
```

## Function Signature

```typescript
async function HTMLtoDOCX(
  htmlString: string,              // Required: HTML content to convert
  headerHTMLString?: string,       // Optional: HTML for page header
  documentOptions?: DocumentOptions, // Optional: configuration
  footerHTMLString?: string        // Optional: HTML for page footer
): Promise<Buffer>
```

Returns a `Buffer` containing the .docx file bytes.

## Basic Usage

```typescript
import HTMLtoDOCX from '@turbodocx/html-to-docx';
import { writeFileSync } from 'fs';

const html = `
<h1>Quarterly Report</h1>
<p>Generated on ${new Date().toLocaleDateString()}</p>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Revenue</td><td>$1.2M</td></tr>
</table>
`;

const buffer = await HTMLtoDOCX(html);
writeFileSync('report.docx', buffer);
```

## Express Endpoint Example

```typescript
import { Router, Request, Response } from 'express';
import HTMLtoDOCX from '@turbodocx/html-to-docx';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { html, filename = 'document', options } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'html field is required' });
    }

    const buffer = await HTMLtoDOCX(html, null, options);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.docx"`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Document generation failed' });
  }
});

export default router;
```

## Configuration Options

### Page Layout

```typescript
const options = {
  orientation: 'portrait',  // 'portrait' | 'landscape'
  pageSize: {
    width: 12240,   // Letter width in TWIP (1/20th of a point)
    height: 15840,  // Letter height
  },
  margins: {
    top: 1440,     // 1 inch (1440 TWIP = 1 inch)
    right: 1800,
    bottom: 1440,
    left: 1800,
    header: 720,
    footer: 720,
  },
};
```

Common page sizes in TWIP:
- Letter: 12240 x 15840
- A4: 11906 x 16838
- Legal: 12240 x 20160

### Typography

```typescript
const options = {
  font: 'Arial',       // Default: 'Times New Roman'
  fontSize: 24,        // In half-points (24 = 12pt). Default: 22 (11pt)
};
```

### Heading Styles

```typescript
const options = {
  heading1: {
    font: 'Arial',
    fontSize: 32,     // 16pt
    bold: true,
    spacing: { before: 240, after: 120 },
  },
  heading2: {
    font: 'Arial',
    fontSize: 28,     // 14pt
    bold: true,
    spacing: { before: 200, after: 100 },
  },
};
```

### Headers and Footers

```typescript
const headerHtml = '<p style="text-align: center">Company Name</p>';
const footerHtml = '<p style="text-align: center">Confidential</p>';

const options = {
  header: true,
  footer: true,
  pageNumber: true,  // Adds page numbers to footer
};

const buffer = await HTMLtoDOCX(html, headerHtml, options, footerHtml);
```

### Document Metadata

```typescript
const options = {
  title: 'Quarterly Report',
  subject: 'Q4 2025 Financial Summary',
  creator: 'Report Generator',
  keywords: ['finance', 'quarterly'],
  description: 'Auto-generated financial report',
};
```

### Table Options

```typescript
const options = {
  table: {
    row: { cantSplit: true },
    borderOptions: { size: 1, color: '000000' },
  },
};
```

### Image Processing

```typescript
const options = {
  imageProcessing: {
    maxRetries: 2,
    downloadTimeout: 5000,
    maxImageSize: 10485760,     // 10MB
    svgHandling: 'convert',    // 'convert' (needs sharp) | 'native' (Office 2019+)
  },
};
```

### RTL Language Support

```typescript
const options = {
  direction: 'rtl',
  lang: 'ar-SA',
};
```

## Supported HTML Elements

**Structure:** h1-h6, p, div, span, br, hr
**Formatting:** strong/b, em/i, u, sub, sup, pre
**Tables:** table, thead, tbody, tr, td, th (with borders and styling)
**Lists:** ul, ol, li (decimal, upper/lower alpha, upper/lower roman)
**Media:** a (hyperlinks), img (base64, remote URLs, SVG)
**Page breaks:** `<div class="page-break"></div>` or `style="page-break-after: always"`

## Gotchas

- **Async function** — always `await` the result
- **No API keys needed** — this is a purely local library
- **SVG images** — install `sharp` for maximum compatibility (converts SVG to PNG for Word 2007+). Without sharp, SVGs use native embedding (Office 2019+ only)
- **TWIP units** — page sizes and margins use TWIP (1 inch = 1440 TWIP, 1 cm = 567 TWIP)
- **Image URLs** — remote images are downloaded automatically; for CORS-restricted images, use base64 data URIs
- **Server-side only** — use in Node.js; browser usage is not supported
- **TypeScript** — full type definitions included in the package
