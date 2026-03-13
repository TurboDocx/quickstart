# Summary

## Files Created

- `src/lib/generateDocx.js` — Reusable helper module that wraps `HTMLtoDOCX` with sensible defaults (Arial font, 12pt, Letter size, 1-inch margins). Exports `generateDocx(html, options?, headerHtml?, footerHtml?)` which returns a `Promise<Buffer>`.

## Files Modified

- `src/index.js` — Updated from placeholder to a working example script that converts a sample HTML string to `output.docx` using the `generateDocx` helper.
- `package.json` — Added `@turbodocx/html-to-docx` as a dependency.

## Package to Install

Run `npm install` to install the dependency:

```bash
npm install
```

Or install directly:

```bash
npm install @turbodocx/html-to-docx
```

No API keys or environment variables are needed -- this is a purely local library.

## Usage

### Run the example script

```bash
npm start
```

This generates `output.docx` in the project root.

### Import the helper from other scripts

```javascript
import { generateDocx } from './src/lib/generateDocx.js';

const buffer = await generateDocx('<h1>Hello World</h1>');
// Write to file, send as HTTP response, etc.
```

### Customize options

```javascript
const buffer = await generateDocx(html, {
  font: 'Calibri',
  fontSize: 22,           // 11pt
  orientation: 'landscape',
  pageSize: { width: 16838, height: 11906 }, // A4 landscape
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  title: 'My Report',
});
```

### Add headers and footers

```javascript
const buffer = await generateDocx(
  html,
  { pageNumber: true },
  '<p style="text-align: center">Company Name</p>',
  '<p style="text-align: center">Confidential</p>'
);
```

## Key Options Reference

| Option | Description | Default |
|---|---|---|
| `font` | Default font family | `'Arial'` |
| `fontSize` | Font size in half-points (24 = 12pt) | `24` |
| `orientation` | `'portrait'` or `'landscape'` | `'portrait'` |
| `pageSize` | `{ width, height }` in TWIP | Letter (12240 x 15840) |
| `margins` | `{ top, right, bottom, left }` in TWIP | 1 inch all sides |
| `pageNumber` | Add page numbers to footer | `false` |
| `title` | Document metadata title | — |

## Documentation

Full documentation: https://docs.turbodocx.com
