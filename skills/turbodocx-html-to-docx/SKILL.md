---
name: turbodocx-html-to-docx
description: Set up @turbodocx/html-to-docx to convert HTML to Microsoft Word (.docx) documents in a Node.js project. Use this skill when the user wants to generate DOCX files from HTML, add document generation to their app, convert HTML templates to Word documents, or integrate TurboDocx html-to-docx into their project. Also trigger for mentions of HTML-to-Word, HTML-to-DOCX, document generation, report generation from HTML, or any request involving the @turbodocx/html-to-docx package.
metadata:
  author: TurboDocx
  version: "1.1.0"
license: MIT
---

# HTML to DOCX Setup

This skill adds `@turbodocx/html-to-docx` to a Node.js/TypeScript project — a zero-dependency library that converts HTML strings to Word documents without Puppeteer, Chrome, or LibreOffice.

## Phase 1: Verify JavaScript/TypeScript Project

Use Glob to check for `package.json` in the project root.

- If found: proceed. Also check for `tsconfig.json` to determine if TypeScript is in use.
- If not found: tell the user this library is Node.js/TypeScript only and stop.

Detect the package manager from lockfiles:
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → yarn
- `bun.lockb` → bun
- `package-lock.json` or none → npm

Check `package.json` for `"type": "module"` to determine ESM vs CommonJS imports.

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
- Link to docs: https://docs.turbodocx.com
- Key options they can customize (page size, orientation, margins, fonts, headers/footers)
