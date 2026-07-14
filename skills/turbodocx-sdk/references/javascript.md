# JavaScript/TypeScript SDK Reference

## Install

```bash
# npm
npm install @turbodocx/sdk

# pnpm
pnpm add @turbodocx/sdk

# yarn
yarn add @turbodocx/sdk

# bun
bun add @turbodocx/sdk
```

Also install dotenv if not already present:
```bash
npm install dotenv
```

Add `import 'dotenv/config'` at the top of your entry point file.

## Imports

```typescript
// ESM (package.json "type": "module" or TypeScript)
import { TurboSign, TurboPartner, Deliverable, TurboWebhooks, TurboQuote } from '@turbodocx/sdk';

// CommonJS
const { TurboSign, TurboPartner, Deliverable, TurboWebhooks, TurboQuote } = require('@turbodocx/sdk');
```

Only import what you use — for a project that only sends signatures, import only `TurboSign`.

---

## TurboSign

Digital signature operations: prepare, send, track, download, void, resend, and audit-trail signed PDFs.

### TurboSign.configure

```typescript
TurboSign.configure({
  apiKey: process.env.TURBODOCX_API_KEY!,
  orgId: process.env.TURBODOCX_ORG_ID!,
  senderEmail: process.env.TURBODOCX_SENDER_EMAIL!,
  senderName: process.env.TURBODOCX_SENDER_NAME, // optional but recommended
});
```

`senderEmail` is required — without it `ValidationError` is thrown. `senderName` defaults to "API Service User" if omitted.

### TurboSign.createSignatureReviewLink

Upload a document with recipients and fields, but **do not send emails** — useful for previewing field placement.

```typescript
const review = await TurboSign.createSignatureReviewLink({
  file: pdfBuffer, // Buffer | string (path) | File | URL via fileLink | deliverableId | templateId
  documentName: 'NDA - Acme',
  recipients: [
    { name: 'John Doe', email: 'john@example.com', signingOrder: 1 },
  ],
  fields: [
    { type: 'signature', page: 1, x: 100, y: 500, width: 200, height: 50, recipientEmail: 'john@example.com' },
  ],
});

console.log(review.documentId);  // string
console.log(review.previewUrl);  // string — open this URL to review the document
console.log(review.status);      // string
```

Response: `{ success, documentId, status, previewUrl?, recipients?, message }`.

### TurboSign.sendSignature

Upload a document with recipients and fields, and immediately email signature requests.

```typescript
const result = await TurboSign.sendSignature({
  file: pdfBuffer, // Buffer | path string | File | fileLink (URL) | deliverableId | templateId
  documentName: 'Partnership Agreement',
  recipients: [
    { name: 'John Doe', email: 'john@example.com', signingOrder: 1 },
    { name: 'Jane Smith', email: 'jane@example.com', signingOrder: 2 },
  ],
  fields: [
    { type: 'signature', page: 1, x: 100, y: 500, width: 200, height: 50, recipientEmail: 'john@example.com' },
    { type: 'signature', page: 1, x: 100, y: 600, width: 200, height: 50, recipientEmail: 'jane@example.com' },
  ],
});

console.log(result.documentId);   // string
console.log(result.status);       // string — e.g., 'sent'
console.log(result.recipients);   // ReviewRecipient[] with { id, name, email, metadata? }
```

Fields support either coordinate-based (`page` + `x` / `y` / `width` / `height`) or anchor-based placement via `template: { anchor: '{TagName}', placement: 'replace', size: {...} }`.

### TurboSign.getStatus

```typescript
const status = await TurboSign.getStatus(documentId);
console.log(status.status); // e.g., 'under_review', 'completed', 'voided', 'sent'
```

Response: `{ status: string }`. For per-recipient state, use `getAuditTrail`.

### TurboSign.download

```typescript
const blob = await TurboSign.download(documentId);

// In Node, persist to disk:
import { writeFile } from 'node:fs/promises';
const arrayBuffer = await blob.arrayBuffer();
await writeFile('signed.pdf', Buffer.from(arrayBuffer));

// In the browser:
const url = URL.createObjectURL(blob);
```

Returns a `Blob`. The download is a **two-step** operation and the SDK performs both for you: `GET /api/signature/:id/download` returns **JSON** (`{ downloadUrl, fileName }`, not bytes), and the SDK then fetches the presigned `downloadUrl` **with no `Authorization` header** (S3 rejects a presigned signature that also carries an `Authorization` header). If you ever hit the REST endpoint directly, you must replicate both steps.

### TurboSign.void

```typescript
const voided = await TurboSign.void(documentId, 'Counterparty requested changes');
console.log(voided.status);   // 'voided'
console.log(voided.voidedAt); // ISO timestamp
```

`reason` is **required**.

### TurboSign.resend

```typescript
// recipientIds — fetch these from sendSignature/createSignatureReviewLink response
//                or getAuditTrail entries.
const result = await TurboSign.resend(documentId, ['recipient-uuid-1', 'recipient-uuid-2']);
console.log(result.success, result.recipientCount);
```

`recipientIds` is an array of recipient UUIDs, **not** email addresses.

### TurboSign.getAuditTrail

```typescript
const audit = await TurboSign.getAuditTrail(documentId);
console.log(audit.document.name);

for (const entry of audit.auditTrail) {
  console.log(entry.timestamp, entry.actionType, entry.user?.email);
}
```

Response: `{ document: { id, name }, auditTrail: AuditTrailEntry[] }`. Each entry has `id, documentId, actionType, timestamp, user?, recipient?, details?` and hash fields for tamper-evident chaining.

---

## Deliverable

Document generation: render a TurboDocx template with variable substitution into a deliverable (DOCX/PPTX), then download it or hand its ID to TurboSign as the source document.

### Deliverable.configure

```typescript
Deliverable.configure({
  apiKey: process.env.TURBODOCX_API_KEY!,
  orgId: process.env.TURBODOCX_ORG_ID!,
});
```

No `senderEmail` needed — Deliverable doesn't send email.

### Deliverable.generateDeliverable

Generate a document from a template with variable substitution.

```typescript
const result = await Deliverable.generateDeliverable({
  templateId: 'template-uuid',
  name: 'Employee Contract - John Smith',
  variables: [
    { placeholder: '{EmployeeName}', text: 'John Smith', mimeType: 'text' },
    { placeholder: '{CompanyName}', text: 'TechCorp Inc.', mimeType: 'text' },
    { placeholder: '{StartDate}',   text: '2026-06-01',  mimeType: 'text' },
  ],
  description: 'Generated via API for HR onboarding',
  tags: ['hr', 'contract'],
});

const deliverable = result.results.deliverable;
console.log(deliverable.id, deliverable.name, deliverable.fileType);
```

`mimeType` is one of `'text' | 'html' | 'image' | 'markdown'`. For repeating content (tables, lists), use `variableStack` on a `DeliverableVariable`.

You can pass the resulting `deliverable.id` straight to `TurboSign.sendSignature({ deliverableId: ... })` to generate-then-sign in one workflow.

### Deliverable.listDeliverables

```typescript
const list = await Deliverable.listDeliverables({
  limit: 20,      // 1-100, default 6
  offset: 0,
  query: 'contract',
  showTags: true,
});

console.log(list.totalRecords);
for (const d of list.results) {
  console.log(d.id, d.name, d.createdOn);
}
```

Response: `{ results: DeliverableRecord[], totalRecords: number }`.

### Deliverable.getDeliverableDetails

```typescript
const d = await Deliverable.getDeliverableDetails(deliverableId, { showTags: true });
console.log(d.name, d.templateName, d.variables, d.tags);
```

Returns a full `DeliverableRecord` including `variables` and (when `showTags: true`) `tags`.

