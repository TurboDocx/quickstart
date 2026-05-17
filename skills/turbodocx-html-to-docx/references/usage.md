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
  headerHTMLString?: string | null, // Optional: HTML for page header
  documentOptions?: DocumentOptions, // Optional: configuration
  footerHTMLString?: string | null  // Optional: HTML for page footer
): Promise<Buffer | ArrayBuffer | Blob>
```

Returns `Buffer` in Node.js, `Blob` in browsers. Both can be persisted or streamed — see Browser Usage section for the browser path.

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
    gutter: 0,     // binding gutter (added to inner margin for double-sided printing)
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

All heading styles are nested under the `heading` key. Each level supports `font`, `fontSize`, `bold`, `spacing`, `keepLines`, `keepNext`, and `outlineLevel`.

```typescript
const options = {
  heading: {
    heading1: {
      font: 'Arial',
      fontSize: 32,     // 16pt
      bold: true,
      spacing: { before: 240, after: 120 },
      keepLines: true,  // keep all lines on same page
      keepNext: true,   // keep with the following paragraph
    },
    heading2: {
      font: 'Arial',
      fontSize: 28,     // 14pt
      bold: true,
      spacing: { before: 200, after: 100 },
    },
    heading3: { font: 'Arial', fontSize: 24, bold: true },
    heading4: { font: 'Arial', fontSize: 22, bold: true },
    heading5: { font: 'Arial', fontSize: 20, bold: false },
    heading6: { font: 'Arial', fontSize: 18, bold: false },
  },
};
```

### Headers and Footers

```typescript
const headerHtml = '<p style="text-align: center">Company Name</p>';
const footerHtml = '<p style="text-align: center">Confidential</p>';

const options = {
  header: true,
  headerType: 'default',  // 'default' | 'first' | 'even'
  footer: true,
  footerType: 'default',  // 'default' | 'first' | 'even'
  pageNumber: true,        // Adds page numbers to footer
  skipFirstHeaderFooter: true,  // omit header/footer on first page
};

