---
name: turbodocx-html-to-docx
description: Set up @turbodocx/html-to-docx to convert HTML to Microsoft Word (.docx) documents in a Node.js project. Use this skill when the user wants to generate DOCX files from HTML, add document generation to their app, convert HTML templates to Word documents, or integrate TurboDocx html-to-docx into their project. Also trigger for mentions of HTML-to-Word, HTML-to-DOCX, document generation, report generation from HTML, or any request involving the @turbodocx/html-to-docx package.
metadata:
  author: TurboDocx
  version: "1.2.0"
license: MIT
---

# HTML to DOCX Setup

This skill adds `@turbodocx/html-to-docx` to a JavaScript/TypeScript project — a zero-dependency library that converts HTML strings to Word documents without Puppeteer, Chrome, or LibreOffice. It runs in Node.js **and** in the browser (via the bundled IIFE/ESM builds).

> **Prefer server-side when possible.** Running this server-side is faster, avoids the ~2.4 MB browser bundle, sidesteps polyfill requirements, and keeps `sharp` (for SVG → PNG conversion) available. Default to a server-side integration whenever the project has any backend (Express/Fastify/Next.js API route/etc.) and only fall back to the browser bundle when the project is genuinely static or the user explicitly asks for client-side generation.

## Phase 1: Detect the Project Type

Use Glob to check what kind of project this is:

1. **Node.js / npm-based project** — `package.json` exists in the root. **This is the preferred path.**
   - Also check for `tsconfig.json` to determine if TypeScript is in use.
   - Detect the package manager from lockfiles:
     - `pnpm-lock.yaml` → pnpm
     - `yarn.lock` → yarn
     - `bun.lockb` → bun
     - `package-lock.json` or none → npm
   - Check `package.json` for `"type": "module"` to determine ESM vs CommonJS imports.
   - If the project has both a server runtime and a client (e.g., Next.js, Remix, Nuxt, SvelteKit), default to the server route/handler/action path — do not put document generation in a client component unless the user explicitly asks.
   - Proceed to **Phase 2 (npm install path)**.

2. **Browser-only project** — no `package.json`, but HTML files exist (`*.html`) or the user has explicitly said they want to use this in a static page / CDN setup. Before committing to this path, briefly confirm with the user that they don't have a backend they'd rather run this in — server-side is preferred. If they confirm browser is required:
   - Skip npm install entirely. The library ships a self-contained browser bundle (`dist/html-to-docx.browser.js`, ~2.4 MB IIFE) with all dependencies inlined.
   - Read the **Browser Usage** section in `references/usage.md` for the polyfill snippet, the `HTMLToDOCX(...)` global, and the limitations (no `sharp`, CORS-restricted remote images, no filesystem).
   - Drop in a `<script src="...">` referencing either a hosted copy or a CDN build, and generate a minimal working example tailored to the user's page.
   - Skip Phases 2-4 below; the browser path is install-less.

3. **Neither** — no `package.json` and no HTML files. Ask the user which environment they're targeting (Node.js, bundler, or static HTML) before proceeding, and recommend server-side as the default.

## Phase 2: Install the Package

Run the install command for the detected package manager:

- npm: `npm install @turbodocx/html-to-docx`
- pnpm: `pnpm add @turbodocx/html-to-docx`
- yarn: `yarn add @turbodocx/html-to-docx`
- bun: `bun add @turbodocx/html-to-docx`

No environment variables are needed — this is a local library with no API keys.

## Phase 3: Read Reference

Read `references/usage.md` from this skill's directory. It contains the full API surface, configuration options, and code examples.

## Phase 4: Analyze Codebase and Generate Code

### Step 4.1: Explore the project

Use Glob and Read to understand:
- Where source files live (`src/`, `app/`, `lib/`, root)
- What framework is in use (Express, Fastify, NestJS, Next.js, Hono, Koa, or none)
- Existing patterns: how routes are defined, how files are organized, naming conventions
- Whether the project uses TypeScript or JavaScript
- ESM (`import`) or CommonJS (`require`) style

### Step 4.2: Confirm with the user

Briefly share what you found and where you plan to put the new files. Ask if this looks right.

### Step 4.3: Generate the helper module

Create a helper module that wraps `HTMLtoDOCX` with sensible defaults. Place it where the project keeps its utilities (e.g., `src/lib/`, `src/utils/`, `lib/`).

The helper should:
- Import `HTMLtoDOCX` using the project's import style (ESM or CJS)
- Export a function like `generateDocx(html, options?)` that calls `HTMLtoDOCX` and returns a `Buffer`
- Include commonly useful defaults (font, margins) that the user can override
- Use TypeScript if the project uses TypeScript

### Step 4.4: Generate integration code

Based on what the project needs:

**If it's a web server (Express, Fastify, NestJS, Next.js, etc.):**
Create an endpoint that accepts HTML (in the request body) and returns a .docx file. Match the framework's routing pattern:
- Express: `Router` with `res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')` and `res.send(buffer)`
- Next.js App Router: `app/api/.../route.ts` exporting `POST` function, return `new Response(buffer, { headers })`
- NestJS: `@Controller` + `@Post` with `@Res() res` for streaming the buffer
- Other frameworks: match their conventions

Set the response headers:
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="document.docx"
```

Wire the route into the app's main file (unless file-based routing like Next.js).

**If it's a standalone/script project:**
Create a script that reads HTML (from a file, stdin, or a string) and writes a .docx file. Include a basic example HTML string to demonstrate.

## Phase 5: Verify and Summarize

If the project uses TypeScript, run `npx tsc --noEmit` to check for type errors.

Print a summary:
- Files created and modified
- Package installed
- How to use (example curl command for endpoints, or how to run the script)
- Link to docs: https://docs.turbodocx.com/docs
- Key options they can customize (page size, orientation, margins, fonts, headers/footers)