### Deliverable.updateDeliverableInfo

```typescript
const result = await Deliverable.updateDeliverableInfo(deliverableId, {
  name: 'Employee Contract - John Smith (Final)',
  description: 'Finalized version',
  tags: ['hr', 'contract', 'finalized'], // replaces all existing tags
});
console.log(result.message, result.deliverableId);
```

Passing `tags` **replaces** the full tag set. To remove all tags, pass `tags: []`. To add a tag, fetch existing tags first and append.

### Deliverable.deleteDeliverable

```typescript
const result = await Deliverable.deleteDeliverable(deliverableId);
console.log(result.message); // soft delete — data is retained but hidden from list
```

### Deliverable.downloadSourceFile

```typescript
const arrayBuffer = await Deliverable.downloadSourceFile(deliverableId);

// Node:
import { writeFile } from 'node:fs/promises';
await writeFile('contract.docx', Buffer.from(arrayBuffer));

// Browser:
const blob = new Blob([arrayBuffer]);
const url = URL.createObjectURL(blob);
```

Returns the original DOCX/PPTX as `ArrayBuffer`. Requires `hasFileDownload` entitlement.

### Deliverable.downloadPDF

```typescript
const arrayBuffer = await Deliverable.downloadPDF(deliverableId);
// Same persistence pattern as downloadSourceFile, but it's a PDF.
const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
```

---

## TurboPartner

Partner-portal operations: provision and manage customer organizations, their users, API keys, entitlements, and audit logs.

### TurboPartner.configure

```typescript
TurboPartner.configure({
  partnerApiKey: process.env.TURBODOCX_PARTNER_API_KEY!,
  partnerId: process.env.TURBODOCX_PARTNER_ID!,
});
```

### Organization management

```typescript
// Create
const org = await TurboPartner.createOrganization({
  name: 'Acme Corp',
  metadata: { industry: 'Technology' },
  features: { maxUsers: 50, hasTDAI: true }, // optional initial entitlements
});
console.log(org.data.id);

// List (uses offset, not page)
const orgs = await TurboPartner.listOrganizations({ limit: 20, offset: 0, search: 'acme' });
console.log(orgs.data.totalRecords);
orgs.data.results.forEach((o) => console.log(o.id, o.name));

// Get details (includes features + tracking)
const details = await TurboPartner.getOrganizationDetails('org-uuid');
console.log(details.data.features, details.data.tracking);

// Update name
await TurboPartner.updateOrganizationInfo('org-uuid', { name: 'Acme Holdings' });

// Delete
await TurboPartner.deleteOrganization('org-uuid');

// Update entitlements — features and tracking are separate top-level keys
await TurboPartner.updateOrganizationEntitlements('org-uuid', {
  features: { maxUsers: 100, hasTDAI: true, hasSalesforce: true },
  tracking: { numUsers: 12 }, // optional: seed usage counters
});
```

### Organization user management

```typescript
// List
const users = await TurboPartner.listOrganizationUsers('org-uuid', { limit: 25, offset: 0 });

// Invite — ORG role enum: 'admin' | 'contributor' | 'user' | 'viewer'
// ('member' is a PARTNER-portal role and is rejected here with a 400.)
const user = await TurboPartner.addUserToOrganization('org-uuid', {
  email: 'newhire@acme.com',
  role: 'contributor',
});

// Update role
await TurboPartner.updateOrganizationUserRole('org-uuid', 'user-uuid', { role: 'admin' });

// Remove
await TurboPartner.removeUserFromOrganization('org-uuid', 'user-uuid');

// Resend invitation email
await TurboPartner.resendOrganizationInvitationToUser('org-uuid', 'user-uuid');
```

### Organization API key management

```typescript
// List keys for an org
const keys = await TurboPartner.listOrganizationApiKeys('org-uuid', { limit: 10 });

// Create — the full key value is returned ONLY on creation, store it immediately
// Org API keys use the ORG role enum: 'admin' | 'contributor' | 'user' | 'viewer'
const created = await TurboPartner.createOrganizationApiKey('org-uuid', {
  name: 'Production Key',
  role: 'admin',
});
console.log(created.data.key); // capture this once, it won't be shown again

// Update (e.g., rename)
await TurboPartner.updateOrganizationApiKey('org-uuid', 'key-uuid', { name: 'Renamed' });

// Revoke
await TurboPartner.revokeOrganizationApiKey('org-uuid', 'key-uuid');
```

### Partner API key management

```typescript
// List
const keys = await TurboPartner.listPartnerApiKeys({ limit: 10 });

// Create with scopes — full key returned only on creation
const created = await TurboPartner.createPartnerApiKey({
  name: 'CI/CD Key',
  scopes: ['org:create', 'org:read', 'entitlements:update'],
  description: 'Used by GitHub Actions',
});
console.log(created.data.key); // store this immediately

// Update name / scopes
await TurboPartner.updatePartnerApiKey('key-uuid', {
  name: 'CI/CD Key (extended)',
  scopes: ['org:create', 'org:read', 'org:update', 'entitlements:update'],
});

// Revoke
await TurboPartner.revokePartnerApiKey('key-uuid');
```

Available scopes (see `PartnerScope` in the SDK types) cover `org:*`, `entitlements:update`, `org-users:*`, `partner-users:*`, `org-apikeys:*`, `partner-apikeys:*`, and `audit:read`.

### Partner-portal user management

```typescript
// List
const users = await TurboPartner.listPartnerPortalUsers({ limit: 25 });

// Add — PARTNER role enum: 'admin' | 'member' | 'viewer'
// ('contributor' / 'user' are ORG roles and are rejected here with a 400.)
// All SEVEN permission keys are required.
const user = await TurboPartner.addUserToPartnerPortal({
  email: 'admin@partner.com',
  role: 'admin',
  permissions: {
    canManageOrgs: true,
    canManageOrgUsers: true,
    canManagePartnerUsers: false,
    canManageOrgAPIKeys: true,
    canManagePartnerAPIKeys: false,
    canUpdateEntitlements: true,
    canViewAuditLogs: true,
  },
});

// Update — `permissions` itself is optional, but there is NO partial update:
// if you send `permissions` at all you must send ALL SEVEN keys, or the
// backend returns 400. Read the current values first and spread them.
const current = (await TurboPartner.listPartnerPortalUsers({ limit: 100 }))
  .data.results.find((u) => u.id === 'user-uuid');

await TurboPartner.updatePartnerUserPermissions('user-uuid', {
  role: 'member',
  permissions: {
    ...current.permissions,       // all 7 keys, from the server
    canManageOrgs: true,          // then override only what changes
    canManageOrgUsers: true,
  },
});

// To change ONLY the role, omit `permissions` entirely:
await TurboPartner.updatePartnerUserPermissions('user-uuid', { role: 'viewer' });

// Remove
await TurboPartner.removeUserFromPartnerPortal('user-uuid');

// Resend invitation
await TurboPartner.resendPartnerPortalInvitationToUser('user-uuid');
```

### Audit logs

```typescript
const logs = await TurboPartner.getPartnerAuditLogs({
  action: 'org.created',
  resourceType: 'organization',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  success: true,
  limit: 100,
  offset: 0,
});

console.log(logs.data.totalRecords);
for (const entry of logs.data.results) {
  console.log(entry.createdOn, entry.action, entry.resourceId, entry.success);
}
```

---

## TurboWebhooks

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to TurboDocx events such as `signature.document.completed` and `signature.document.voided`. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

### TurboWebhooks.configure

```typescript
import { TurboWebhooks } from '@turbodocx/sdk';

TurboWebhooks.configure({
  apiKey: process.env.TURBODOCX_API_KEY!,   // admin TDX- key
  orgId: process.env.TURBODOCX_ORG_ID!,
});
```

