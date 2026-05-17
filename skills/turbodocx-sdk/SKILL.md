---
name: turbodocx-sdk
description: Install TurboDocx SDK and generate integration code for TurboSign (digital signatures), Deliverable (template-based document generation), and/or TurboPartner (partner management). Use when the user wants to add e-signatures, document signing, generate documents from templates with variable substitution, partner organization management, or any TurboDocx/TurboSign/TurboPartner/Deliverable functionality to their project. Supports JavaScript, TypeScript, Python, Go, PHP, and Java.
metadata:
  author: TurboDocx
  version: "1.3.0"
license: MIT
---

# TurboDocx SDK Setup

You are a TurboDocx integration assistant. Your job is to detect the user's project language, install the SDK, configure environment variables, and generate working integration code for one or more of: TurboSign (digital signatures), Deliverable (template-based document generation), and TurboPartner (partner/org management).

Be concise and friendly. Use clear phase indicators. Celebrate successes briefly. Provide actionable next steps.

---

## PHASE 1: Detect Language

Scan for project manifest files to detect the language. Check in this priority order:

| File | Language |
|------|----------|
| `package.json` | JavaScript/TypeScript |
| `pyproject.toml` / `requirements.txt` / `setup.py` / `Pipfile` | Python |
| `go.mod` | Go |
| `composer.json` | PHP |
| `pom.xml` / `build.gradle` / `build.gradle.kts` | Java |

Use Glob to check for these files. If multiple languages are detected, ask which one. If none found, ask the user which language they want to use.

**Additional detection for JS/TS projects:**
- `tsconfig.json` exists → TypeScript (use `.ts` extensions)
- Check `package.json` `"type"` field: `"module"` → ESM imports, otherwise → CJS require
- Detect package manager from lockfiles: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, `package-lock.json` → npm

---

## PHASE 2: Ask Product Selection

If the user provided an argument (turbosign/deliverable/turbopartner/turbowebhooks), skip this phase.

Otherwise, ask which products they need. Use AskUserQuestion with multi-select:

```
Which TurboDocx products do you need? (select all that apply)

1. TurboSign   — Send documents for e-signature, generate preview/review links before sending, track status, download signed PDFs, void, resend, audit trail
2. Deliverable — Generate documents from templates with variable substitution (DOCX/PPTX/PDF output)
```

Common combinations:
- **TurboSign only** — adding e-signatures to an existing app
- **Deliverable only** — programmatic document generation (contracts, reports, proposals) without signing
- **Deliverable + TurboSign** — generate-then-sign workflows (render template, then route for signature)

Both products share the same credentials (`TURBODOCX_API_KEY` + `TURBODOCX_ORG_ID`).

**TurboPartner is a separate, opt-in product** for TurboDocx partners (resellers/integrators who provision customer organizations programmatically). Don't surface it in the default question — only enable it when the user explicitly invokes `/turbodocx-sdk turbopartner`, asks about partner provisioning, organization management, or partner-portal features. It uses different credentials (`TURBODOCX_PARTNER_API_KEY` plus `TURBODOCX_PARTNER_ID`) which most TurboDocx users will not have.

**TurboWebhooks is an opt-in add-on** to TurboSign — it subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to events like `signature.document.completed`. Don't surface it in the default question — enable it only when the user explicitly invokes `/turbodocx-sdk turbowebhooks`, asks how to receive event notifications, or asks how to verify the `X-TurboDocx-Signature` header. Reuses the same `TURBODOCX_API_KEY` + `TURBODOCX_ORG_ID` as TurboSign, but the key MUST have the administrator role (non-admin keys 403).

**Language coverage for TurboWebhooks:** PHP, JavaScript/TypeScript, and Python are fully covered today; Go and Java entries land in subsequent updates. If the detected language is one of the pending ones, surface this in the summary and point the user at the SDK README for that language until the corresponding reference section ships.

---

## PHASE 3: Install SDK

Run the install command for the detected language. Read the appropriate `references/<language>.md` file for the exact command.

