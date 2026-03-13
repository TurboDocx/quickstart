# Summary

## Files Modified

1. **package.json** -- Added `@turbodocx/html-to-docx` (`^1.0.0`) to `dependencies`.
2. **src/index.ts** -- Added a `POST /convert` endpoint that accepts `{ "html": "<p>...</p>" }` in the request body, converts the HTML to a DOCX buffer using `@turbodocx/html-to-docx`, and returns the file as a downloadable `.docx` attachment.

## Files Created

None.

## Dependencies to Install

Run `npm install` to install the newly added `@turbodocx/html-to-docx` package.

## How to Use

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello World</h1><p>This is a test document.</p>"}' \
  -o document.docx
```