`skipSenderValidation: true` is hardcoded inside `configure()` because webhooks don't send email — only TurboSign needs `senderEmail`. The webhook routes require the organization administrator role; a non-admin TDX- key returns `AuthorizationError` (HTTP 403).

### createWebhook

```typescript
const created = await TurboWebhooks.createWebhook({
  urls: ['https://your-server.example.com/webhooks/turbodocx'],  // must be HTTPS
  events: ['signature.document.completed', 'signature.document.voided'],
});

// Returned secret is shown ONCE — store it server-side immediately.
const { id, secret } = created;
```

`urls` must contain **1–10** HTTPS URLs; `events` must contain **at least 1** event. Throws `ConflictError` (409) if the signature webhook already exists for the org. Throws `ValidationError` (400) for non-HTTPS URLs, an empty/oversized `urls` array, or an empty `events` array.

### getWebhook

```typescript
const webhook = await TurboWebhooks.getWebhook();
// webhook.urls, webhook.events, webhook.isActive
// webhook.deliveryStats.{totalDeliveries, successfulDeliveries, failedDeliveries, pendingRetries}
```

### updateWebhook

```typescript
await TurboWebhooks.updateWebhook({
  urls: ['https://your-server.example.com/webhooks/turbodocx'],  // 1–10 HTTPS URLs
  events: ['signature.document.completed'],                      // at least 1
  isActive: true,
});

// To pause deliveries without touching the routing, OMIT urls/events entirely:
await TurboWebhooks.updateWebhook({ isActive: false });
```

All three fields are optional — pass only what you want to change. But **optional does not mean "may be empty"**: if you include `urls` it still has to hold 1–10 URLs, and if you include `events` it still has to hold at least 1. Sending `urls: []` or `events: []` is a 400 `ValidationError` — omit the key instead.

### deleteWebhook

```typescript
await TurboWebhooks.deleteWebhook();  // soft-delete + delivery history wiped
```

### testWebhook

```typescript
const result = await TurboWebhooks.testWebhook({
  eventType: 'signature.document.completed',
  payload: { documentId: '...', documentName: '...' },
});
// result.summary: { total, successful, failed, errors: string[] }
// result.deliveries: WebhookDelivery[]
```

Per-URL failure messages live in `summary.errors`. Use this from a CI smoke test before flipping a new receiver into production.

### regenerateWebhookSecret

```typescript
const rotated = await TurboWebhooks.regenerateWebhookSecret();
// rotated.secret — shown ONCE; old signatures fail immediately after rotation
```

### listWebhookDeliveries

```typescript
const page = await TurboWebhooks.listWebhookDeliveries({
  limit: 20,
  offset: 0,
  eventType: 'signature.document.completed',
  isDelivered: false,
  httpStatus: 500,
});
// page.results: WebhookDelivery[]; page.totalRecords
```

### replayWebhookDelivery

```typescript
const newDelivery = await TurboWebhooks.replayWebhookDelivery(deliveryId);
// Full WebhookDelivery row returned — id, httpStatus, attemptCount, etc.
```

### getWebhookStats

```typescript
const stats = await TurboWebhooks.getWebhookStats({ days: 30 });
// stats.summary.{successRate, avgResponseTime, ...}
// stats.eventBreakdown — per-event totals
```

### Verifying inbound webhook signatures

When TurboDocx POSTs to your receiver, verify the `X-TurboDocx-Signature` header before trusting the payload. The helper enforces a 5-minute timestamp tolerance and uses constant-time comparison.

```typescript
import express from 'express';
import { verifyWebhookSignature } from '@turbodocx/sdk';

const app = express();

// CRITICAL: mount express.raw FOR THE WEBHOOK PATH BEFORE any global
// express.json(). Express body-parsers set req._body=true on the first
// parse and later parsers no-op. If app.use(express.json()) runs first,
// the route-level express.raw() below silently becomes a no-op and
// req.body is a parsed object instead of a Buffer — verification then
// always fails.
app.use(
  '/webhooks/turbodocx',
  express.raw({ type: 'application/json' }),
);

// Now safe to install JSON parsing for the rest of the app.
app.use(express.json());

app.post('/webhooks/turbodocx', (req, res) => {
  const signature = req.header('x-turbodocx-signature') ?? '';
  const timestamp = req.header('x-turbodocx-timestamp') ?? '';
  const secret = process.env.TURBODOCX_WEBHOOK_SECRET!;

  // req.body is a Buffer because express.raw ran first for this path.
  if (!verifyWebhookSignature(req.body, signature, timestamp, secret)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString('utf8'));
  // process event.eventType, event.data, ...
  res.status(200).send('ok');
});
```

If your app already calls `app.use(express.json())` globally, move it to AFTER the `app.use('/webhooks/turbodocx', express.raw(...))` line shown above — order matters.