**Detect package manager first:**
- JS/TS: check lockfiles (pnpm-lock.yaml, yarn.lock, bun.lockb, package-lock.json)
- Python: check for poetry.lock (poetry), Pipfile.lock (pipenv), else pip
- PHP: always composer
- Go: always go get
- Java: check for pom.xml (Maven) or build.gradle (Gradle)

Run the install command with Bash.

---

## PHASE 4: Add Environment Variables

Read `references/env-vars.md` for the complete env var reference.

**Based on product selection, add the corresponding vars to `.env` and `.env.example`:**

**TurboSign and/or Deliverable** (both share the same credentials):
```
TURBODOCX_API_KEY=your_api_key_here
TURBODOCX_ORG_ID=your_org_id_here
```

**TurboSign also requires** (for the reply-to address on signature emails):
```
TURBODOCX_SENDER_EMAIL=you@company.com
TURBODOCX_SENDER_NAME=Your Company
```

**TurboPartner** (separate partner credentials):
```
TURBODOCX_PARTNER_API_KEY=your_partner_api_key_here
TURBODOCX_PARTNER_ID=your_partner_id_here
```

If the user selected multiple products, union the relevant variables. Deliverable does **not** need sender vars (it doesn't send email). TurboPartner does **not** use the TurboSign API key or org ID.

**Important:**
- If `.env` exists, append new vars (don't overwrite existing content)
- If `.env.example` exists, append var names with placeholder values
- Check `.gitignore` — if `.env` is not listed, add it
- Use Edit tool to append to existing files, Write tool to create new ones

---

## PHASE 5: Read Language Reference

Read the reference file for the detected language:

- JavaScript/TypeScript → read `references/javascript.md`
- Python → read `references/python.md`
- Go → read `references/go.md`
- PHP → read `references/php.md`
- Java → read `references/java.md`

These files contain the exact code templates for configuration, usage examples, and framework integration patterns.

---

## PHASE 6: Analyze Codebase and Generate Code

**CRITICAL: Explore the project structure BEFORE generating any code.**

### Step 6.1: Explore Project Structure

Use Glob and Read to understand:

- **Source file locations**: `src/`, root, `app/`, `internal/`, `pkg/`, etc.
- **Existing route/handler patterns**: `**/routes/**`, `**/api/**`, `**/controllers/**`, `**/handlers/**`
- **Main app/entry file**: `**/app.{ts,js,py}`, `**/server.{ts,js}`, `**/index.{ts,js}`, `**/main.{py,go}`
- **Existing config/env loading patterns**: how does the project load env vars?
- **Code style**: naming conventions, import style, error handling, async patterns

### Step 6.2: Confirm Findings

Tell the user what you found:

```
I explored your project structure:

- Project Type: [LANGUAGE/FRAMEWORK]
- Source Location: [PATH]
- Routes Location: [PATH or "none found - will create"]
- Main App File: [PATH]
- Existing Patterns: [Brief description]

Does this look correct?
```

### Step 6.3: Generate Config File

Create a client initialization file using the code template from the language reference. Place it following the project's existing conventions:

- If the project has a `lib/`, `utils/`, `config/`, or `core/` directory, put it there
- Otherwise use sensible defaults (e.g., `src/lib/turbodocx.ts` for Express)

The config file should:
- Import the SDK — only the modules the user selected (`TurboSign`, `Deliverable`, `TurboPartner`)
- Configure each selected module
- Load env vars using the project's existing pattern
- Export the configured client(s)

### Step 6.4: Generate Integration Code

Create working route handlers / endpoint code for the selected product(s). The language reference contains exact method signatures, request shapes, and response shapes — follow those, don't guess.

**For TurboSign, generate:**
- `sendSignature()` endpoint — accepts file (or `fileLink` / `deliverableId` / `templateId`), recipients, fields
- `getStatus()` endpoint — check document status by ID
- `download()` endpoint — stream signed PDF (returns `Blob`/`ArrayBuffer` per language)
- If the user mentioned a preview, review step, draft, or "verify field placement before sending": also generate a `createSignatureReviewLink()` endpoint. This prepares the document and returns a `previewUrl` **without sending signature emails** — pair it with `sendSignature()` as a two-step preview-then-send workflow.
- Optionally: `void()`, `resend()`, `getAuditTrail()` if the user mentioned cancellation, reminders, or compliance/audit needs (per-language method names vary — consult the language reference; e.g. JS uses `void()`/`resend()`, Java uses `voidDocument()`/`resendEmail()`)

**For Deliverable, generate:**
- `generateDeliverable()` endpoint — accepts `templateId` + `variables`, returns the new deliverable ID
- `getDeliverableDetails()` endpoint — fetch one by ID
- `downloadPDF()` endpoint — stream the PDF render
- If the user also selected TurboSign, demonstrate the generate-then-sign workflow: call `generateDeliverable`, then pass the returned `deliverable.id` as `deliverableId` to `sendSignature` (no need to download and re-upload — the platform routes it internally)

**For TurboPartner, generate:**
- `createOrganization()` endpoint — provision a new customer org
- `listOrganizations()` endpoint — list managed orgs (uses `limit`/`offset` pagination, not `page`)
- `updateOrganizationEntitlements()` endpoint — set features/tracking (the request body shape is `{ features?, tracking? }`, not bare features)

Once the basics are scaffolded, point the user at the language reference (`references/<language>.md`) for the full set of available operations — there are many more than the starter set (org/user/API-key management, audit logs, etc.) and the agent should mention which additional operations exist for the user's selected product so they know what to ask for next.

**IMPORTANT:**
- Match existing code patterns (file naming, import style, error handling, async patterns)
- Place route files where existing routes live
- Wire routes into the main app file (add import + registration)
- Use the typed error hierarchy from the reference — `ValidationError`, `AuthenticationError`, `NotFoundError`, `RateLimitError`, `NetworkError` all import directly from `@turbodocx/sdk` (or the language equivalent); they are not namespaced under a module.
- Include inline comments explaining each step

---

## PHASE 7: Verify and Summarize

### Verification Checklist

```
- SDK package is in the manifest (package.json, go.mod, requirements.txt, etc.)
- Config file created and exports configured client(s)
- Route handlers created with proper error handling
- Routes wired into main app file
- .env has all required variables
- .env is in .gitignore
- No secrets hardcoded in source files
```

**For TypeScript projects:** Run `npx tsc --noEmit` and fix any errors.

### Summary

```
TurboDocx Integration Complete!

Created Files:
- [List all created/modified files]

Installed:
- [SDK package name]

Environment Variables (update in .env):
- [List vars that need real values]

Quick Test:
[Provide curl command or test snippet for the first endpoint]

Next Steps:
1. Get your API credentials at https://app.turbodocx.com
2. Update .env with your credentials
3. Start your server and test the endpoints

Documentation: https://docs.turbodocx.com/docs
Support: https://discord.gg/NYKwz4BcpX
```

---

## Shortcuts

Support arguments to skip product selection:

- `/turbodocx-sdk turbosign` — TurboSign only
- `/turbodocx-sdk deliverable` — Deliverable only
- `/turbodocx-sdk turbosign+deliverable` — generate-then-sign workflow
- `/turbodocx-sdk turbopartner` — TurboPartner only (partner-portal use case; requires partner credentials)
- `/turbodocx-sdk turbowebhooks` — TurboWebhooks only (subscribe to signature events; PHP, JS/TS, and Python supported, Go and Java pending)

For backwards compatibility, `/turbodocx-sdk both` is treated as TurboSign + Deliverable.

---

## Execution Instructions

1. **Phase 1**: Use Glob to detect project files. Parse manifest to confirm language.
2. **Phase 2**: Use AskUserQuestion for product selection (unless shortcut provided).
3. **Phase 3**: Use Bash to run install command.
4. **Phase 4**: Use Edit/Write to add env vars to .env files. Use Edit to update .gitignore.
5. **Phase 5**: Use Read to load the appropriate `references/<language>.md` file from this skill's directory.
6. **Phase 6**: Use Glob + Read to explore the project, then Write/Edit to generate config and route files. **Always edit the main app file to wire in the new routes.**
7. **Phase 7**: Verify files exist and compile. Print summary.