const buffer = await HTMLtoDOCX(html, headerHtml, options, footerHtml);
```

### Line Numbers

```typescript
const options = {
  lineNumber: true,
  lineNumberOptions: {
    start: 1,
    countBy: 1,
    restart: 'newPage',  // 'continuous' | 'newPage' | 'newSection'
  },
};
```

### List Numbering

```typescript
const options = {
  numbering: {
    defaultOrderedListStyleType: 'decimal',  // controls <ol> list style
  },
};
```

### Document Metadata

```typescript
const options = {
  title: 'Quarterly Report',
  subject: 'Q4 2025 Financial Summary',
  creator: 'Report Generator',
  keywords: ['finance', 'quarterly'],
  description: 'Auto-generated financial report',
  lastModifiedBy: 'Report Generator',
  revision: 1,
  createdAt: new Date(),
  modifiedAt: new Date(),
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
    downloadTimeout: 5000,       // ms before giving up on a remote image
    maxImageSize: 10485760,      // 10MB — skip images larger than this
    svgHandling: 'convert',      // 'convert' (needs sharp) | 'native' (Office 2019+) | 'auto' (convert if sharp available, else native)
  },
  preprocessing: {
    skipHTMLMinify: false,       // set true if minification breaks your HTML
  },
};
```

### RTL / Complex Script Languages

```typescript
const options = {
  direction: 'rtl',
  lang: 'ar-SA',
  complexScriptFontSize: 24,  // font size for Arabic, Hebrew, CJK scripts (half-points)
  decodeUnicode: true,         // decode HTML entities in the source HTML
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
- **SVG images** — install `sharp` for maximum compatibility (converts SVG to PNG for Word 2007+). Without sharp, SVGs use native embedding (Office 2019+ only). Use `svgHandling: 'auto'` to pick automatically.
- **TWIP units** — page sizes and margins use TWIP (1 inch = 1440 TWIP, 1 cm = 567 TWIP)
- **Image URLs** — remote images are downloaded automatically; for CORS-restricted images, use base64 data URIs
- **TypeScript** — full type definitions included in the package
- **Return type varies by runtime** — Node.js returns `Buffer`, browsers return `Blob`. Both can be persisted, streamed, or uploaded directly.
- **Heading styles** — all heading levels are nested under the `heading` key: `{ heading: { heading1: {...}, heading2: {...} } }` — not at the top level of options.
- **HTML minification** — the library minifies your HTML before processing; if this breaks layout, set `preprocessing: { skipHTMLMinify: true }`.
- **`null` vs `undefined`** — pass `null` explicitly for headerHTMLString/footerHTMLString when you want to skip them and still pass options as the third argument.

**Full API reference:** https://docs.turbodocx.com/docs

## Browser Usage

> **Prefer server-side if possible.** Server-side generation is faster, has no ~2.4 MB bundle, requires no polyfills, and keeps `sharp` available for SVG → PNG conversion. Only use the browser path if the project is truly static or the user has explicitly asked for client-side generation.

This library runs in browsers via the bundled standalone build. It is not server-side only. There are three distribution files produced by `npm run build`:

| File | Format | Size | Use case |
|------|--------|------|----------|
| `dist/html-to-docx.esm.js` | ES Module | ~1.6 MB | Modern bundlers (Webpack, Vite, Rollup) — deps external |
| `dist/html-to-docx.umd.js` | UMD | ~1.6 MB | Node.js, AMD, manual dep management |
| `dist/html-to-docx.browser.js` | IIFE | ~2.4 MB | Direct `<script>` / CDN — **all deps bundled** |

`package.json` already wires these up as `main` / `module` / `browser`, so bundlers pick the right one automatically.

### Path 1 — Bundler (Vite, Webpack, Rollup, Next.js client component, etc.)

Install normally and import. The bundler picks the ESM build:

```typescript
import HTMLtoDOCX from '@turbodocx/html-to-docx';

async function downloadDocx(html: string) {
  const result = await HTMLtoDOCX(html);
  // In browser: result is a Blob. In Node: Buffer/ArrayBuffer.
  const blob = result instanceof Blob
    ? result
    : new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.docx';
  a.click();
  URL.revokeObjectURL(url);
}
```

### Path 2 — Static HTML page (no bundler, `<script>` tag)

Use the IIFE bundle. **Polyfills for `global`, `process`, and `Buffer` must be set before the script loads** — some dependencies check for them synchronously during init:

```html
<!DOCTYPE html>
<html>
<head><title>HTML to DOCX</title></head>
<body>
  <script>
    if (typeof global === 'undefined') window.global = window;
    if (typeof process === 'undefined') window.process = { env: {} };
    if (typeof Buffer === 'undefined') {
      window.Buffer = {
        from: function (data, encoding) {
          if (typeof data === 'string') {
            if (encoding === 'base64') {
              var binary = atob(data);
              var bytes = new Uint8Array(binary.length);
              for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              return bytes;
            }
            return new TextEncoder().encode(data);
          }
          return new Uint8Array(data);
        },
        isBuffer: function () { return false; }
      };
    }
  </script>

  <script src="path/to/html-to-docx.browser.js"></script>

  <script>
    async function generateDocument() {
      // Note: the IIFE bundle exposes a global named HTMLToDOCX (capitalized).
      const result = await HTMLToDOCX('<h1>Hello</h1><p>From the browser.</p>', null, {
        title: 'My Document',
        creator: 'Browser App'
      });

      const blob = result instanceof Blob
        ? result
        : new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.docx';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>

  <button onclick="generateDocument()">Generate DOCX</button>
</body>
</html>
```

### Building the browser bundle from source

The browser bundle ships in the npm package's `dist/` directory, so most users don't need to build it. If you're working from a cloned repo or want a custom build:

```bash
npm run build               # all three outputs (ESM + UMD + Browser)
npm run build:browser       # browser IIFE only (dev)
npm run build:browser:prod  # browser IIFE only (minified, production)
```

### Browser limitations

- **`sharp` not available** — SVG images embed natively (requires Office 2019+). For broader compatibility, pre-convert SVGs to PNG before passing to the library.
- **CORS** — Remote `<img src="https://...">` URLs must be CORS-enabled, or use base64 data URIs.
- **No filesystem** — Output is returned as `Blob` / `ArrayBuffer`. Trigger a download via `URL.createObjectURL` or upload directly.