**Canonical end-to-end JavaScript example:** [`packages/js-sdk/examples/turbowebhooks-crud.ts`](https://github.com/TurboDocx/SDK/blob/main/packages/js-sdk/examples/turbowebhooks-crud.ts) walks through create → conflict → get → update → test-fire → rotate → list → delete + every error branch.

### TurboWebhooks error handling

```typescript
import {
  TurboDocxError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '@turbodocx/sdk';

try {
  await TurboWebhooks.createWebhook({ urls, events });
} catch (e) {
  if (e instanceof ConflictError)        /* 409 — already exists; update or delete */;
  else if (e instanceof ValidationError) /* 400 — non-HTTPS URL or empty events    */;
  else if (e instanceof AuthorizationError) /* 403 — TDX- key lacks administrator role */;
  else if (e instanceof AuthenticationError) /* 401 — bad / revoked API key          */;
  else if (e instanceof NotFoundError)   /* 404 — webhook does not exist            */;
  else if (e instanceof RateLimitError)  /* 429 — back off and retry                */;
  else if (e instanceof NetworkError)    /* never reached the server                */;
  else if (e instanceof TurboDocxError)  /* other typed SDK error (e.g. 5xx)        */;
  else                                    throw e;
}
```

---

## TurboQuote

Sales quoting operations: build a product catalog, assemble quotes with line items and bundles, apply price books, and send quotes to customers. Includes full CRUD for quotes, products, bundles, price books, companies, contacts, templates, and types.

### TurboQuote.configure

```typescript
import { TurboQuote } from '@turbodocx/sdk';

TurboQuote.configure({
  apiKey: process.env.TURBODOCX_API_KEY!,  // required (or accessToken)
  orgId: process.env.TURBODOCX_ORG_ID!,   // required — backend returns 401 if missing
});
```

No `senderEmail` needed — TurboQuote never sends signature emails. `orgId` is technically optional in the config type but the backend rejects requests without it; always provide it.

### createQuote

```typescript
const quote = await TurboQuote.createQuote({
  name: 'Professional Services — Q3 2026',
  companyId: 'company-uuid',
  contactId: 'contact-uuid',
  currency: 'USD',
  validUntil: '2026-09-30',
  termDays: 365,   // optional; DEFAULT IS 60. Max 3650 (10 years). -1 = auto-renewal.
});

console.log(quote.id);           // string
console.log(quote.quoteNumber);  // human-readable number e.g. 'Q-0042'
console.log(quote.status);       // 'draft'
```

Response: a `Quote` object. Numeric fields such as `subtotal`, `grandTotal`, and `taxRate` are returned as JavaScript `number` (the SDK's response normalizer coerces the backend's decimal strings automatically).

**`termDays` / `renewalPeriod`** — `termDays` defaults to **60** when omitted, and may be any integer up to **3650**, or the sentinel **`-1`** meaning auto-renewal. The two fields are coupled:

- `termDays: -1` → `renewalPeriod` is **required** (`'weekly' | 'monthly' | 'quarterly' | 'annually'`).
- any other `termDays` → `renewalPeriod` must be **absent or `null`**; sending it is a 400.

```typescript
// Auto-renewing quote — renewalPeriod is mandatory
await TurboQuote.createQuote({
  name: 'Managed Services — auto-renew',
  companyId: 'company-uuid',
  contactId: 'contact-uuid',
  termDays: -1,
  renewalPeriod: 'monthly',
});

// Fixed-term quote — do NOT send renewalPeriod
await TurboQuote.createQuote({
  name: 'Fixed 90-day engagement',
  companyId: 'company-uuid',
  contactId: 'contact-uuid',
  termDays: 90,
});
```

### addLineItems

**Four fields are required on every line item**: `productId` (the KEY must be present — its VALUE may be `null` for a custom, non-catalog item), `productName`, `unitPrice`, and `billingFrequency`. Omitting any of them is a 400. `quantity` defaults to `1`.

```typescript
// Single item (auto-wrapped to array)
const items = await TurboQuote.addLineItems(quote.id, {
  productId: 'product-uuid',    // REQUIRED key; use null for a custom item
  productName: 'Consulting Service',  // REQUIRED
  unitPrice: 500,               // REQUIRED
  billingFrequency: 'monthly',  // REQUIRED — 'monthly' | 'quarterly' | 'annual' | 'one-time'
  quantity: 3,                  // optional, defaults to 1
  discountType: 'percent',      // 'percent' | 'amount'
  discountPercent: 10,
});

console.log(items[0].id);         // LineItem UUID
console.log(items[0].finalPrice); // number — already normalised

// Multiple items at once — custom (no-product) items require productId: null explicitly.
// The array must hold between 1 and 50 items; 51+ is a 400.
const bulkItems = await TurboQuote.addLineItems(quote.id, [
  { productId: null, productName: 'Setup Fee', unitPrice: 1500, billingFrequency: 'one-time', quantity: 1 },
  { productId: null, productName: 'License',   unitPrice: 200,  billingFrequency: 'monthly',  quantity: 10 },
]);
```

### addBundleLineItems

Adding a bundle to a quote requires only `bundleId` and `bundleName` — the server expands the bundle's child products itself, so you never send them. Like `addLineItems`, the body takes a single object or an array of **1–50**.

```typescript
const bundleItems = await TurboQuote.addBundleLineItems(quote.id, {
  bundleId: 'bundle-uuid',       // REQUIRED
  bundleName: 'Starter Bundle',  // REQUIRED
  quantity: 2,
});
console.log(bundleItems[0].id);
```

### sendQuote

```typescript
const sent = await TurboQuote.sendQuote(quote.id);
console.log(sent.message);       // 'Quote sent successfully'
console.log(sent.quote.status);  // 'sent'
```

### handleExpiredQuote

Act on a sent quote whose `validUntil` has passed. **`action` accepts exactly two values: `'void'` and `'decline'`.** There is no `'extend'` and no `'resend'` — those are not implemented and return a 400. `reason` (max 190 chars) and `newValidUntil` (ISO date) are **both required**.

The endpoint voids/declines the original quote and creates a duplicate carrying the new `validUntil` date — that duplicate is how you "extend" an expired quote.

```typescript
const result = await TurboQuote.handleExpiredQuote(quoteId, {
  action: 'void',                     // 'void' | 'decline' — nothing else
  reason: 'Pricing refreshed for Q4', // REQUIRED, max 190 chars
  newValidUntil: '2026-12-31',        // REQUIRED, ISO date — carried by the new duplicate
});
```

### downloadQuotePdf

```typescript
import { writeFile } from 'node:fs/promises';

const pdf = await TurboQuote.downloadQuotePdf(quote.id);
await writeFile('quote.pdf', Buffer.from(pdf));  // pdf is ArrayBuffer
```

### getQuoteNumberConfig

Admin-only. Read the org's quote-number config — the format that drives how new quote numbers are generated (prefix, year/month tokens, separator, zero-padding, suffix, starting number, reset cadence).

```typescript
const config = await TurboQuote.getQuoteNumberConfig();

console.log(config.format.prefix);     // string — e.g. 'Q'
console.log(config.format.padWidth);   // number — zero-pad width
console.log(config.currentFloor);      // number — per-period issued floor
```

Response: `{ format, currentFloor }`. `format` carries `prefix`, `yearToken` (`'none' | 'two' | 'four'`), `monthToken` (`'off' | 'two'`), `separator`, `padWidth` (int 0–12), `suffix`, `startNumber` (int >= 0), and `resetCadence` (`'never' | 'yearly' | 'monthly'`). `currentFloor` is the per-period issued floor — `startNumber` can't be set below it.

### updateQuoteNumberConfig

Admin-only. Update the org's quote-number config; returns the same `{ format, currentFloor }` shape. Request-body keys stay camelCase verbatim.

```typescript
// Fetch the current config first, then update with a custom format
const current = await TurboQuote.getQuoteNumberConfig();
console.log(current.format.prefix, current.currentFloor);

const updated = await TurboQuote.updateQuoteNumberConfig({
  prefix: 'INV',
  yearToken: 'none',       // 'none' | 'two' | 'four'
  monthToken: 'off',       // 'off' | 'two'
  separator: '-',
  padWidth: 4,             // int 0–12 — zero-pad to 4 digits
  suffix: '',
  startNumber: 1000,       // int >= 0; can't be below currentFloor
  resetCadence: 'never',   // 'never' | 'yearly' | 'monthly'
});

console.log(updated.format.prefix);  // 'INV'
console.log(updated.currentFloor);   // number
```

Response: `{ format, currentFloor }` — the updated config. All eight `format` fields are required; keys (`prefix`, `yearToken`, `monthToken`, `separator`, `padWidth`, `suffix`, `startNumber`, `resetCadence`) stay camelCase verbatim. `padWidth` and `startNumber` are integers.

### Bulk create (CSV-style imports)

Six catalog resources support bulk creation from an array of rows (e.g. a parsed CSV): `bulkCreateProducts`, `bulkCreatePriceBooks`, `bulkCreateBundles`, `bulkCreateCompanies`, `bulkCreateContacts`, and `bulkCreateTypes`. Each takes an array of row objects (the same shape as the matching single `create*` request); the SDK wraps them in the `{ rows: [...] }` envelope the `POST {resource}/bulk` endpoint expects.

Every product row requires `name`, `categoryId`, `listPrice`, and `billingFrequency`. **`categoryId` must be a real category UUID** — there is no `categoryName` convenience field, and because the backend rejects unknown keys, sending `categoryName` fails the whole row with a 400. Resolve (or create) the category first and pass its UUID:

```typescript
// 1. Resolve the category UUID once — create it if it doesn't exist yet.
const types = await TurboQuote.listTypes({ limit: 100 });
const category =
  types.results.find((t) => t.name === 'Subscriptions' && t.categoryType === 'product_category') ??
  (await TurboQuote.createType({ name: 'Subscriptions', categoryType: 'product_category' }));

// 2. Reference it by UUID on every row.
const result = await TurboQuote.bulkCreateProducts([
  { name: 'Basic Plan',   listPrice: 10,  billingFrequency: 'monthly', categoryId: category.id },
  { name: 'Premium Plan', listPrice: 100, billingFrequency: 'monthly', categoryId: category.id },
]);

console.log(result.imported);   // number — rows that were created

// Partial success: inspect failed rows instead of assuming all-or-nothing
for (const f of result.failed) {
  console.error(`Row ${f.row} failed: ${f.reason}`);   // row is 1-indexed
}
for (const a of result.adjusted) {
  console.warn(`Row ${a.row} adjusted: ${a.reason}`);  // imported with a server-side tweak
}
```

Response: `BulkImportResult` — `{ imported: number, failed: BulkImportRowIssue[], adjusted: BulkImportRowIssue[] }`, where each `BulkImportRowIssue` is `{ row: number, reason: string }` (`row` is 1-indexed into the rows you sent).

Bulk-create semantics:

- **Partial success** — a failed row does **not** throw and does **not** roll back the rows before it. It is reported in `failed` with its 1-indexed `row` and a `reason`. Rows the server tweaked (e.g. an unknown bundle item dropped) appear in `adjusted`. Always read `result.failed` rather than assuming every row imported.
- **500-row cap per request** — more than 500 rows returns 400 `ValidationError`. The SDK does not validate the rows or the cap client-side.
- **Rows are validated against the strict backend schema and unknown keys are rejected.** For products the row shape is exactly `{ name, categoryId, listPrice, billingFrequency, ... }` — a `categoryName` key is not part of the schema and 400s the row.
- **Roles** — available to administrator and contributor API keys.

### Catalog management (products, bundles, price books)

```typescript
// Products
const product = await TurboQuote.createProduct({
  name: 'Enterprise License',
  listPrice: 1200,
  billingFrequency: 'annual',
  categoryId: 'category-uuid',  // required — from a createType({ categoryType: 'product_category' })
  showInCatalog: true,
  images: [imageBuffer],        // optional — MAX 5 images per product, MAX 2 MB each
});
console.log(product.id);

// Bundles
const bundle = await TurboQuote.createBundle({
  name: 'Starter Pack',
  categoryId: 'bundle-category-uuid',  // required — from a createType({ categoryType: 'bundle_category' })
  items: [{ productId: product.id, unitPrice: 1200, billingFrequency: 'annual', quantity: 1 }],
});

// Price books — name + priceBookTypeId + validFrom + discountPercent are ALL required on create
const priceBook = await TurboQuote.createPriceBook({
  name: 'Enterprise Pricing',
  priceBookTypeId: 'pricebook-type-uuid',  // from a createType({ categoryType: 'pricebook_type' })
  validFrom: '2026-01-01',
  discountPercent: 15,
});
const applied = await TurboQuote.applyPriceBook(quote.id, priceBook.id);
console.log(applied.updatedCount, applied.skippedCount);
```

### Quote templates (auto-provisioned — get, then update)

Quote templates are **provisioned for you**. `GET /v1/quote-template` self-heals: if the org has no template it creates one from the org's branding and returns it. Consequences:

- **Never call `createTemplate()` on an established org** — a template already exists, so it returns 400 `TEMPLATE_ALREADY_EXISTS`. The method is effectively unreachable. Do not write get-then-create-if-missing logic.
- **`deleteTemplate()` is really "reset to org branding defaults"** — it soft-deletes, and the very next `getTemplate()` regenerates one.

The correct flow is always **`getTemplate()` → `updateTemplate()`**:

```typescript
const template = await TurboQuote.getTemplate();   // always returns one; creates it if needed
await TurboQuote.updateTemplate(template.id, {
  primaryColor: '#0B5FFF',
  footerText: 'Thanks for your business!',
});
```

### Convenience: createAndSend

```typescript
// Create a quote, add line items, and send in one call
const result = await TurboQuote.createAndSend({
  // Quote fields
  name: 'Q3 Renewal',
  companyId: 'company-uuid',
  contactId: 'contact-uuid',
  currency: 'USD',
  // Line items (custom no-product item needs productId: null explicitly)
  items: [
    { productId: null, productName: 'Support Plan', unitPrice: 800, billingFrequency: 'annual', quantity: 1 },
  ],
  // Send options (passed to the underlying sendQuote call)
  send: {},
});
console.log(result.quote.status); // 'sent'
```

### TurboQuote error handling

```typescript
import {
  TurboDocxError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from '@turbodocx/sdk';

try {
  await TurboQuote.sendQuote(quoteId);
} catch (e) {
  if (e instanceof ValidationError)    /* 400 — bad field value, missing required field */;
  else if (e instanceof AuthenticationError) /* 401 — bad / missing API key or orgId    */;
  else if (e instanceof NotFoundError) /* 404 — quote or resource not found             */;
  else if (e instanceof RateLimitError) /* 429 — back off and retry                     */;
  else if (e instanceof TurboDocxError) /* other typed SDK error                        */;
  else throw e;
}
```

---

## Express Integration Example

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { TurboSign, Deliverable } from '../lib/turbodocx';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// POST /api/signatures/send — upload a PDF and send for signature
router.post('/send', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { recipients, fields, documentName } = req.body;
    const result = await TurboSign.sendSignature({
      file: req.file!.buffer,
      documentName,
      recipients: JSON.parse(recipients),
      fields: JSON.parse(fields),
    });
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/signatures/:id/status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    res.json(await TurboSign.getStatus(req.params.id));
  } catch (error) { handleError(res, error); }
});

