# PHP SDK Reference

## Install

```bash
composer require turbodocx/sdk
```

Also install phpdotenv for .env loading:
```bash
composer require vlucas/phpdotenv
```

Load in your bootstrap/entry point:
```php
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
```

## Imports

```php
use TurboDocx\TurboSign;
use TurboDocx\TurboPartner;
use TurboDocx\Config\HttpClientConfig;
use TurboDocx\Config\PartnerClientConfig;
use TurboDocx\Exceptions\TurboDocxException;
```

## TurboSign Configuration

```php
use TurboDocx\TurboSign;
use TurboDocx\Config\HttpClientConfig;

TurboSign::configure(new HttpClientConfig(
    apiKey: $_ENV['TURBODOCX_API_KEY'],
    orgId: $_ENV['TURBODOCX_ORG_ID'],
    senderEmail: $_ENV['TURBODOCX_SENDER_EMAIL'],
    senderName: $_ENV['TURBODOCX_SENDER_NAME'] ?? null,
));

// Or auto-configure from environment
TurboSign::configure(HttpClientConfig::fromEnvironment());
```

`senderEmail` is **required** — `HttpClientConfig` throws `ValidationException` without it. `senderName` is **optional**; when omitted the sender name resolves to **your API key's name**, so name your keys recognisably in the dashboard.

## TurboSign Usage

### sendSignature

```php
use TurboDocx\TurboSign;
use TurboDocx\Types\Recipient;
use TurboDocx\Types\Field;
use TurboDocx\Types\SignatureFieldType;
use TurboDocx\Types\TemplateConfig;
use TurboDocx\Types\FieldPlacement;
use TurboDocx\Types\Requests\SendSignatureRequest;

$result = TurboSign::sendSignature(
    new SendSignatureRequest(
        file: file_get_contents('contract.pdf'),
        documentName: 'Partnership Agreement',
        recipients: [
            new Recipient('John Doe', 'john@example.com', 1),
        ],
        fields: [
            new Field(
                type: SignatureFieldType::SIGNATURE,
                recipientEmail: 'john@example.com',
                template: new TemplateConfig(
                    anchor: '{signature1}',
                    placement: FieldPlacement::REPLACE,
                    size: ['width' => 100, 'height' => 30],
                ),
            ),
        ],
    )
);

echo "Document ID: {$result->documentId}\n";
```

### getStatus

```php
$status = TurboSign::getStatus($documentId);
echo "Status: {$status->status}\n";   // 'draft' | 'under_review' | 'completed' | 'voided' | ...
```

`DocumentStatusResponse` carries **only** `status` (matching the other SDKs). For per-recipient
progress use `TurboSign::getAuditTrail($documentId)`.

### download

```php
$pdfBytes = TurboSign::download($documentId);
file_put_contents('signed.pdf', $pdfBytes);
```

### createSignatureReviewLink

Prepares the document with recipients and fields but **does not send signature emails** — use this to preview field placement before sending.

```php
use TurboDocx\Types\Requests\CreateSignatureReviewLinkRequest;

$result = TurboSign::createSignatureReviewLink(
    new CreateSignatureReviewLinkRequest(
        file: file_get_contents('nda.pdf'),
        documentName: 'NDA - Acme',
        recipients: [
            new Recipient('John Doe', 'john@example.com', 1),
        ],
        fields: [
            new Field(
                type: SignatureFieldType::SIGNATURE,
                recipientEmail: 'john@example.com',
                page: 1,
                x: 100,
                y: 500,
                width: 200,
                height: 50,
            ),
        ],
    )
);

echo "Document ID: {$result->documentId}\n";
echo "Preview URL: {$result->previewUrl}\n";  // open to review field placement
// $result->recipients is an array of plain arrays: id / name / email / metadata.
// There is no signUrl on them — use $result->previewUrl for the document-level preview.
foreach ($result->recipients ?? [] as $recipient) {
    echo "  {$recipient['name']} <{$recipient['email']}> id={$recipient['id']}\n";
}
```

### void

```php
$voided = TurboSign::void($documentId, 'Counterparty requested changes');
echo "Status: {$voided->status}\n";    // 'voided'
echo "Voided at: {$voided->voidedAt}\n";
```

`reason` is **required**.

### resend

```php
// $recipientIds are UUIDs — fetch from sendSignature/createSignatureReviewLink response or getAuditTrail
$result = TurboSign::resend($documentId, [$recipientId1, $recipientId2]);
echo "Resent to {$result->recipientCount} recipients\n";

// Pass an empty array to resend to all pending recipients
$result = TurboSign::resend($documentId, []);
```

### getAuditTrail

```php
$audit = TurboSign::getAuditTrail($documentId);
echo "Document: {$audit->document->name}\n";

foreach ($audit->auditTrail as $entry) {
    $userEmail = $entry->user?->email ?? '';
    echo "{$entry->timestamp}  {$entry->actionType}  {$userEmail}\n";
}
```

## Deliverable

Document generation: render a TurboDocx template with variable substitution into a deliverable (DOCX/PPTX), then download it or hand its ID to TurboSign as the source document.

### configure

```php
use TurboDocx\Deliverable;
use TurboDocx\Config\DeliverableConfig;

Deliverable::configure(new DeliverableConfig(
    apiKey: $_ENV['TURBODOCX_API_KEY'],
    orgId: $_ENV['TURBODOCX_ORG_ID'],
));

// Or auto-configure from environment
Deliverable::configure(DeliverableConfig::fromEnvironment());
```

No `senderEmail` needed — Deliverable never sends email.

### generateDeliverable

