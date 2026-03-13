# Summary

## Files Created

- `src/lib/generateDocx.ts` — Helper module wrapping `HTMLtoDOCX` with sensible defaults (Arial font, 12pt, 1-inch margins). Exports `generateDocx(html, options?, headerHtml?, footerHtml?)` returning a `Buffer`.
- `src/routes/docx.ts` — Express router with a `POST /generate` endpoint that accepts `{ html, filename?, options?, headerHtml?, footerHtml? }` in the request body and returns a downloadable `.docx` file.

## Files Modified

- `src/index.ts` — Imported and mounted the docx router at `/docx`.
- `package.json` — Added `@turbodocx/html-to-docx` as a dependency.

## Package to Install

```bash
npm install @turbodocx/html-to-docx
```

## Usage

```bash
curl -X POST http://localhost:3000/docx/generate \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello</h1><p>World</p>", "filename": "my-doc"}' \
  --output my-doc.docx
```

## Key Options You Can Customize

- **Page size**: Letter (default), A4, Legal — set via `options.pageSize`
- **Orientation**: `portrait` (default) or `landscape`
- **Margins**: in TWIP units (1440 TWIP = 1 inch)
- **Font and size**: default is Arial 12pt
- **Headers/footers**: pass `headerHtml` and `footerHtml` strings
- **Page numbers**: set `options.pageNumber: true`

## Docs

https://docs.turbodocx.com
