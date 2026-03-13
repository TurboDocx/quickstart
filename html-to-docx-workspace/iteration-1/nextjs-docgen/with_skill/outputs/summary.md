# Summary

## Files Created

- `lib/generate-docx.ts` — Helper module wrapping `@turbodocx/html-to-docx` with sensible defaults (Arial 12pt, 1-inch margins). Exports a `generateDocx(html, options?)` function that returns a `Buffer`.
- `app/api/generate-docx/route.ts` — Next.js App Router API route. Accepts a POST request with JSON body (`{ html, filename?, options? }`) and returns a `.docx` file download.

## Files Modified

- `package.json` — Added `@turbodocx/html-to-docx` to dependencies.

## Package to Install

```bash
npm install @turbodocx/html-to-docx
```

No API keys or environment variables are needed.

## Usage

Send a POST request to `/api/generate-docx`:

```bash
curl -X POST http://localhost:3000/api/generate-docx \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello World</h1><p>Generated with TurboDocx.</p>", "filename": "my-report"}' \
  --output my-report.docx
```

## Customizable Options

Pass an `options` object in the request body to customize:

- **orientation** — `"portrait"` or `"landscape"`
- **font** / **fontSize** — Default font and size (in half-points; 24 = 12pt)
- **margins** — `top`, `right`, `bottom`, `left` in TWIP (1440 = 1 inch)
- **title**, **subject**, **creator** — Document metadata
- **headerHtml** / **footerHtml** — HTML strings for page headers and footers
- **pageNumber** — Add page numbers to the footer

## Documentation

https://docs.turbodocx.com