// GET /api/signatures/:id/download — stream the signed PDF
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const blob = await TurboSign.download(req.params.id);
    const arrayBuffer = await blob.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(arrayBuffer));
  } catch (error) { handleError(res, error); }
});

// POST /api/signatures/:id/void
router.post('/:id/void', async (req: Request, res: Response) => {
  try {
    res.json(await TurboSign.void(req.params.id, req.body.reason));
  } catch (error) { handleError(res, error); }
});

// POST /api/signatures/:id/resend  (body: { recipientIds: string[] })
router.post('/:id/resend', async (req: Request, res: Response) => {
  try {
    res.json(await TurboSign.resend(req.params.id, req.body.recipientIds));
  } catch (error) { handleError(res, error); }
});

// GET /api/signatures/:id/audit-trail
router.get('/:id/audit-trail', async (req: Request, res: Response) => {
  try {
    res.json(await TurboSign.getAuditTrail(req.params.id));
  } catch (error) { handleError(res, error); }
});

// POST /api/deliverables — generate from a template then optionally send for signature
router.post('/deliverables', async (req: Request, res: Response) => {
  try {
    const { templateId, name, variables, sendToEmail } = req.body;
    const { results } = await Deliverable.generateDeliverable({ templateId, name, variables });

    if (sendToEmail) {
      // Generate-then-sign: hand the deliverableId straight to TurboSign
      const signResult = await TurboSign.sendSignature({
        deliverableId: results.deliverable.id,
        documentName: name,
        recipients: [{ name: 'Signer', email: sendToEmail, signingOrder: 1 }],
        fields: [{ type: 'signature', template: { anchor: '{signature1}', placement: 'replace', size: { width: 200, height: 50 } }, recipientEmail: sendToEmail }],
      });
      res.json({ deliverable: results.deliverable, signature: signResult });
    } else {
      res.json(results.deliverable);
    }
  } catch (error) { handleError(res, error); }
});

