# Summary

## Files Created

- `app/api/generate-docx/route.ts` — New App Router API route that accepts HTML and returns a DOCX file

## Files Modified

- `package.json` — Added `@turbodocx/html-to-docx` dependency

## Dependencies to Install

Run `npm install` to install the newly added `@turbodocx/html-to-docx` package.

## API Route Details

- **Endpoint**: `POST /api/generate-docx`
- **Request body**: JSON with an `html` string field (e.g. `{ "html": "<h1>Hello</h1>" }`)
- **Response**: Binary DOCX file with appropriate Content-Type and Content-Disposition headers
- **Error handling**: Returns 400 for missing/invalid input, 500 for generation failures