Generate a document from a template with variable substitution. The request is a plain array; its keys (and each variable's keys) are camelCase (`templateId`, `mimeType`) — they are forwarded to the API verbatim.

```php
$result = Deliverable::generateDeliverable([
    'templateId' => 'template-uuid',
    'name' => 'Employee Contract - John Smith',
    'variables' => [
        ['placeholder' => '{EmployeeName}', 'text' => 'John Smith', 'mimeType' => 'text'],
        ['placeholder' => '{CompanyName}', 'text' => 'TechCorp Inc.', 'mimeType' => 'text'],
        ['placeholder' => '{StartDate}', 'text' => '2026-06-01', 'mimeType' => 'text'],
    ],
    'description' => 'Generated via API for HR onboarding', // optional
    'tags' => ['hr', 'contract'],                          // optional
]);

$deliverable = $result['results']['deliverable'];
echo "{$deliverable['id']}  {$deliverable['name']}  {$deliverable['fileType']}\n";
```

`mimeType` is one of `'text'`, `'html'`, `'image'`, or `'markdown'`. For repeating content (tables, lists), pass a `variableStack` on a variable.

### listDeliverables

```php
$list = Deliverable::listDeliverables([
    'limit' => 20,      // 1-100, default 6
    'offset' => 0,
    'query' => 'contract',
    'showTags' => true,
]);

echo "{$list['totalRecords']}\n";
foreach ($list['results'] as $d) {
    echo "  {$d['id']}  {$d['name']}  {$d['createdOn']}\n";
}
```

Pagination uses `offset`, not a page number.

### getDeliverableDetails

```php
$d = Deliverable::getDeliverableDetails('deliverable-uuid', showTags: true);
echo "{$d['name']}  {$d['templateName']}\n";
```

Returns the full deliverable record (unwrapped from `results`), including `variables` and (when `showTags: true`) `tags`.

### updateDeliverableInfo

```php
$result = Deliverable::updateDeliverableInfo('deliverable-uuid', [
    'name' => 'Employee Contract - John Smith (Final)',
    'description' => 'Finalized version',
    'tags' => ['hr', 'contract', 'finalized'], // replaces all existing tags
]);
echo "{$result['message']}  {$result['deliverableId']}\n";
```

Passing `tags` **replaces** the full tag set. To remove all tags, pass `'tags' => []`. To add one, fetch existing tags first and append.

### deleteDeliverable

```php
$result = Deliverable::deleteDeliverable('deliverable-uuid');
echo $result['message'] . "\n"; // soft delete — data is retained but hidden from list
```

### downloadSourceFile / downloadPDF

Both return raw bytes as a string — write them straight to disk.

```php
$docxBytes = Deliverable::downloadSourceFile('deliverable-uuid');
file_put_contents('contract.docx', $docxBytes);

$pdfBytes = Deliverable::downloadPDF('deliverable-uuid');
file_put_contents('contract.pdf', $pdfBytes);
```

`downloadSourceFile` returns the original DOCX/PPTX and requires the `hasFileDownload` entitlement.

### Generate, then send for signature

```php
use TurboDocx\TurboSign;
use TurboDocx\Types\Recipient;
use TurboDocx\Types\Field;
use TurboDocx\Types\SignatureFieldType;
use TurboDocx\Types\TemplateConfig;
use TurboDocx\Types\FieldPlacement;
use TurboDocx\Types\Requests\SendSignatureRequest;

$result = Deliverable::generateDeliverable([
    'templateId' => 'template-uuid',
    'name' => 'Consulting Agreement',
    'variables' => [
        ['placeholder' => '{ClientName}', 'text' => 'Acme Corp', 'mimeType' => 'text'],
    ],
]);

TurboSign::sendSignature(
    new SendSignatureRequest(
        deliverableId: $result['results']['deliverable']['id'], // no download/re-upload
        documentName: 'Consulting Agreement',
        recipients: [
            new Recipient('John Doe', 'john@example.com', 1),
        ],
        fields: [
            new Field(
                type: SignatureFieldType::SIGNATURE,
                recipientEmail: 'john@example.com',
                template: new TemplateConfig(
                    anchor: '{signature1}',
                    placement: FieldPlacement::REPLACE,
                    size: ['width' => 100, 'height' => 30],
                ),
            ),
        ],
    )
);
```

## TurboPartner

Partner-portal operations: provision and manage customer organizations, their users, API keys, entitlements, and audit logs. Uses **separate partner credentials**. Request-body array values use **camelCase keys** (e.g. `maxUsers`, `canManageOrgs`).

### Configuration

```php
use TurboDocx\TurboPartner;
use TurboDocx\Config\PartnerClientConfig;

TurboPartner::configure(new PartnerClientConfig(
    partnerApiKey: $_ENV['TURBODOCX_PARTNER_API_KEY'], // starts with TDXP-
    partnerId: $_ENV['TURBODOCX_PARTNER_ID'],          // UUID
));
```

### Organization management

```php
use TurboDocx\Types\Requests\Partner\CreateOrganizationRequest;
use TurboDocx\Types\Requests\Partner\ListOrganizationsRequest;
use TurboDocx\Types\Requests\Partner\UpdateOrganizationRequest;
use TurboDocx\Types\Requests\Partner\UpdateEntitlementsRequest;

// Create
$org = TurboPartner::createOrganization(new CreateOrganizationRequest(
    name: 'Acme Corp',
    metadata: ['industry' => 'Technology'],
    features: ['maxUsers' => 50, 'hasTDAI' => true], // optional initial entitlements; camelCase keys
));
echo $org->data->id;

// List (uses limit/offset, not page)
$orgs = TurboPartner::listOrganizations(new ListOrganizationsRequest(limit: 20, offset: 0, search: 'acme'));
echo $orgs->totalRecords;
foreach ($orgs->results as $o) {
    echo "{$o->id} {$o->name}\n";
}

// Get details (includes features + tracking)
$details = TurboPartner::getOrganizationDetails('org-uuid');

// Update name
TurboPartner::updateOrganizationInfo('org-uuid', new UpdateOrganizationRequest(name: 'Acme Holdings'));

// Delete
TurboPartner::deleteOrganization('org-uuid');

// Update entitlements — features and tracking are separate keys
TurboPartner::updateOrganizationEntitlements('org-uuid', new UpdateEntitlementsRequest(
    features: ['maxUsers' => 100, 'hasTDAI' => true, 'hasSalesforce' => true],
    tracking: ['numUsers' => 12], // optional: seed usage counters
));
```

### Organization user management

```php
use TurboDocx\Types\Requests\Partner\ListOrgUsersRequest;
use TurboDocx\Types\Requests\Partner\AddOrgUserRequest;
use TurboDocx\Types\Requests\Partner\UpdateOrgUserRequest;
use TurboDocx\Types\Enums\OrgUserRole;

// List
$users = TurboPartner::listOrganizationUsers('org-uuid', new ListOrgUsersRequest(limit: 25, offset: 0));

// Invite — ORG role enum (OrgUserRole): ADMIN | CONTRIBUTOR | USER | VIEWER
// There is no MEMBER here — 'member' is a PARTNER-portal role and is rejected with a 400.
TurboPartner::addUserToOrganization('org-uuid', new AddOrgUserRequest(
    email: 'newhire@acme.com',
    role: OrgUserRole::CONTRIBUTOR,
));

// Update role
TurboPartner::updateOrganizationUserRole('org-uuid', 'user-uuid', new UpdateOrgUserRequest(role: OrgUserRole::ADMIN));

// Remove
TurboPartner::removeUserFromOrganization('org-uuid', 'user-uuid');

// Resend invitation email
TurboPartner::resendOrganizationInvitationToUser('org-uuid', 'user-uuid');
```

### Organization API key management

```php
use TurboDocx\Types\Requests\Partner\ListOrgApiKeysRequest;
use TurboDocx\Types\Requests\Partner\CreateOrgApiKeyRequest;
use TurboDocx\Types\Requests\Partner\UpdateOrgApiKeyRequest;

// List
$keys = TurboPartner::listOrganizationApiKeys('org-uuid', new ListOrgApiKeysRequest(limit: 10));

// Create — the full key value is returned ONLY on creation, store it immediately
// Org API keys use the ORG role enum: 'admin' | 'contributor' | 'user' | 'viewer'
$created = TurboPartner::createOrganizationApiKey('org-uuid', new CreateOrgApiKeyRequest(
    name: 'Production Key',
    role: 'admin',
));
echo $created->data->key; // capture this once, it won't be shown again

// Update (rename or change role)
TurboPartner::updateOrganizationApiKey('org-uuid', 'key-uuid', new UpdateOrgApiKeyRequest(name: 'Renamed'));

// Revoke
TurboPartner::revokeOrganizationApiKey('org-uuid', 'key-uuid');
```

### Partner API key management

```php
use TurboDocx\Types\Requests\Partner\ListPartnerApiKeysRequest;
use TurboDocx\Types\Requests\Partner\CreatePartnerApiKeyRequest;
use TurboDocx\Types\Requests\Partner\UpdatePartnerApiKeyRequest;
use TurboDocx\Types\Enums\PartnerScope;

// List
$keys = TurboPartner::listPartnerApiKeys(new ListPartnerApiKeysRequest(limit: 10));

// Create with scopes — full key returned only on creation
$created = TurboPartner::createPartnerApiKey(new CreatePartnerApiKeyRequest(
    name: 'CI/CD Key',
    scopes: [PartnerScope::ORG_CREATE, PartnerScope::ORG_READ, PartnerScope::ENTITLEMENTS_UPDATE],
    description: 'Used by GitHub Actions',
));
echo $created->data->key; // store this immediately

// Update name / scopes
TurboPartner::updatePartnerApiKey('key-uuid', new UpdatePartnerApiKeyRequest(
    name: 'CI/CD Key (extended)',
    scopes: [PartnerScope::ORG_CREATE, PartnerScope::ORG_READ, PartnerScope::ORG_UPDATE, PartnerScope::ENTITLEMENTS_UPDATE],
));

// Revoke
TurboPartner::revokePartnerApiKey('key-uuid');
```

Available scopes cover `org:*`, `entitlements:update`, `org-users:*`, `partner-users:*`, `org-apikeys:*`, `partner-apikeys:*`, and `audit:read`.

### Partner-portal user management

```php
use TurboDocx\Types\Requests\Partner\ListPartnerUsersRequest;
use TurboDocx\Types\Requests\Partner\AddPartnerUserRequest;
use TurboDocx\Types\Requests\Partner\UpdatePartnerUserRequest;
use TurboDocx\Types\Partner\PartnerPermissions;

// List
$users = TurboPartner::listPartnerPortalUsers(new ListPartnerUsersRequest(limit: 25));

// Add — PARTNER role enum: 'admin' | 'member' | 'viewer'
// ('contributor' / 'user' are ORG roles and are rejected here with a 400.)
// All SEVEN permission flags are required — set every one explicitly.
TurboPartner::addUserToPartnerPortal(new AddPartnerUserRequest(
    email: 'admin@partner.com',
    role: 'admin',
    permissions: new PartnerPermissions(
        canManageOrgs: true,
        canManageOrgUsers: true,
        canManagePartnerUsers: false,
        canManageOrgAPIKeys: true,
        canManagePartnerAPIKeys: false,
        canUpdateEntitlements: true,
        canViewAuditLogs: true,
    ),
));

// Update — `permissions` is optional, but there is NO partial update: if you pass it,
// the backend requires ALL SEVEN keys. Every PartnerPermissions constructor arg defaults
// to `false`, so naming only two of them still sends all 7 — with the other five as
// `false`, silently REVOKING those permissions. Rebuild from the user's current
// permissions and override only what changes.
$users   = TurboPartner::listPartnerPortalUsers(new ListPartnerUsersRequest(limit: 100));
$user    = current(array_filter($users->results, fn ($u) => $u->id === 'user-uuid'));
$current = $user->permissions;   // all 7 flags, straight from the server

TurboPartner::updatePartnerUserPermissions('user-uuid', new UpdatePartnerUserRequest(
    role: 'member',
    permissions: new PartnerPermissions(
        canManageOrgs: true,   // the two we are changing
        canManageOrgUsers: true,
        canManagePartnerUsers: $current->canManagePartnerUsers,   // the rest, preserved
        canManageOrgAPIKeys: $current->canManageOrgAPIKeys,
        canManagePartnerAPIKeys: $current->canManagePartnerAPIKeys,
        canUpdateEntitlements: $current->canUpdateEntitlements,
        canViewAuditLogs: $current->canViewAuditLogs,
    ),
));

// To change ONLY the role, omit `permissions` entirely:
TurboPartner::updatePartnerUserPermissions('user-uuid', new UpdatePartnerUserRequest(role: 'viewer'));

// Remove
TurboPartner::removeUserFromPartnerPortal('user-uuid');

// Resend invitation
TurboPartner::resendPartnerPortalInvitationToUser('user-uuid');
```

### Audit logs

```php
use TurboDocx\Types\Requests\Partner\ListAuditLogsRequest;

$logs = TurboPartner::getPartnerAuditLogs(new ListAuditLogsRequest(
    action: 'org.created',
    resourceType: 'organization',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    success: true,
    limit: 100,
    offset: 0,
));

echo $logs->totalRecords;
foreach ($logs->results as $entry) {
    echo "{$entry->createdOn} {$entry->action} {$entry->resourceId}\n";
}
```

## TurboWebhooks Configuration

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to TurboSign document events. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

```php
use TurboDocx\TurboWebhooks;
use TurboDocx\Config\HttpClientConfig;

TurboWebhooks::configure(new HttpClientConfig(
    apiKey: $_ENV['TURBODOCX_API_KEY'],   // admin TDX- key
    orgId: $_ENV['TURBODOCX_ORG_ID'],
    skipSenderValidation: true,           // webhooks don't send email
));
```

The webhook routes require the organization administrator role. A non-admin TDX- key will return `AuthorizationException` (HTTP 403).

## TurboWebhooks Events

TurboSign dispatches **7** events. All of them are live — subscribe to whichever your integration needs.

| Event (wire string) | Fires when |
|---|---|
| `signature.document.sent` | The document is dispatched to recipients |
| `signature.document.viewed` | A recipient opens the document for the first time |
| `signature.document.recipient_signed` | An individual signer completes their signature — fires **once per signer** |
| `signature.document.signed` | A signer signs but the document is **not yet complete** (document-level partial progress) |
| `signature.document.completed` | All recipients have signed and the signed PDF is finalized |
| `signature.document.finalization_failed` | The signed PDF fails to finalize (e.g. KMS signing error); the document is **not** completed |
| `signature.document.voided` | The document is voided or cancelled |

The SDK exposes these as a native PHP 8.1 backed enum, `TurboDocx\Types\Enums\WebhookEvent`. Read the wire string off a case with `->value` (`WebhookEvent::COMPLETED->value === 'signature.document.completed'`); `WebhookEvent::all()` returns all 7 **wire strings** ready to pass straight as `events:`, and `WebhookEvent::values()` is an alias of it. Use the native `WebhookEvent::cases()` if you want the enum cases themselves. The literal wire strings above are what actually travel in the `eventType` field of the delivered payload, and they are always accepted by `createWebhook()`/`updateWebhook()`. `getWebhook()` also returns an `availableEvents` array — the backend advertises the live catalog at runtime.

### Lifecycle: `recipient_signed` vs `signed` vs `completed`

This is the part integrations get wrong. On **every** signature, `recipient_signed` fires first. Then exactly one of `signed`, `completed`, or `finalization_failed` follows:

```
Recipient signs
   │
   ├─ signature.document.recipient_signed   (always — one per signer)
   │
   └─ more signers remaining?
        ├─ yes → signature.document.signed                 (partial progress)
        └─ no  → signature.document.completed              (finalized OK)
                 or signature.document.finalization_failed (finalization failed)
```

- **`recipient_signed`** is the **per-person** event. It fires once for every signer, *including the last one*, and carries the signer's identity plus `is_final_signer` (true only on the last signature) and `remaining_signers`.
- **`signed`** is a **document-level partial-progress** event. It fires **only when a signer signs and the document is NOT yet complete**.
- **`signed` never fires on the final signature.** To detect "the whole document is done", use `completed` (or `recipient_signed` with `is_final_signer: true`) — **never** `signed`.
- **A single-signer document never emits `signed` at all.** It emits `recipient_signed` (`is_final_signer: true`) and then `completed`.

## TurboWebhooks Usage

### createWebhook

```php
$created = TurboWebhooks::createWebhook(
    urls: ['https://your-server.example.com/webhooks/turbodocx'],  // 1-10, HTTPS only
    events: [                                                       // at least 1
        'signature.document.sent',
        'signature.document.viewed',
        'signature.document.recipient_signed',    // once per signer; carries is_final_signer
        'signature.document.completed',           // the ONLY reliable "document is done" signal
        'signature.document.finalization_failed',
        'signature.document.voided',
        // 'signature.document.signed',           // add only if you want partial-progress pings;
        //                                        // it never fires on the final signature
    ],
);

// Returned secret is shown ONCE — store it server-side immediately.
$webhookId = $created['id'];
$secret    = $created['secret'];
```

`urls` must contain **1–10** HTTPS URLs; `events` must contain **at least 1** event. Throws `ConflictException` (409) if the signature webhook already exists for the org. Throws `ValidationException` (400) for non-HTTPS URLs, an empty/oversized `urls` array, or an empty `events` array.

### getWebhook

```php
$webhook = TurboWebhooks::getWebhook();
// $webhook['urls'], $webhook['events'], $webhook['isActive']
// $webhook['deliveryStats']['totalDeliveries'], ['successfulDeliveries'], ...
```

### updateWebhook

```php
TurboWebhooks::updateWebhook(
    urls: ['https://your-server.example.com/webhooks/turbodocx'],  // 1-10 HTTPS URLs
    events: ['signature.document.completed'],                      // at least 1
    isActive: true,
);

// To pause deliveries without touching the routing, omit urls/events entirely:
TurboWebhooks::updateWebhook(isActive: false);
```

The arguments are optional, but **optional does not mean "may be empty"**: if you pass `urls` it still has to hold 1–10 URLs, and if you pass `events` it still has to hold at least 1. Passing `urls: []` or `events: []` throws `ValidationException` (400) — omit the argument instead.

All three parameters are optional — pass only what you want to change.

### deleteWebhook

```php
TurboWebhooks::deleteWebhook();  // soft-delete + delivery history wiped
```

### testWebhook

```php
$result = TurboWebhooks::testWebhook(
    eventType: 'signature.document.completed',
    payload: ['documentId' => '...', 'documentName' => '...'],
);
// $result['summary']: { total, successful, failed, errors: string[] }
// $result['deliveries']: WebhookDelivery[]
```

Per-URL failure messages live in `summary.errors`. Use this from a CI smoke test before flipping a new receiver into production.

### regenerateWebhookSecret

```php
$rotated = TurboWebhooks::regenerateWebhookSecret();
// $rotated['secret'] — shown ONCE; old signatures fail immediately after rotation
```

### listWebhookDeliveries

```php
$page = TurboWebhooks::listWebhookDeliveries(
    limit: 20,
    offset: 0,
    eventType: 'signature.document.completed',
    isDelivered: false,
    httpStatus: 500,
);
// $page['results']: WebhookDelivery[]; $page['totalRecords']
```

### replayWebhookDelivery

```php
$newDelivery = TurboWebhooks::replayWebhookDelivery($deliveryId);
// Full WebhookDelivery row returned — id, httpStatus, attemptCount, etc.
```

### getWebhookStats

```php
$stats = TurboWebhooks::getWebhookStats(days: 30);
// $stats['summary']['successRate'], ['avgResponseTime'], etc.
// $stats['eventBreakdown']: per-event totals
```

### Verifying inbound webhook signatures

When TurboDocx POSTs to your receiver, verify the `X-TurboDocx-Signature` header before trusting the payload. The helper enforces a 5-minute timestamp tolerance and uses constant-time comparison.

```php
use function TurboDocx\Utils\verifyWebhookSignature;

// In your webhook receiver (Laravel, Symfony, plain PHP, etc.)
$rawBody         = file_get_contents('php://input');               // raw bytes — do NOT json_decode first
$signatureHeader = $_SERVER['HTTP_X_TURBODOCX_SIGNATURE'] ?? '';
$timestampHeader = $_SERVER['HTTP_X_TURBODOCX_TIMESTAMP'] ?? '';
$secret          = $_ENV['TURBODOCX_WEBHOOK_SECRET'];              // the secret you saved from createWebhook

if (!verifyWebhookSignature($rawBody, $signatureHeader, $timestampHeader, $secret)) {
    http_response_code(401);
    exit;
}

$event = json_decode($rawBody, true);
// process $event['eventType'], $event['data'], ...
```

**Canonical end-to-end PHP example:** [`packages/php-sdk/examples/turbowebhooks-crud.php`](https://github.com/TurboDocx/SDK/blob/main/packages/php-sdk/examples/turbowebhooks-crud.php) walks through create → conflict → get → update → test-fire → rotate → list → replay → delete + every error branch.

### TurboWebhooks error handling

```php
use TurboDocx\Exceptions\TurboDocxException;
use TurboDocx\Exceptions\AuthenticationException;
use TurboDocx\Exceptions\AuthorizationException;
use TurboDocx\Exceptions\ValidationException;
use TurboDocx\Exceptions\ConflictException;
use TurboDocx\Exceptions\NotFoundException;
use TurboDocx\Exceptions\RateLimitException;
use TurboDocx\Exceptions\NetworkException;

try {
    TurboWebhooks::createWebhook(urls: $urls, events: $events);
} catch (ConflictException $e) {
    // 409 — signature webhook already exists for this org. Update or delete it.
} catch (ValidationException $e) {
    // 400 — typically a non-HTTPS URL or empty events array.
} catch (AuthorizationException $e) {
    // 403 — TDX- key lacks the administrator role.
} catch (AuthenticationException $e) {
    // 401 — bad / revoked API key.
} catch (NotFoundException $e) {
    // 404 — read/update/delete against a webhook that does not exist.
} catch (RateLimitException $e) {
    // 429 — back off and retry.
} catch (NetworkException $e) {
    // No status — the request never reached the server.
} catch (TurboDocxException $e) {
    // Any other typed SDK error (e.g. raw 5xx).
}
```

## TurboQuote Configuration

TurboQuote manages the full quoting lifecycle: companies, contacts, products, bundles, price books, and quotes — all the way through sending to a customer and downloading the PDF.

```php
use TurboDocx\TurboQuote;
use TurboDocx\Config\QuoteClientConfig;

TurboQuote::configure(new QuoteClientConfig(
    apiKey: $_ENV['TURBODOCX_API_KEY'],   // admin TDX- key
    orgId: $_ENV['TURBODOCX_ORG_ID'],     // strongly recommended; backend 401s without it
    // baseUrl: 'https://api.turbodocx.com', // optional
));

// Or auto-configure from environment
TurboQuote::configure(QuoteClientConfig::fromEnvironment());
```

Unlike `TurboSign`, `TurboQuote` does **NOT** take `senderEmail` or `senderName` — but sending a quote *does* create a signature request and email the recipient. The sender comes from your **organization's quote template** (Quote Settings) instead; configure a sender email there, or quote create/duplicate/send is rejected with `400 SenderEmailRequired`. `orgId` is technically optional in the config object but the backend will return 401 if it is missing, so treat it as required.

## TurboQuote Usage

### createQuote

```php
use TurboDocx\Types\Requests\Quote\CreateQuoteRequest;

$quote = TurboQuote::createQuote(new CreateQuoteRequest(
    name: 'Enterprise License Q3',
    companyId: $company->id,
    contactId: $contact->id,
    currency: 'USD',
    termDays: 365,   // optional; DEFAULT IS 60. Max 3650 (10 years). -1 = auto-renewal.
));

echo "Quote ID: {$quote->id}\n";
echo "Status: {$quote->status}\n";
```

**`termDays` / `renewalPeriod`** — `termDays` defaults to **60** when omitted, and may be any integer up to **3650**, or the sentinel **`-1`** meaning auto-renewal. The two fields are coupled:

- `termDays: -1` → `renewalPeriod` is **required** (`'weekly' | 'monthly' | 'quarterly' | 'annually'`).
- any other `termDays` → `renewalPeriod` must be **absent or `null`**; sending it is a 400.

```php
// Auto-renewing quote — renewalPeriod is mandatory
TurboQuote::createQuote(new CreateQuoteRequest(
    name: 'Managed Services - auto-renew',
    companyId: $company->id,
    contactId: $contact->id,
    termDays: -1,
    renewalPeriod: 'monthly',
));

// Fixed-term quote — do NOT pass renewalPeriod
TurboQuote::createQuote(new CreateQuoteRequest(
    name: 'Fixed 90-day engagement',
    companyId: $company->id,
    contactId: $contact->id,
    termDays: 90,
));
```

### addLineItems

**Four fields are required on every line item**: `productId` (the argument must be PASSED — its value may be `null` for a custom, non-catalog item), `productName`, `unitPrice`, and `billingFrequency`. Omitting any of them is a 400. `quantity` defaults to `1`. The array must hold between **1 and 50** items.

```php
use TurboDocx\Types\Requests\Quote\AddLineItemRequest;

TurboQuote::addLineItems($quote->id, [
    new AddLineItemRequest(
        productId: $product->id,          // REQUIRED; null for a custom item
        productName: 'Platform Subscription',  // REQUIRED
        unitPrice: 499.00,                // REQUIRED
        billingFrequency: 'monthly',      // REQUIRED
        quantity: 1,                      // optional, defaults to 1
    ),
    new AddLineItemRequest(
        productId: null,                  // custom, non-catalog item — still passed, as null
        productName: 'Professional Services',
        unitPrice: 2500.00,
        billingFrequency: 'one-time',
        quantity: 5,
        discountType: 'percent',
        discountPercent: 10,
    ),
]);
// Returns LineItem[] — the resulting items array
```

### addBundleLineItems

Attaching a bundle to a quote needs only `bundleId` and `bundleName` — the server expands the bundle's child products itself, so you never send them. Single object or an array of 1–50.

```php
use TurboDocx\Types\Requests\Quote\AddBundleLineItemRequest;

TurboQuote::addBundleLineItems($quote->id, [
    new AddBundleLineItemRequest(
        bundleId: $bundle->id,        // REQUIRED
        bundleName: 'Starter Pack',   // REQUIRED
        quantity: 2,
    ),
]);
```

### sendQuote

```php
use TurboDocx\Types\Requests\Quote\SendQuoteRequest;

$result = TurboQuote::sendQuote($quote->id, new SendQuoteRequest(
    validUntil: date('Y-m-d', strtotime('+30 days')),
));

echo "Status: {$result->quote->status}\n";   // 'sent'
echo "Message: {$result->message}\n";
```

Sending a quote **does** create a signature request and email the contact. The send is gated by a set
of preconditions, each of which fails with `ValidationException` (400) carrying a specific
`$e->errorCode`:

| `errorCode` | Meaning |
|---|---|
| `QuoteNotSendable` | The quote's status does not allow sending |
| `QuoteValidUntilRequired` | No `validUntil` on the quote and none passed in `SendQuoteRequest` |
| `QuoteExpired` | `validUntil` is already in the past |
| `QuoteHasNoLineItems` | The quote has no line items |
| `QuoteContactRequired` | The quote has no contact to send to |
| `QuoteCustomerInactive` | The customer/company is inactive |
| `SenderEmailRequired` | The org's quote template (Quote Settings) has no sender email |

### handleExpiredQuote

Act on a sent quote whose `validUntil` has passed. **`action` accepts exactly two values: `'void'` and `'decline'`.** There is no `'extend'` and no `'resend'` — those are not implemented and return a 400. `reason` (max 190 chars) and `newValidUntil` (ISO date) are **both required**.

The endpoint voids/declines the original quote and creates a duplicate carrying the new `validUntil` date — that duplicate is how you "extend" an expired quote.

```php
use TurboDocx\Types\Requests\Quote\HandleExpiredQuoteRequest;

$result = TurboQuote::handleExpiredQuote($quote->id, new HandleExpiredQuoteRequest(
    action: 'void',                      // 'void' | 'decline' — nothing else
    reason: 'Pricing refreshed for Q4',  // REQUIRED, max 190 chars
    newValidUntil: '2026-12-31',         // REQUIRED, ISO date — carried by the new duplicate
));
```

### downloadQuotePdf

```php
$pdfBytes = TurboQuote::downloadQuotePdf($quote->id);
file_put_contents('quote.pdf', $pdfBytes);
```

Returns raw bytes — write them directly with `file_put_contents` or stream as a response.

### Quote templates (auto-provisioned — get, then update)

Quote templates are **provisioned for you**. `GET /v1/quote-template` self-heals: if the org has no template it creates one from the org's branding and returns it. Consequences:

- **Never call `createTemplate()` on an established org** — a template already exists, so it throws `ValidationException` (400 `TEMPLATE_ALREADY_EXISTS`). The method is effectively unreachable. Do not write get-then-create-if-missing logic.
- **`deleteTemplate()` is really "reset to org branding defaults"** — it soft-deletes, and the very next `getTemplate()` regenerates one.

The correct flow is always **`getTemplate()` → `updateTemplate()`**:

```php
use TurboDocx\Types\Requests\Quote\UpdateQuoteTemplateRequest;

$template = TurboQuote::getTemplate();   // always returns one; creates it if needed
TurboQuote::updateTemplate($template->id, new UpdateQuoteTemplateRequest(
    primaryColor: '#0B5FFF',
    closingMessage: 'Thanks for your business!',
));
```

### Products and bundles (catalog)

```php
use TurboDocx\Types\Requests\Quote\CreateProductRequest;
use TurboDocx\Types\Requests\Quote\CreateBundleRequest;
use TurboDocx\Types\Requests\Quote\CreatePriceBookRequest;

// Create a catalog product.
// name, listPrice, billingFrequency and categoryId are all REQUIRED.
// categoryId is a real UUID — from a createType with categoryType 'product_category'.
$product = TurboQuote::createProduct(new CreateProductRequest(
    name: 'Annual SaaS License',
    listPrice: 999.00,
    billingFrequency: 'annual',
    categoryId: 'category-uuid',
    showInCatalog: true,
    // images: [...],  // optional — MAX 5 images per product, MAX 2 MB each
));

// Create a bundle. Each catalog bundle item requires productId, unitPrice and
// billingFrequency (quantity defaults to 1). Note this is a DIFFERENT shape from a
// quote line item — there is no productName here, and unknown keys are rejected.
$bundle = TurboQuote::createBundle(new CreateBundleRequest(
    name: 'Starter Pack',
    categoryId: 'category-uuid',
    items: [
        [
            'productId' => $product->id,
            'unitPrice' => 999.00,
            'billingFrequency' => 'annual',
            'quantity' => 1,
        ],
    ],
));

// Create a price book and apply it to a quote.
// priceBookTypeId comes from a createType with categoryType 'pricebook_type';
// name, priceBookTypeId, validFrom, and discountPercent are all required.
$priceBook = TurboQuote::createPriceBook(new CreatePriceBookRequest(
    name: 'Partner Tier A',
    priceBookTypeId: 'pricebook-type-uuid',
    validFrom: '2026-01-01',
    discountPercent: 15.0,
));

TurboQuote::applyPriceBook($quote->id, $priceBook->id);
// Returns ApplyPriceBookResponse: { quote, message, updatedCount, skippedCount }
```

### getQuoteNumberConfig

Admin-only. Reads the org's quote-number configuration — the format used to generate new quote numbers (prefix, year/month tokens, separator, zero-padding, suffix, starting number, reset cadence).

```php
$config = TurboQuote::getQuoteNumberConfig();

echo "Prefix: {$config->format->prefix}\n";
echo "Current floor: {$config->currentFloor}\n";   // lowest start number you can set this period
```

Response: a `QuoteNumberConfig` — `{ format, currentFloor }`. `format` is a `QuoteNumberFormat` (`prefix`, `yearToken`, `monthToken`, `separator`, `padWidth`, `suffix`, `startNumber`, `resetCadence`); `currentFloor` is the per-period issued floor (a new `startNumber` can't be set below it).

### updateQuoteNumberConfig

Admin-only. Updates the org's quote-number format. Pass the full format (all eight fields). Request-body keys stay camelCase verbatim.

```php
use TurboDocx\Types\Quote\QuoteNumberFormat;

// e.g. INV0001000 — no year/month tokens, 4-digit zero-padding, starting at 1000, never resets
$config = TurboQuote::updateQuoteNumberConfig(new QuoteNumberFormat(
    prefix: 'INV',
    yearToken: 'none',     // 'none' | 'two' | 'four'
    monthToken: 'off',     // 'off' | 'two'
    separator: '',
    padWidth: 4,           // int 0-12
    suffix: '',
    startNumber: 1000,     // int >= 0 (must be >= currentFloor)
    resetCadence: 'never', // 'never' | 'yearly' | 'monthly'
));

echo "New prefix: {$config->format->prefix}\n";
echo "Current floor: {$config->currentFloor}\n";
```

Response: the updated `QuoteNumberConfig` — same `{ format, currentFloor }` shape as `getQuoteNumberConfig`.

### Bulk create (CSV-style imports)

Six catalog resources support bulk creation from an array of typed request rows (e.g. a parsed CSV): `bulkCreateProducts`, `bulkCreatePriceBooks`, `bulkCreateBundles`, `bulkCreateCompanies`, `bulkCreateContacts`, and `bulkCreateTypes`. Each takes an array of the same request objects the matching single `create*` call uses; the SDK wraps them in the `{ "rows": [...] }` envelope the `POST {resource}/bulk` endpoint expects. Each returns a `BulkImportResult`.

Every product row requires `name`, `categoryId`, `listPrice`, and `billingFrequency`. **`categoryId` must be a real category UUID** — there is no `categoryName` convenience field on the bulk row, and because the backend rejects unknown keys a `categoryName` would 400 the row. Resolve (or create) the category first and pass its UUID:

```php
use TurboDocx\Types\Requests\Quote\CreateProductRequest;
use TurboDocx\Types\Requests\Quote\CreateQuoteTypeRequest;
use TurboDocx\Types\Requests\Quote\ListTypesRequest;

// 1. Resolve the category UUID once — create it if it doesn't exist yet.
$types    = TurboQuote::listTypes(new ListTypesRequest(limit: 100));
$category = current(array_filter(
    $types->results,
    fn ($t) => $t->name === 'Subscriptions' && $t->categoryType === 'product_category',
)) ?: TurboQuote::createType(new CreateQuoteTypeRequest(
    name: 'Subscriptions',
    categoryType: 'product_category',
));

// 2. Reference it by UUID on every row.
$result = TurboQuote::bulkCreateProducts([
    new CreateProductRequest(
        name: 'Basic Plan',
        listPrice: 10.00,
        billingFrequency: 'monthly',
        categoryId: $category->id,
    ),
    new CreateProductRequest(
        name: 'Premium Plan',
        listPrice: 100.00,
        billingFrequency: 'monthly',
        categoryId: $category->id,
    ),
]);

echo "Imported: {$result->imported}\n";

// Partial success: inspect failed rows instead of assuming all-or-nothing
foreach ($result->failed as $issue) {
    echo "Row {$issue->row} failed: {$issue->reason}\n";     // row is 1-indexed
}
foreach ($result->adjusted as $issue) {
    echo "Row {$issue->row} adjusted: {$issue->reason}\n";   // imported with a server-side tweak
}
```

Response: a `BulkImportResult` with `int $imported`, `BulkImportRowIssue[] $failed`, and `BulkImportRowIssue[] $adjusted`; each `BulkImportRowIssue` exposes `int $row` (1-indexed) and `string $reason`.

Bulk-create semantics:

- **Partial success** — a failed row does **not** throw and does **not** roll back the rows before it. It is reported in `$result->failed` with a 1-indexed `row` and a `reason`. Rows the server tweaked (e.g. an unknown bundle item dropped) appear in `$result->adjusted`. Always read `$result->failed` rather than assuming every row imported.
- **500-row cap per request** — more than 500 rows throws `ValidationException` (400). The SDK does not validate the rows or the cap client-side.
- **Roles** — available to administrator and contributor API keys.

### TurboQuote error handling

```php
use TurboDocx\Exceptions\TurboDocxException;
use TurboDocx\Exceptions\AuthenticationException;
use TurboDocx\Exceptions\AuthorizationException;
use TurboDocx\Exceptions\ValidationException;
use TurboDocx\Exceptions\NotFoundException;
use TurboDocx\Exceptions\RateLimitException;
use TurboDocx\Exceptions\NetworkException;

try {
    TurboQuote::sendQuote($quoteId);
} catch (ValidationException $e) {
    // 400 — missing required field or invalid value (e.g., unknown currency)
} catch (AuthenticationException $e) {
    // 401 — bad/missing API key, or missing orgId
} catch (NotFoundException $e) {
    // 404 — quote, product, or price book not found
} catch (RateLimitException $e) {
    // 429 — back off and retry
} catch (NetworkException $e) {
    // No status — request never reached the server
} catch (TurboDocxException $e) {
    // Any other typed SDK error
}
```

## Laravel Integration Example

```php
// routes/api.php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SignatureController;

Route::prefix('signatures')->group(function () {
    Route::post('/send', [SignatureController::class, 'send']);
    Route::get('/{id}/status', [SignatureController::class, 'status']);
});
```

```php
// app/Http/Controllers/SignatureController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use TurboDocx\TurboSign;
use TurboDocx\Types\Recipient;
use TurboDocx\Types\Field;
use TurboDocx\Types\SignatureFieldType;
use TurboDocx\Types\TemplateConfig;
use TurboDocx\Types\FieldPlacement;
use TurboDocx\Types\Requests\SendSignatureRequest;
use TurboDocx\Exceptions\TurboDocxException;

class SignatureController extends Controller
{
    public function send(Request $request): JsonResponse
    {
        try {
            $file = $request->file('file');
            $recipients = json_decode($request->input('recipients'), true);
            $fields = json_decode($request->input('fields'), true);

            $result = TurboSign::sendSignature(
                new SendSignatureRequest(
                    file: $file->getContent(),
                    documentName: $request->input('document_name'),
                    recipients: array_map(
                        fn($r) => new Recipient($r['name'], $r['email'], $r['signingOrder'] ?? 1),
                        $recipients,
                    ),
                    fields: array_map(
                        fn($f) => new Field(
                            type: SignatureFieldType::from($f['type']),
                            recipientEmail: $f['recipientEmail'],
                            template: new TemplateConfig(
                                anchor: $f['template']['anchor'],
                                placement: FieldPlacement::from($f['template']['placement'] ?? 'replace'),
                                size: $f['template']['size'] ?? null,
                            ),
                        ),
                        $fields,
                    ),
                )
            );

            return response()->json($result);
        } catch (TurboDocxException $e) {
            return response()->json(
                ['error' => $e->getMessage(), 'code' => $e->errorCode],
                $e->statusCode ?? 500,
            );
        }
    }

    public function status(string $id): JsonResponse
    {
        try {
            $status = TurboSign::getStatus($id);
            return response()->json($status);
        } catch (TurboDocxException $e) {
            return response()->json(
                ['error' => $e->getMessage(), 'code' => $e->errorCode],
                $e->statusCode ?? 500,
            );
        }
    }
}
```

## Error Handling

All SDK exceptions live in `TurboDocx\Exceptions` and extend `TurboDocxException`. Each carries two
**public readonly properties** — `$e->statusCode` (`?int`) and `$e->errorCode` (`?string`) — plus the
standard `$e->getMessage()`. Do **not** use `getStatusCode()` / `getCode()`: they do not exist / are
always `0`.

```php
use TurboDocx\Exceptions\TurboDocxException;
use TurboDocx\Exceptions\AuthenticationException;
use TurboDocx\Exceptions\AuthorizationException;
use TurboDocx\Exceptions\ValidationException;
use TurboDocx\Exceptions\ConflictException;
use TurboDocx\Exceptions\NotFoundException;
use TurboDocx\Exceptions\RateLimitException;
use TurboDocx\Exceptions\NetworkException;

try {
    TurboSign::sendSignature($request);
} catch (ValidationException $e) {
    // 400 — bad request (e.g., missing senderEmail)
} catch (AuthenticationException $e) {
    // 401 — invalid/missing API key
} catch (AuthorizationException $e) {
    // 403 — key lacks the required role
} catch (NotFoundException $e) {
    // 404 — document/org not found
} catch (ConflictException $e) {
    // 409 — resource already exists
} catch (RateLimitException $e) {
    // 429 — too many requests
} catch (NetworkException $e) {
    // statusCode is null — the request never reached the server
} catch (TurboDocxException $e) {
    // Catch-all for any other SDK error (e.g. raw 5xx)
    echo "Error {$e->statusCode} {$e->errorCode}: {$e->getMessage()}\n";
}
```

`errorCode` is **always populated** on the typed subclasses: the API's code when one is present,
otherwise the class default — `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`, `AUTHORIZATION_ERROR`,
`NOT_FOUND`, `CONFLICT`, `RATE_LIMIT_EXCEEDED`, `NETWORK_ERROR`. So you can branch on
`$e->errorCode` without a null check:

```php
} catch (ValidationException $e) {
    if ($e->errorCode === 'SenderEmailRequired') {
        // configure a sender email on the org's quote template
    }
}
```

## Method Reference

| Method | Description |
|--------|-------------|
| `TurboSign::sendSignature($request)` | Send document for e-signature |
| `TurboSign::createSignatureReviewLink($request)` | Preview without emails |
| `TurboSign::getStatus($documentId)` | Get document status (returns `DocumentStatusResponse` — `status` only) |
| `TurboSign::download($documentId)` | Download signed PDF as string |
| `TurboSign::void($documentId, $reason)` | Cancel a signature request (reason required) |
| `TurboSign::resend($documentId, $recipientIds)` | Resend signature email to recipient UUIDs |
| `TurboSign::getAuditTrail($documentId)` | Get complete audit trail |
| `Deliverable::configure($config)` | Configure the deliverable client (no senderEmail needed) |
| `Deliverable::generateDeliverable($request)` | Render a template with variables into a new deliverable |
| `Deliverable::listDeliverables($options)` | Paginated list with search and tag filters |
| `Deliverable::getDeliverableDetails($id, $showTags)` | Get full record including variables and fonts |
| `Deliverable::updateDeliverableInfo($id, $request)` | Update name, description, or tags (tags replace) |
| `Deliverable::deleteDeliverable($id)` | Soft-delete (data retained, hidden from list) |
| `Deliverable::downloadSourceFile($id)` | Download original DOCX/PPTX as a byte string |
| `Deliverable::downloadPDF($id)` | Download rendered PDF as a byte string |
| `TurboPartner::configure($config)` | Set partner credentials (PartnerClientConfig) |
| `TurboPartner::createOrganization($request)` | Provision a new customer org |
| `TurboPartner::listOrganizations($request?)` | List managed orgs (uses limit/offset, not page) |
| `TurboPartner::getOrganizationDetails($orgId)` | Get org details including features + tracking |
| `TurboPartner::updateOrganizationInfo($orgId, $request)` | Rename an org |
| `TurboPartner::deleteOrganization($orgId)` | Delete an org |
| `TurboPartner::updateOrganizationEntitlements($orgId, $request)` | Update features and/or tracking |
| `TurboPartner::listOrganizationUsers($orgId, $request?)` | Paginated org-user list |
| `TurboPartner::addUserToOrganization($orgId, $request)` | Invite a user with an ORG role (`admin` \| `contributor` \| `user` \| `viewer`) |
| `TurboPartner::updateOrganizationUserRole($orgId, $userId, $request)` | Change a user's role |
| `TurboPartner::removeUserFromOrganization($orgId, $userId)` | Remove user from org |
| `TurboPartner::resendOrganizationInvitationToUser($orgId, $userId)` | Resend invite email |
| `TurboPartner::listOrganizationApiKeys($orgId, $request?)` | Paginated org API-key list |
| `TurboPartner::createOrganizationApiKey($orgId, $request)` | Create org key (value returned only on creation) |
| `TurboPartner::updateOrganizationApiKey($orgId, $keyId, $request)` | Rename or change role |
| `TurboPartner::revokeOrganizationApiKey($orgId, $keyId)` | Revoke org key |
| `TurboPartner::listPartnerApiKeys($request?)` | Paginated partner API-key list |
| `TurboPartner::createPartnerApiKey($request)` | Create partner key with scopes |
| `TurboPartner::updatePartnerApiKey($keyId, $request)` | Rename, edit scopes |
| `TurboPartner::revokePartnerApiKey($keyId)` | Revoke partner key |
| `TurboPartner::listPartnerPortalUsers($request?)` | Paginated partner-portal user list |
| `TurboPartner::addUserToPartnerPortal($request)` | Invite with a PARTNER role (`admin` \| `member` \| `viewer`) + all 7 permission flags |
| `TurboPartner::updatePartnerUserPermissions($userId, $request)` | Update role and/or permissions. `permissions` is optional, but if passed it must carry **all 7 flags** — there is no partial update |
| `TurboPartner::removeUserFromPartnerPortal($userId)` | Remove partner-portal user |
| `TurboPartner::resendPartnerPortalInvitationToUser($userId)` | Resend invite email |
| `TurboPartner::getPartnerAuditLogs($request?)` | Filter audit logs by action/resource/date/success |
| `TurboWebhooks::createWebhook($urls, $events)` | Subscribe the org to events. `urls`: 1–10 HTTPS URLs; `events`: at least 1. Requires an **administrator** API key |
| `TurboWebhooks::getWebhook()` | Get the org's signature webhook + delivery stats |
| `TurboWebhooks::updateWebhook(...)` | Patch URLs / events / isActive. Args are optional, but a supplied `urls`/`events` still has to be non-empty (`[]` is a 400) |
| `TurboWebhooks::deleteWebhook()` | Soft-delete the webhook |
| `TurboWebhooks::testWebhook($eventType, $payload)` | Fire a test delivery to all URLs |
| `TurboWebhooks::notifyWebhook($eventType, $payload)` | Manual notify; same handler as testWebhook |
| `TurboWebhooks::regenerateWebhookSecret()` | Rotate the HMAC secret (shown once) |
| `TurboWebhooks::listWebhookDeliveries(...)` | Page through delivery history with filters |
| `TurboWebhooks::replayWebhookDelivery($id)` | Manually retry a past delivery |
| `TurboWebhooks::getWebhookStats($days)` | Aggregate stats over a sliding window |
| `\TurboDocx\Utils\verifyWebhookSignature(...)` | Free function — verify inbound `X-TurboDocx-Signature` |
| **TurboQuote — Quotes** | |
| `TurboQuote::createQuote($request)` | Create a new quote |
| `TurboQuote::listQuotes($request?)` | List quotes with pagination, filters, and stats |
| `TurboQuote::getQuote($id)` | Get quote by ID (`statusInfo` merged in; `preparedBy` present on this call only) |
| `TurboQuote::updateQuote($id, $request)` | Update quote fields (PATCH — null-clears nullable fields) |
| `TurboQuote::deleteQuote($id)` | Delete a quote |
| `TurboQuote::duplicateQuote($id)` | Duplicate a quote |
| `TurboQuote::downloadQuotePdf($id)` | Download quote as raw PDF bytes |
| `TurboQuote::sendQuote($id, $request?)` | Send quote to the contact |
| `TurboQuote::sendQuoteWithDeliverable($id, $request)` | Send with a TurboDocx-generated document attached |
| `TurboQuote::declineQuote($id, $request)` | Mark a quote as declined |
| `TurboQuote::voidQuote($id, $request)` | Void a quote |
| `TurboQuote::handleExpiredQuote($id, $request)` | Void or decline an expired sent quote and re-issue it as a duplicate. `action` is `'void'` \| `'decline'` only; `reason` (max 190) and `newValidUntil` (ISO date) are both required |
| `TurboQuote::applyPriceBook($quoteId, $priceBookId)` | Apply a price book, repricing line items |
| `TurboQuote::removePriceBook($quoteId)` | Remove the applied price book |
| `TurboQuote::createAndSend($request)` | Create quote + add items + send in one call |
| **TurboQuote — Line Items** | |
| `TurboQuote::listLineItems($quoteId, $request?)` | List items on a quote |
| `TurboQuote::addLineItems($quoteId, $items)` | Add 1–50 product line items (single or array). `productId` (may be null), `productName`, `unitPrice`, `billingFrequency` all required |
| `TurboQuote::addBundleLineItems($quoteId, $items)` | Add 1–50 bundle line items; each needs only `bundleId` + `bundleName` (the server expands the children) |
| `TurboQuote::updateLineItem($quoteId, $itemId, $request)` | Update a line item |
| `TurboQuote::removeLineItem($quoteId, $itemId)` | Remove a line item |
| **TurboQuote — Products** | |
| `TurboQuote::listProducts($request?)` | List catalog products |
| `TurboQuote::createProduct($request)` | Create a product (supports image upload via multipart) |
| `TurboQuote::bulkCreateProducts($rows)` | Bulk-import products; each row needs `name`, `categoryId` (UUID), `listPrice`, `billingFrequency`. Returns a partial-success `BulkImportResult` |
| `TurboQuote::getProduct($id)` | Get product by ID |
| `TurboQuote::updateProduct($id, $request)` | Update a product |
| `TurboQuote::deleteProduct($id)` | Delete a product |
| `TurboQuote::duplicateProduct($id)` | Duplicate a product |
| `TurboQuote::getProductPrimaryImages($productIds)` | Batch-fetch primary images for product IDs |
| **TurboQuote — Price Books** | |
| `TurboQuote::listPriceBooks($request?)` | List price books |
| `TurboQuote::createPriceBook($request)` | Create a price book |
| `TurboQuote::bulkCreatePriceBooks($rows)` | Bulk-import price books; returns a partial-success `BulkImportResult` |
| `TurboQuote::getPriceBook($id)` | Get price book by ID |
| `TurboQuote::updatePriceBook($id, $request)` | Update a price book |
| `TurboQuote::deletePriceBook($id)` | Delete a price book |
| `TurboQuote::duplicatePriceBook($id)` | Duplicate a price book |
| `TurboQuote::listPriceBookProducts($id, $request?)` | List products with custom pricing in a price book |
| **TurboQuote — Bundles** | |
| `TurboQuote::listBundles($request?)` | List catalog bundles |
| `TurboQuote::createBundle($request)` | Create a bundle |
| `TurboQuote::bulkCreateBundles($rows)` | Bulk-import bundles; returns a partial-success `BulkImportResult` |
| `TurboQuote::getBundle($id)` | Get bundle by ID |
| `TurboQuote::updateBundle($id, $request)` | Update a bundle |
| `TurboQuote::deleteBundle($id)` | Delete a bundle |
| `TurboQuote::duplicateBundle($id)` | Duplicate a bundle |
| **TurboQuote — Companies** | |
| `TurboQuote::listCompanies($request?)` | List companies |
| `TurboQuote::createCompany($request)` | Create a company (requires at least one contact in `contacts`) |
| `TurboQuote::bulkCreateCompanies($rows)` | Bulk-import companies; returns a partial-success `BulkImportResult` |
| `TurboQuote::getCompany($id)` | Get company by ID |
| `TurboQuote::updateCompany($id, $request)` | Update a company |
| `TurboQuote::deleteCompany($id)` | Delete a company |
| `TurboQuote::listCompanyContacts($companyId, $request?)` | List contacts for a company |
| **TurboQuote — Contacts** | |
| `TurboQuote::listContacts($request?)` | List contacts |
| `TurboQuote::createContact($request)` | Create a contact |
| `TurboQuote::bulkCreateContacts($rows)` | Bulk-import contacts; returns a partial-success `BulkImportResult` |
| `TurboQuote::updateContact($id, $request)` | Update a contact |
| `TurboQuote::deleteContact($id)` | Delete a contact |
| **TurboQuote — Templates** | |
| `TurboQuote::listTemplates($request?)` | List quote templates |
| `TurboQuote::getTemplate()` | Get the org's active quote template (singleton endpoint). Self-heals: auto-creates one from org branding if none exists, so it always returns a template |
| `TurboQuote::getTemplateById($id)` | Get a template by ID |
| `TurboQuote::createTemplate($request)` | Effectively unreachable — the template is auto-provisioned, so this throws 400 `TEMPLATE_ALREADY_EXISTS` on any established org. Use `getTemplate()` → `updateTemplate()` |
| `TurboQuote::updateTemplate($id, $request)` | Update a quote template |
| `TurboQuote::deleteTemplate($id)` | Delete a quote template |
| **TurboQuote — Types** | |
| `TurboQuote::listTypes($request?)` | List quote types/categories |
| `TurboQuote::createType($request)` | Create a type/category |
| `TurboQuote::bulkCreateTypes($rows)` | Bulk-import types/categories; returns a partial-success `BulkImportResult` |
| `TurboQuote::updateType($id, $request)` | Update a type/category |
| `TurboQuote::deleteType($id)` | Delete a type/category |
| **TurboQuote — Quote Numbering** | |
| `TurboQuote::getQuoteNumberConfig()` | Get the org's quote-number config (admin only) |
| `TurboQuote::updateQuoteNumberConfig($format)` | Update the quote-number format (admin only) |

## Gotchas

- **PHP 8.1+ required** for named arguments and enum support
- **`senderEmail` is required** for TurboSign — configure globally or pass per-call; `HttpClientConfig` throws `ValidationException` without it. **`senderName` is optional** — when omitted the sender name resolves to **the API key's name** (not the org name), so name your keys recognisably.
- **All SDK exceptions are in `TurboDocx\Exceptions`** (`TurboDocxException` + `ValidationException`, `AuthenticationException`, `AuthorizationException`, `NotFoundException`, `ConflictException`, `RateLimitException`, `NetworkException`). Read the HTTP status off the **public readonly property** `$e->statusCode` and the code off `$e->errorCode` — there is no `getStatusCode()`, and `$e->getCode()` is always `0`.
- **PHP SDK uses static methods** — configure once, call on the class
- **Partner API keys are distinct** from regular API keys — using the wrong one returns `AuthenticationException`
- **Laravel config**: add TurboSign::configure() in a service provider's `boot()` method for clean initialization
- **No `signUrl` on send/review recipients.** `SendSignatureResponse::$recipients` and `CreateSignatureReviewLinkResponse::$recipients` are `?array` of **plain arrays** (`id`, `name`, `email`, `metadata`) — not `RecipientResponse` objects, and they carry no `signUrl`. Use `createSignatureReviewLink`'s top-level `previewUrl` for the document-level preview; the per-recipient `signUrl` property exists only on `RecipientResponse`, which these endpoints do not return.
- **`resend` takes recipient UUIDs** (array of strings), not email addresses — fetch them from the send/review response or `getAuditTrail`. Pass an empty array to resend to all pending recipients.
- **`download` is a two-step operation.** `GET /api/signature/:id/download` returns JSON `{"downloadUrl", "fileName"}` — not bytes — and the presigned `downloadUrl` must then be fetched **without an `Authorization` header** (S3 rejects a presigned request that also carries one). The SDK does both steps for you; hand-rolled REST calls must too.
- **Two different role enums — do not mix them.** Organization users and organization API keys take `OrgUserRole`: `admin` / `contributor` / `user` / `viewer`. Partner-portal users take `admin` / `member` / `viewer`. `member` is not a valid org role, and `contributor` / `user` are not valid partner roles — either mistake is a 400.
- **Partner `permissions` has no partial update.** The argument is optional on `UpdatePartnerUserRequest`, but every key inside the object is required by the backend, so a supplied `PartnerPermissions` must carry **all seven** flags: `canManageOrgs`, `canManageOrgUsers`, `canManagePartnerUsers`, `canManageOrgAPIKeys`, `canManagePartnerAPIKeys`, `canUpdateEntitlements`, `canViewAuditLogs`. Every constructor arg **defaults to `false`**, so naming only the ones you want to enable still sends all 7 and turns the rest off — **silently revoking those permissions**. Read the user's current permissions and carry them across; to update just the role, omit `permissions` entirely.
- **`updateOrganizationEntitlements` takes `features` and `tracking` — the two key sets are not interchangeable.** `features` holds capability/limit columns (`maxUsers`, `maxStorage`, `maxAPIKeys`, `hasTDAI`, …); `tracking` holds usage counters, which use the `num*` names: `numUsers`, `numProjectspaces`, `numTemplates`, `storageUsed`, `numGeneratedDeliverables`, `numSignaturesUsed`, `numQuotesSent`, `currentAICredits`. A `maxUsers` key inside `tracking` is rejected. `currentAICredits` accepts `-1` (unlimited); every other counter floors at 0.
- **TurboWebhooks is one-per-org** — every call hits the fixed `signature` webhook. Trying to create it twice returns `ConflictException` (409); update or delete the existing one instead.
- **TurboWebhooks requires admin** — the routes are gated by `requireOrgRole(administrator)`. A non-admin TDX- key throws `AuthorizationException` (403).
- **`createWebhook` URLs must be HTTPS** — non-HTTPS receivers return `ValidationException` (400). For local development, expose your receiver via an HTTPS tunnel (ngrok, cloudflared) and use the tunnel URL.
- **`urls` is 1–10, `events` is 1+ — on create AND on update.** Both args are optional on `updateWebhook`, but optional does not relax the minimum: passing `urls: []` or `events: []` throws `ValidationException` (400). To leave routing alone, omit the argument rather than passing an empty array.
- **Save the secret immediately** — `createWebhook` and `regenerateWebhookSecret` return the HMAC secret ONCE. There is no endpoint to retrieve it later. If you lose it, `regenerateWebhookSecret` mints a new one (and invalidates the old).
- **Signature verification** — never `json_decode` the request body before passing it to `verifyWebhookSignature()`. The HMAC is over the raw bytes; re-encoded JSON will not match.

- **TurboQuote decimal fields come back as numbers**, not strings — the response normalizer coerces `listPrice`, `unitPrice`, `discountPercent`, `subtotal`, `grandTotal`, `taxRate`, and related fields from the backend's string representation to PHP floats. Do not try to parse them yourself.
- **`TurboQuote` takes no `senderEmail`/`senderName`, but sending a quote still emails the recipient.** `sendQuote` creates a signature request; the sender identity comes from the **org's quote template** (Quote Settings). An API-key caller whose template has no sender email gets `400 SenderEmailRequired`. Other send preconditions each have their own 400 code: `QuoteNotSendable`, `QuoteValidUntilRequired`, `QuoteExpired`, `QuoteHasNoLineItems`, `QuoteContactRequired`, `QuoteCustomerInactive`.
- **`preparedBy` is only on the single-quote fetch.** `getQuote($id)` returns `$quote->preparedBy` (`['name' => ..., 'email' => ...]`); `listQuotes()` rows do not carry it.
- **PATCH null-clears nullable fields** — `updateQuote` (and other PATCH methods) include explicitly-set `null` values in the request body, which clears that field on the server. Only fields you actually pass are sent; fields you omit are left unchanged.
- **`discountType` is `'percent'` or `'amount'`** — use the string literals or `DiscountType::PERCENT->value` / `DiscountType::AMOUNT->value`; mixing them up silently falls back to the backend default.
- **Every product line item needs four fields: `productId`, `productName`, `unitPrice`, `billingFrequency`.** `productId` must be *passed*, but its value may be `null` — that is how you add a custom, non-catalog item. `quantity` defaults to 1.
- **Three distinct bundle shapes — don't conflate them.** `createBundle`'s `items` (catalog bundle contents) need `productId`, `unitPrice`, `billingFrequency` and nothing else — no `productName`, and unknown keys are rejected. `addBundleLineItems` (attaching a bundle to a quote) needs only `bundleId` + `bundleName`; the server expands the child products for you.
- **Line-item array limits: `addLineItems` and `addBundleLineItems` accept 1–50 items per call; reorder accepts up to 200.** Chunk larger imports.
- **`termDays` defaults to 60** (not 30), maxes out at 3650, and `-1` means auto-renewal. `renewalPeriod` (`'weekly' | 'monthly' | 'quarterly' | 'annually'`) is **required when `termDays` is -1** and must be absent/`null` for any other `termDays` — sending it otherwise is a 400.
- **`handleExpiredQuote` only accepts `action: 'void'` or `'decline'`.** `'extend'` and `'resend'` do not exist in the API and return a 400. `reason` (max 190 chars) and `newValidUntil` (ISO date) are both required; the endpoint voids/declines the original and issues a duplicate carrying the new date — that duplicate *is* the "extend".
- **Quote templates are auto-provisioned.** `getTemplate()` self-heals — it creates one from org branding when none exists — so `createTemplate()` on an established org throws 400 `TEMPLATE_ALREADY_EXISTS` and is effectively unreachable. Always do `getTemplate()` → `updateTemplate()`. `deleteTemplate()` is a reset-to-branding-defaults, not a permanent removal.
- **Product images: max 5 per product, 2 MB each.** Exceeding either returns 400 `MAX_IMAGES_EXCEEDED`.
- **Bulk creates are partial-success, not transactional.** `bulkCreateProducts`/`bulkCreatePriceBooks`/`bulkCreateBundles`/`bulkCreateCompanies`/`bulkCreateContacts`/`bulkCreateTypes` never throw on a bad row — read `$result->failed` (`BulkImportRowIssue[]` with 1-indexed `$row` + `$reason`) and `$result->adjusted`; earlier rows are not rolled back. Cap is 500 rows/request (over → `ValidationException` 400). Admin + contributor keys only.
- **Bulk product rows take `categoryId`, never `categoryName`.** The row schema is strict and rejects unknown keys, so a `categoryName` field 400s the row. Resolve or create the category with `listTypes()` / `createType()` first and pass its UUID. Required per row: `name`, `categoryId`, `listPrice`, `billingFrequency`.

**Full API reference:** https://docs.turbodocx.com/docs