export default router;
```

The helper `handleError` is defined in the next section.

---

## Error Handling

```typescript
import {
  TurboDocxError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '@turbodocx/sdk';

function handleError(res: Response, error: unknown) {
  if (error instanceof AuthenticationError) return res.status(401).json({ error: error.message });
  if (error instanceof ValidationError)     return res.status(400).json({ error: error.message });
  if (error instanceof NotFoundError)       return res.status(404).json({ error: error.message });
  if (error instanceof RateLimitError)      return res.status(429).json({ error: error.message });
  if (error instanceof NetworkError)        return res.status(503).json({ error: error.message });
  if (error instanceof TurboDocxError)      return res.status(error.statusCode ?? 500).json({ error: error.message, code: error.code });
  console.error(error);
  return res.status(500).json({ error: 'Internal error' });
}
```

All TurboDocx errors extend `TurboDocxError` and carry `statusCode` and `code` properties. The five specific subtypes above map to HTTP 401 / 400 / 404 / 429 / network failure respectively. Import them directly from `@turbodocx/sdk` — they are **not** namespaced under `TurboSign`.

---

## Method Reference

### TurboSign

| Method | Description |
|--------|-------------|
| `TurboSign.configure(config)` | Set apiKey, orgId, senderEmail, senderName |
| `TurboSign.createSignatureReviewLink(request)` | Prepare a document and get a preview URL (no emails sent) |
| `TurboSign.sendSignature(request)` | Prepare a document and immediately email recipients |
| `TurboSign.getStatus(documentId)` | Get current document status string |
| `TurboSign.download(documentId)` | Download signed PDF as `Blob` |
| `TurboSign.void(documentId, reason)` | Cancel a signature request (reason is required) |
| `TurboSign.resend(documentId, recipientIds)` | Resend signature email to recipient IDs (array of UUIDs) |
| `TurboSign.getAuditTrail(documentId)` | Get tamper-evident audit log with all events |

### Deliverable

| Method | Description |
|--------|-------------|
| `Deliverable.configure(config)` | Set apiKey, orgId |
| `Deliverable.generateDeliverable(request)` | Render a template with variables into a new deliverable |
| `Deliverable.listDeliverables(options?)` | Paginated list with search and tag filters |
| `Deliverable.getDeliverableDetails(id, options?)` | Get full record including variables and fonts |
| `Deliverable.updateDeliverableInfo(id, request)` | Update name, description, or tags (tags replace) |
| `Deliverable.deleteDeliverable(id)` | Soft-delete (data retained, hidden from list) |
| `Deliverable.downloadSourceFile(id)` | Download original DOCX/PPTX as `ArrayBuffer` |
| `Deliverable.downloadPDF(id)` | Download rendered PDF as `ArrayBuffer` |

### TurboPartner — Organizations

| Method | Description |
|--------|-------------|
| `TurboPartner.configure(config)` | Set partnerApiKey, partnerId |
| `TurboPartner.createOrganization(request)` | Provision a new customer org |
| `TurboPartner.listOrganizations(request?)` | List orgs (uses `limit` / `offset`, not `page`) |
| `TurboPartner.getOrganizationDetails(orgId)` | Get org details including features + tracking |
| `TurboPartner.updateOrganizationInfo(orgId, request)` | Rename an org |
| `TurboPartner.deleteOrganization(orgId)` | Delete an org |
| `TurboPartner.updateOrganizationEntitlements(orgId, request)` | Update features and/or tracking |

### TurboPartner — Organization Users

| Method | Description |
|--------|-------------|
| `TurboPartner.listOrganizationUsers(orgId, request?)` | Paginated list |
| `TurboPartner.addUserToOrganization(orgId, request)` | Invite a user with an ORG role (`admin` \| `contributor` \| `user` \| `viewer`) |
| `TurboPartner.updateOrganizationUserRole(orgId, userId, request)` | Change a user's ORG role (`admin` \| `contributor` \| `user` \| `viewer`) |
| `TurboPartner.removeUserFromOrganization(orgId, userId)` | Remove from org |
| `TurboPartner.resendOrganizationInvitationToUser(orgId, userId)` | Resend invite email |

### TurboPartner — Organization API Keys

| Method | Description |
|--------|-------------|
| `TurboPartner.listOrganizationApiKeys(orgId, request?)` | Paginated list |
| `TurboPartner.createOrganizationApiKey(orgId, request)` | Create key with an ORG role (`admin` \| `contributor` \| `user` \| `viewer`); key value returned only on creation |
| `TurboPartner.updateOrganizationApiKey(orgId, keyId, request)` | Rename or change ORG role |
| `TurboPartner.revokeOrganizationApiKey(orgId, keyId)` | Revoke key |

### TurboPartner — Partner API Keys

| Method | Description |
|--------|-------------|
| `TurboPartner.listPartnerApiKeys(request?)` | Paginated list |
| `TurboPartner.createPartnerApiKey(request)` | Create key with scopes |
| `TurboPartner.updatePartnerApiKey(keyId, request)` | Rename, edit scopes |
| `TurboPartner.revokePartnerApiKey(keyId)` | Revoke key |

### TurboPartner — Partner Portal Users

| Method | Description |
|--------|-------------|
| `TurboPartner.listPartnerPortalUsers(request?)` | Paginated list |
| `TurboPartner.addUserToPartnerPortal(request)` | Invite with a PARTNER role (`admin` \| `member` \| `viewer`) + all 7 permission keys |
| `TurboPartner.updatePartnerUserPermissions(userId, request)` | Update role and/or permissions. `permissions` is optional, but if sent it must contain **all 7 keys** — there is no partial update |
| `TurboPartner.removeUserFromPartnerPortal(userId)` | Remove user |
| `TurboPartner.resendPartnerPortalInvitationToUser(userId)` | Resend invite email |

### TurboPartner — Audit Logs

| Method | Description |
|--------|-------------|
| `TurboPartner.getPartnerAuditLogs(request?)` | Filter by action, resource, success, date range |

### TurboWebhooks

| Method | Description |
|--------|-------------|
| `TurboWebhooks.configure(config)` | Set apiKey, orgId (skipSenderValidation is hardcoded) |
| `TurboWebhooks.createWebhook({ urls, events })` | Subscribe the org to events. `urls`: 1–10 HTTPS URLs; `events`: at least 1. Requires an **administrator** API key |
| `TurboWebhooks.getWebhook()` | Get the org's signature webhook + delivery stats |
| `TurboWebhooks.updateWebhook(patch)` | Patch urls / events / isActive. Keys are optional, but an included `urls`/`events` still has to be non-empty (`[]` is a 400) |
| `TurboWebhooks.deleteWebhook()` | Soft-delete the webhook |
| `TurboWebhooks.testWebhook({ eventType, payload })` | Fire a test delivery; surfaces per-URL errors |
| `TurboWebhooks.notifyWebhook({ eventType, payload })` | Manual notify; same handler as `testWebhook` |
| `TurboWebhooks.regenerateWebhookSecret()` | Rotate the HMAC secret (shown ONCE) |
| `TurboWebhooks.listWebhookDeliveries(filters?)` | Paginated delivery history with filters |
| `TurboWebhooks.replayWebhookDelivery(deliveryId)` | Retry a past delivery; returns the new delivery row |
| `TurboWebhooks.getWebhookStats({ days? })` | Aggregate stats over a sliding window |
| `verifyWebhookSignature(rawBody, sigHeader, tsHeader, secret, opts?)` | Free function; verifies inbound deliveries |

### TurboQuote — Quotes

| Method | Description |
|--------|-------------|
| `TurboQuote.configure(config)` | Set apiKey, orgId (no senderEmail needed) |
| `TurboQuote.listQuotes(options?)` | Paginated list with filters; includes totals/stats |
| `TurboQuote.createQuote(request)` | Create a new draft quote |
| `TurboQuote.getQuote(id)` | Get quote details (statusInfo merged in) |
| `TurboQuote.updateQuote(id, request)` | PATCH quote fields; pass explicit `null` to clear nullable fields |
| `TurboQuote.deleteQuote(id)` | Delete a quote |
| `TurboQuote.duplicateQuote(id)` | Clone a quote to a new draft |
| `TurboQuote.sendQuote(id, request?)` | Email quote to customer; returns `{ quote, message }` |
| `TurboQuote.sendQuoteWithDeliverable(id, request)` | Send with attached TurboDocx deliverable; returns `{ quote, message, documentId }` |
| `TurboQuote.declineQuote(id, { reason })` | Mark as declined |
| `TurboQuote.voidQuote(id, { reason })` | Void a sent quote |
| `TurboQuote.handleExpiredQuote(id, request)` | Void or decline an expired sent quote and re-issue it as a duplicate. `action` is `'void'` \| `'decline'` only; `reason` (max 190) and `newValidUntil` (ISO date) are both required |
| `TurboQuote.applyPriceBook(quoteId, priceBookId)` | Apply price-book pricing to all matching line items |
| `TurboQuote.removePriceBook(quoteId)` | Detach price book from quote |
| `TurboQuote.downloadQuotePdf(id)` | Download rendered quote PDF as `ArrayBuffer` |
| `TurboQuote.getQuoteNumberConfig()` | Admin-only: read the org's quote-number config `{ format, currentFloor }` |
| `TurboQuote.updateQuoteNumberConfig(format)` | Admin-only: update the quote-number format; returns `{ format, currentFloor }` |
| `TurboQuote.createAndSend(request)` | Convenience: create quote + add items + send in one call |

### TurboQuote — Line Items

| Method | Description |
|--------|-------------|
| `TurboQuote.listLineItems(quoteId, options?)` | List line items for a quote |
| `TurboQuote.addLineItems(quoteId, items)` | Add 1–50 product line items (auto-wraps a single object to an array). `productId` (key), `productName`, `unitPrice`, `billingFrequency` all required |
| `TurboQuote.addBundleLineItems(quoteId, items)` | Add 1–50 bundle line items; each needs only `bundleId` + `bundleName` (the server expands the children) |
| `TurboQuote.updateLineItem(quoteId, itemId, request)` | PATCH a single line item |
| `TurboQuote.removeLineItem(quoteId, itemId)` | Delete a line item |

### TurboQuote — Products

| Method | Description |
|--------|-------------|
| `TurboQuote.listProducts(options?)` | Paginated product catalog |
| `TurboQuote.createProduct(request)` | Create a product (uses multipart when `images` array is provided — max 5 images, 2 MB each) |
| `TurboQuote.bulkCreateProducts(rows)` | Bulk-import products; each row needs `name`, `categoryId` (UUID), `listPrice`, `billingFrequency`. Returns a partial-success `BulkImportResult` |
| `TurboQuote.getProduct(id)` | Get a single product |
| `TurboQuote.updateProduct(id, request)` | PATCH a product; multipart when images included (max 5 images, 2 MB each) |
| `TurboQuote.deleteProduct(id)` | Delete a product |
| `TurboQuote.duplicateProduct(id)` | Clone a product |
| `TurboQuote.getProductPrimaryImages(productIds)` | Batch-fetch primary images; returns `{ [productId]: image \| null }` |

### TurboQuote — Bundles

| Method | Description |
|--------|-------------|
| `TurboQuote.listBundles(options?)` | Paginated bundle catalog |
| `TurboQuote.createBundle(request)` | Create a bundle |
| `TurboQuote.bulkCreateBundles(rows)` | Bulk-import bundles; returns a partial-success `BulkImportResult` |
| `TurboQuote.getBundle(id)` | Get a single bundle |
| `TurboQuote.updateBundle(id, request)` | PATCH a bundle |
| `TurboQuote.deleteBundle(id)` | Delete a bundle |
| `TurboQuote.duplicateBundle(id)` | Clone a bundle |

### TurboQuote — Price Books

| Method | Description |
|--------|-------------|
| `TurboQuote.listPriceBooks(options?)` | Paginated price book list |
| `TurboQuote.createPriceBook(request)` | Create a price book |
| `TurboQuote.bulkCreatePriceBooks(rows)` | Bulk-import price books; returns a partial-success `BulkImportResult` |
| `TurboQuote.getPriceBook(id)` | Get a single price book |
| `TurboQuote.updatePriceBook(id, request)` | PATCH a price book |
| `TurboQuote.deletePriceBook(id)` | Delete a price book |
| `TurboQuote.duplicatePriceBook(id)` | Clone a price book |
| `TurboQuote.listPriceBookProducts(id, options?)` | List products attached to a price book |

### TurboQuote — Companies and Contacts

| Method | Description |
|--------|-------------|
| `TurboQuote.listCompanies(options?)` | Paginated company list |
| `TurboQuote.createCompany(request)` | Create a company (`contacts` array with at least one entry required) |
| `TurboQuote.bulkCreateCompanies(rows)` | Bulk-import companies; returns a partial-success `BulkImportResult` |
| `TurboQuote.getCompany(id)` | Get a single company |
| `TurboQuote.updateCompany(id, request)` | PATCH a company |
| `TurboQuote.deleteCompany(id)` | Delete a company |
| `TurboQuote.listCompanyContacts(companyId, options?)` | List contacts belonging to a company |
| `TurboQuote.listContacts(options?)` | Paginated contact list across all companies |
| `TurboQuote.createContact(request)` | Create a standalone contact |
| `TurboQuote.bulkCreateContacts(rows)` | Bulk-import contacts; returns a partial-success `BulkImportResult` |
| `TurboQuote.updateContact(id, request)` | PATCH a contact |
| `TurboQuote.deleteContact(id)` | Delete a contact |

### TurboQuote — Templates and Types

| Method | Description |
|--------|-------------|
| `TurboQuote.listTemplates(options?)` | List all quote templates |
| `TurboQuote.getTemplate()` | Get the org's singleton default template (`/v1/quote-template`). Self-heals: auto-creates one from org branding if none exists, so it always returns a template |
| `TurboQuote.getTemplateById(id)` | Get a specific template by ID |
| `TurboQuote.createTemplate(request)` | Effectively unreachable — the template is auto-provisioned, so this returns 400 `TEMPLATE_ALREADY_EXISTS` on any established org. Use `getTemplate()` → `updateTemplate()` |
| `TurboQuote.updateTemplate(id, request)` | PATCH a template — this is how you customize it |
| `TurboQuote.deleteTemplate(id)` | Reset to org branding defaults (soft-delete; the next `getTemplate()` regenerates one) |
| `TurboQuote.listTypes(options?)` | List quote types/categories |
| `TurboQuote.createType(request)` | Create a quote type |
| `TurboQuote.bulkCreateTypes(rows)` | Bulk-import types/categories; returns a partial-success `BulkImportResult` |
| `TurboQuote.updateType(id, request)` | PATCH a type name |
| `TurboQuote.deleteType(id)` | Delete a type |

---

## Gotchas

- **`senderEmail` is required** for `TurboSign.configure()` — without it `ValidationError` is thrown. `senderName` is optional but strongly recommended (otherwise emails appear from "API Service User").
- **File input** to TurboSign accepts: `Buffer`, file-path `string`, browser `File`, remote URL (`fileLink`), `deliverableId`, or `templateId`. Magic-byte detection identifies PDF / DOCX / PPTX automatically.
- **Template anchors** like `{signature1}` must literally exist in the document text for `template.anchor` field placement to work.
- **Pagination uses `offset`, not `page`**, across all `list*` methods. Defaults vary (Deliverable defaults to 6, partner list endpoints to ~25).
- **`updateOrganizationEntitlements` takes `{ features?, tracking? }`** — not a bare features object. `features` holds capability/limit columns (`maxUsers`, `maxStorage`, `maxAPIKeys`, `hasTDAI`, …); `tracking` holds usage counters and uses the `num*` key names: `numUsers`, `numProjectspaces`, `numTemplates`, `storageUsed`, `numGeneratedDeliverables`, `numSignaturesUsed`, `numQuotesSent`, `currentAICredits`. The two key sets are not interchangeable — a `maxUsers` key inside `tracking` is rejected. `currentAICredits` accepts `-1` (unlimited); every other counter floors at 0.
- **Two different role enums — do not mix them.** Organization users and organization API keys take `'admin' | 'contributor' | 'user' | 'viewer'`. Partner-portal users take `'admin' | 'member' | 'viewer'`. `'member'` is not a valid org role, and `'contributor'` / `'user'` are not valid partner roles — either mistake is a 400.
- **Partner `permissions` has no partial update.** The `permissions` object is optional on `updatePartnerUserPermissions`, but every key inside it is required, so if you send `permissions` you must send **all seven**: `canManageOrgs`, `canManageOrgUsers`, `canManagePartnerUsers`, `canManageOrgAPIKeys`, `canManagePartnerAPIKeys`, `canUpdateEntitlements`, `canViewAuditLogs`. Sending a subset is a 400. To flip one flag, read the current permissions and spread them; to change only the role, omit `permissions` entirely.
- **`TurboSign.void` requires a `reason`** as the second argument. **`TurboSign.resend` takes recipient IDs (UUIDs), not email addresses** — fetch them from the send response or audit trail.
- **`TurboSign.download` returns `Blob`**, not `Buffer`. Call `await blob.arrayBuffer()` then `Buffer.from(...)` in Node. Under the hood the download is **two steps**: the API returns JSON `{ downloadUrl, fileName }` rather than bytes, and the presigned `downloadUrl` must then be fetched **without an `Authorization` header** (S3 rejects a presigned request that also carries one). The SDK does both; hand-rolled REST calls must too.
- **API key values are only returned on creation** for both `createOrganizationApiKey` and `createPartnerApiKey`. Store `created.data.key` immediately — subsequent lookups omit it.
- **Updating tags via `updateDeliverableInfo` replaces the full set** — fetch existing tags first if you want to add one.
- **TypeScript users** get full type definitions out of the box — no `@types/` package needed.
- **TurboWebhooks requires an admin TDX- key.** The backend route gate is `requireOrgRole(administrator)` — a non-admin key returns 403 `AuthorizationError`.
- **One webhook per org, fixed name `signature`.** The SDK is hardcoded to `/api/webhooks/signature` to stay in sync with the dashboard's Signature Webhooks page. There is no `listWebhooks` by design. For multi-webhook management call the REST API directly.
- **Webhook secrets are shown ONCE** — capture `created.secret` from `createWebhook` and `rotated.secret` from `regenerateWebhookSecret` immediately. They are never returned again by `getWebhook` or any other endpoint.
- **Webhook URLs must be HTTPS.** Non-HTTPS URLs return 400 `ValidationError` from the backend.
- **`urls` is 1–10, `events` is 1+ — on create AND on update.** Both keys are optional on `updateWebhook`, but optional does not relax the minimum: an included `urls: []` or `events: []` is a 400. To leave routing alone, omit the key rather than passing an empty array.
- **Use `express.raw({ type: 'application/json' })` on your receiver route, not `express.json()`.** Signature verification is computed over the raw bytes; a JSON re-stringify will not match.
- **Middleware ORDER matters.** Mount `express.raw()` for the webhook path BEFORE any global `app.use(express.json())`. Express body-parsers set `req._body=true` on the first parse and later parsers silently no-op — if `express.json()` is global and runs first for `/webhooks`, the route-level `express.raw()` becomes a no-op and `req.body` ends up as a parsed object, not a Buffer. Verification will then always fail. The correct pattern is `app.use('/webhooks/turbodocx', express.raw({ type: 'application/json' }))` BEFORE `app.use(express.json())`.
- **`verifyWebhookSignature` is a free function**, not a method on `TurboWebhooks` — import it directly from `@turbodocx/sdk`. It has no `apiKey`/`orgId` dependency.

- **TurboQuote decimal fields come back as `number`, not strings.** The SDK's response normalizer coerces the backend's decimal strings (`listPrice`, `unitPrice`, `grandTotal`, `taxRate`, `discountPercent`, etc.) to JavaScript numbers before returning — do not parse them with `parseFloat`.
- **`PATCH` with explicit `null` clears nullable fields.** For `updateQuote`, `updateLineItem`, `updateProduct`, and similar PATCH methods, passing `{ priceBookId: null }` sends `null` in the request body and the backend clears the field. Omitting the key entirely leaves it unchanged. This is intentional for fields like `validUntil`, `taxRate`, `priceBookId`.
- **`discountType` is `'percent' | 'amount'`** on line items. When using `'percent'`, set `discountPercent` (0–100). When using `'amount'`, set the flat discount value. Mixing both in the same item produces a 400 `ValidationError`.
- **`addLineItems` auto-wraps a single object to an array.** You can pass either one `AddLineItemRequest` or `AddLineItemRequest[]` — the SDK normalizes it. The return is always `LineItem[]`.
- **Every product line item needs four fields: `productId`, `productName`, `unitPrice`, `billingFrequency`.** `productId` is a required *key* whose *value* may be `null` (that's how you add a custom, non-catalog item) — omitting the key entirely is a 400. `quantity` defaults to 1.
- **Three distinct bundle shapes — don't conflate them.** `createBundle`'s `items[]` (catalog bundle contents) need `productId`, `unitPrice`, `billingFrequency` and nothing else — no `productName`. `addBundleLineItems` (attaching a bundle to a quote) needs only `bundleId` + `bundleName`; the server expands the child products for you.
- **Line-item array limits: `addLineItems` and `addBundleLineItems` accept 1–50 items per call; reorder accepts up to 200.** Chunk larger imports.
- **`termDays` defaults to 60** (not 30), maxes out at 3650, and `-1` means auto-renewal. `renewalPeriod` (`'weekly' | 'monthly' | 'quarterly' | 'annually'`) is **required when `termDays === -1`** and must be absent/`null` for any other `termDays` — sending it otherwise is a 400.
- **`handleExpiredQuote` only accepts `action: 'void' | 'decline'`.** `'extend'` and `'resend'` do not exist in the API and return a 400. `reason` (max 190 chars) and `newValidUntil` (ISO date) are both required; the endpoint voids/declines the original and issues a duplicate carrying the new date — that duplicate *is* the "extend".
- **Quote templates are auto-provisioned.** `getTemplate()` self-heals — it creates one from org branding when none exists — so `createTemplate()` on an established org returns 400 `TEMPLATE_ALREADY_EXISTS` and is effectively unreachable. Always do `getTemplate()` → `updateTemplate()`. `deleteTemplate()` is a reset-to-branding-defaults, not a permanent removal.
- **Product images: max 5 per product, 2 MB each.** Exceeding either returns 400 `MAX_IMAGES_EXCEEDED`.
- **`createCompany` requires at least one contact.** Pass a `contacts` array with at least one entry or the backend returns 400.
- **No `getContact` or `getType` methods.** The backend has no `GET /v1/contacts/:id` or `GET /v1/types/:id` routes — this is intentional, not an SDK gap.
- **Bulk creates are partial-success, not transactional.** `bulkCreateProducts`/`bulkCreatePriceBooks`/`bulkCreateBundles`/`bulkCreateCompanies`/`bulkCreateContacts`/`bulkCreateTypes` never throw on a bad row — read `result.failed` (`[{ row, reason }]`, `row` 1-indexed) and `result.adjusted`; earlier rows are not rolled back. Cap is 500 rows/request (over → 400). Admin + contributor keys only.
- **Bulk product rows take `categoryId`, never `categoryName`.** The row schema is strict and rejects unknown keys, so a `categoryName` field 400s the row. Resolve or create the category with `listTypes()` / `createType()` first and pass its UUID. Required per row: `name`, `categoryId`, `listPrice`, `billingFrequency`.

**Full API reference:** https://docs.turbodocx.com/docs
