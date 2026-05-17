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
import { TurboSign, TurboPartner, Deliverable } from '@turbodocx/sdk';

// CommonJS
const { TurboSign, TurboPartner, Deliverable } = require('@turbodocx/sdk');
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

Returns a `Blob` (the SDK fetches the presigned URL and the binary in two steps for you).

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

// Invite
const user = await TurboPartner.addUserToOrganization('org-uuid', {
  email: 'newhire@acme.com',
  role: 'contributor', // 'admin' | 'contributor' | 'user' | 'viewer'
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

// Add (permissions are required on add — list every flag explicitly)
const user = await TurboPartner.addUserToPartnerPortal({
  email: 'admin@partner.com',
  role: 'admin', // 'admin' | 'member' | 'viewer'
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

// Update — permissions can be partial here
await TurboPartner.updatePartnerUserPermissions('user-uuid', {
  role: 'member',
  permissions: { canManageOrgs: true, canManageOrgUsers: true },
});

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

Throws `ConflictError` (409) if the signature webhook already exists for the org. Throws `ValidationError` (400) for non-HTTPS URLs.

### getWebhook

```typescript
const webhook = await TurboWebhooks.getWebhook();
// webhook.urls, webhook.events, webhook.isActive
// webhook.deliveryStats.{totalDeliveries, successfulDeliveries, failedDeliveries, pendingRetries}
```

### updateWebhook

```typescript
await TurboWebhooks.updateWebhook({
  urls: ['https://your-server.example.com/webhooks/turbodocx'],
  events: ['signature.document.completed'],
  isActive: true,
});
```

All three fields are optional — pass only what you want to change.

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

// IMPORTANT: use express.raw — the signature is computed over raw bytes.
// express.json() will mangle whitespace and break verification.
app.post(
  '/webhooks/turbodocx',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.header('x-turbodocx-signature') ?? '';
    const timestamp = req.header('x-turbodocx-timestamp') ?? '';
    const secret = process.env.TURBODOCX_WEBHOOK_SECRET!;

    if (!verifyWebhookSignature(req.body, signature, timestamp, secret)) {
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString('utf8'));
    // process event.eventType, event.data, ...
    res.status(200).send('ok');
  },
);
```

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
| `TurboPartner.addUserToOrganization(orgId, request)` | Invite a user with role |
| `TurboPartner.updateOrganizationUserRole(orgId, userId, request)` | Change a user's role |
| `TurboPartner.removeUserFromOrganization(orgId, userId)` | Remove from org |
| `TurboPartner.resendOrganizationInvitationToUser(orgId, userId)` | Resend invite email |

### TurboPartner — Organization API Keys

| Method | Description |
|--------|-------------|
| `TurboPartner.listOrganizationApiKeys(orgId, request?)` | Paginated list |
| `TurboPartner.createOrganizationApiKey(orgId, request)` | Create key (key value returned only on creation) |
| `TurboPartner.updateOrganizationApiKey(orgId, keyId, request)` | Rename or change role |
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
| `TurboPartner.addUserToPartnerPortal(request)` | Invite with role and permissions |
| `TurboPartner.updatePartnerUserPermissions(userId, request)` | Update role/permissions (partial OK) |
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
| `TurboWebhooks.createWebhook({ urls, events })` | Subscribe the org to events (HTTPS URLs only) |
| `TurboWebhooks.getWebhook()` | Get the org's signature webhook + delivery stats |
| `TurboWebhooks.updateWebhook(patch)` | Patch urls / events / isActive |
| `TurboWebhooks.deleteWebhook()` | Soft-delete the webhook |
| `TurboWebhooks.testWebhook({ eventType, payload })` | Fire a test delivery; surfaces per-URL errors |
| `TurboWebhooks.notifyWebhook({ eventType, payload })` | Manual notify; same handler as `testWebhook` |
| `TurboWebhooks.regenerateWebhookSecret()` | Rotate the HMAC secret (shown ONCE) |
| `TurboWebhooks.listWebhookDeliveries(filters?)` | Paginated delivery history with filters |
| `TurboWebhooks.replayWebhookDelivery(deliveryId)` | Retry a past delivery; returns the new delivery row |
| `TurboWebhooks.getWebhookStats({ days? })` | Aggregate stats over a sliding window |
| `verifyWebhookSignature(rawBody, sigHeader, tsHeader, secret, opts?)` | Free function; verifies inbound deliveries |

---

## Gotchas

- **`senderEmail` is required** for `TurboSign.configure()` — without it `ValidationError` is thrown. `senderName` is optional but strongly recommended (otherwise emails appear from "API Service User").
- **File input** to TurboSign accepts: `Buffer`, file-path `string`, browser `File`, remote URL (`fileLink`), `deliverableId`, or `templateId`. Magic-byte detection identifies PDF / DOCX / PPTX automatically.
- **Template anchors** like `{signature1}` must literally exist in the document text for `template.anchor` field placement to work.
- **Pagination uses `offset`, not `page`**, across all `list*` methods. Defaults vary (Deliverable defaults to 6, partner list endpoints to ~25).
- **`updateOrganizationEntitlements` takes `{ features?, tracking? }`** — not a bare features object. Tracking lets you seed usage counters.
- **`TurboSign.void` requires a `reason`** as the second argument. **`TurboSign.resend` takes recipient IDs (UUIDs), not email addresses** — fetch them from the send response or audit trail.
- **`TurboSign.download` returns `Blob`**, not `Buffer`. Call `await blob.arrayBuffer()` then `Buffer.from(...)` in Node.
- **API key values are only returned on creation** for both `createOrganizationApiKey` and `createPartnerApiKey`. Store `created.data.key` immediately — subsequent lookups omit it.
- **Updating tags via `updateDeliverableInfo` replaces the full set** — fetch existing tags first if you want to add one.
- **TypeScript users** get full type definitions out of the box — no `@types/` package needed.
- **TurboWebhooks requires an admin TDX- key.** The backend route gate is `requireOrgRole(administrator)` — a non-admin key returns 403 `AuthorizationError`.
- **One webhook per org, fixed name `signature`.** The SDK is hardcoded to `/api/webhooks/signature` to stay in sync with the dashboard's Signature Webhooks page. There is no `listWebhooks` by design. For multi-webhook management call the REST API directly.
- **Webhook secrets are shown ONCE** — capture `created.secret` from `createWebhook` and `rotated.secret` from `regenerateWebhookSecret` immediately. They are never returned again by `getWebhook` or any other endpoint.
- **Webhook URLs must be HTTPS.** Non-HTTPS URLs return 400 `ValidationError` from the backend.
- **Use `express.raw({ type: 'application/json' })` on your receiver route, not `express.json()`.** Signature verification is computed over the raw bytes; a JSON re-stringify will not match.
- **`verifyWebhookSignature` is a free function**, not a method on `TurboWebhooks` — import it directly from `@turbodocx/sdk`. It has no `apiKey`/`orgId` dependency.

**Full API reference:** https://docs.turbodocx.com/docs
