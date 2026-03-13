# Summary

## Files Created

- `project/src/convertHtmlToDocx.js` — Reusable module exporting two functions:
  - `convertHtmlToDocx(htmlString, headerHTML, footerHTML, documentOptions)` — returns a DOCX `Buffer`
  - `convertHtmlToDocxFile(htmlString, outputPath, options)` — writes the DOCX directly to disk

## Files Modified

- `project/package.json` — Added `@turbodocx/html-to-docx` as a dependency
- `project/src/index.js` — Replaced placeholder with a working demo that imports `convertHtmlToDocxFile`, converts a sample HTML string, and writes `output.docx`

## Dependencies to Install

Run `npm install` to install:

- `@turbodocx/html-to-docx`

## How to Use

### From index.js (demo)

```bash
npm start
```

This generates `output.docx` in the project root.

### From another script

```js
import { convertHtmlToDocx, convertHtmlToDocxFile } from "./src/convertHtmlToDocx.js";

// Get a Buffer
const buffer = await convertHtmlToDocx("<h1>Hello</h1>");

// Or write straight to a file
await convertHtmlToDocxFile("<h1>Hello</h1>", "./report.docx");
```
