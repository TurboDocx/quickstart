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
import { TurboSign, TurboPartner } from '@turbodocx/sdk';

// CommonJS
const { TurboSign, TurboPartner } = require('@turbodocx/sdk');
```

## TurboSign Configuration

```typescript
import { TurboSign } from '@turbodocx/sdk';

TurboSign.configure({
  apiKey: process.env.TURBODOCX_API_KEY!,
  orgId: process.env.TURBODOCX_ORG_ID!,
  senderEmail: process.env.TURBODOCX_SENDER_EMAIL!,
  senderName: process.env.TURBODOCX_SENDER_NAME,
});
```

## TurboSign Usage

### sendSignature

```typescript
const result = await TurboSign.sendSignature({
  file: pdfBuffer,                    // Buffer, file path, URL, or deliverable ID
  documentName: 'Partnership Agreement',
  recipients: [
    { name: 'John Doe', email: 'john@example.com', signingOrder: 1 },
  ],
  fields: [
    {
      type: 'signature',
      recipientEmail: 'john@example.com',
      template: {
        anchor: '{signature1}',       // Text anchor in the PDF
        placement: 'replace',
        size: { width: 100, height: 30 },
      },
    },
  ],
});

console.log('Document ID:', result.documentId);
```

### getStatus

```typescript
const status = await TurboSign.getStatus(documentId);
console.log('Status:', status.status);         // 'pending' | 'completed' | 'voided'
console.log('Recipients:', status.recipients); // Array with per-recipient status
```

### download

```typescript
const pdf = await TurboSign.download(documentId);
// pdf is a Buffer containing the signed PDF
```

## TurboPartner Configuration

```typescript
import { TurboPartner } from '@turbodocx/sdk';

TurboPartner.configure({
  partnerApiKey: process.env.TURBODOCX_PARTNER_API_KEY!,
  partnerId: process.env.TURBODOCX_PARTNER_ID!,
});
```

## TurboPartner Usage

### createOrganization

```typescript
const org = await TurboPartner.createOrganization({
  name: 'Acme Corp',
  features: { maxUsers: 50, hasTDAI: true },
});

console.log('Org ID:', org.data.id);
```

### listOrganizations

```typescript
const orgs = await TurboPartner.listOrganizations({
  page: 1,
  limit: 20,
});

console.log('Total:', orgs.total);
orgs.data.forEach((org) => console.log(org.name, org.id));
```

## Express Integration Example

```typescript
import { Router, Request, Response } from 'express';
import { TurboSign } from '../lib/turbodocx';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// POST /api/signatures/send
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
    if (error instanceof TurboSign.ValidationError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Signature request failed' });
    }
  }
});

// GET /api/signatures/:id/status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const status = await TurboSign.getStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
```

## Error Handling

```typescript
import { TurboDocxError } from '@turbodocx/sdk';

try {
  await TurboSign.sendSignature({ /* ... */ });
} catch (error) {
  if (error instanceof TurboDocxError) {
    // error.code    — machine-readable error code
    // error.message — human-readable description
    // error.status  — HTTP status (if API error)

    // Specific subtypes:
    // AuthenticationError — invalid/missing API key
    // ValidationError    — bad request (e.g., missing senderEmail)
    // NotFoundError      — document/org not found
    // RateLimitError     — too many requests
    // NetworkError       — connection failure
  }
}
```

## Method Reference

| Method | Description |
|--------|-------------|
| `TurboSign.sendSignature(opts)` | Send document for e-signature |
| `TurboSign.createSignatureReviewLink(opts)` | Preview signatures without sending emails |
| `TurboSign.getStatus(documentId)` | Get document + recipient status |
| `TurboSign.download(documentId)` | Download signed PDF as Buffer |
| `TurboSign.voidDocument(documentId)` | Cancel a signature request |
| `TurboSign.resendEmail(documentId, recipientEmail)` | Resend signature email |
| `TurboSign.getAuditTrail(documentId)` | Get complete audit trail |
| `TurboPartner.createOrganization(opts)` | Provision a new customer org |
| `TurboPartner.listOrganizations(opts)` | List managed organizations |
| `TurboPartner.getOrganization(orgId)` | Get org details |
| `TurboPartner.updateEntitlements(orgId, features)` | Update org entitlements |

## Gotchas

- **`senderEmail` is required** for `sendSignature()` — configure it globally or pass per-call
- **File input** accepts: `Buffer`, file path string, URL string, deliverable ID, or template ID
- **Template anchors** like `{signature1}` must exist in the PDF text for field placement to work
- If using TypeScript, the SDK ships with full type definitions — no `@types/` package needed
