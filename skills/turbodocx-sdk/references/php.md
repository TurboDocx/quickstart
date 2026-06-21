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
use TurboDocx\TurboDocxError;
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
```

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
echo "Status: {$status->status}\n";

foreach ($status->recipients as $recipient) {
    echo "  {$recipient->email}: {$recipient->status}\n";
}
```

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
// Each recipient also has a signUrl for their personal signing link
foreach ($result->recipients as $recipient) {
    echo "  {$recipient->name}: {$recipient->signUrl}\n";
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

## TurboPartner Configuration

```php
use TurboDocx\TurboPartner;
use TurboDocx\Config\PartnerClientConfig;

TurboPartner::configure(new PartnerClientConfig(
    partnerApiKey: $_ENV['TURBODOCX_PARTNER_API_KEY'],
    partnerId: $_ENV['TURBODOCX_PARTNER_ID'],
));
```

## TurboPartner Usage

### createOrganization

```php
use TurboDocx\Types\Requests\Partner\CreateOrganizationRequest;

$result = TurboPartner::createOrganization(
    new CreateOrganizationRequest(
        name: 'Acme Corporation',
        features: ['maxUsers' => 50, 'hasTDAI' => true],
    )
);

echo "Organization ID: {$result->data->id}\n";
```

### listOrganizations

```php
$orgs = TurboPartner::listOrganizations(page: 1, limit: 20);

echo "Total: {$orgs->total}\n";
foreach ($orgs->data as $org) {
    echo "  {$org->name} ({$org->id})\n";
}
```

## TurboWebhooks Configuration

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to TurboDocx events such as `signature.document.completed` and `signature.document.voided`. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

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

## TurboWebhooks Usage

### createWebhook

```php
$created = TurboWebhooks::createWebhook(
    urls: ['https://your-server.example.com/webhooks/turbodocx'],  // must be HTTPS
    events: ['signature.document.completed', 'signature.document.voided'],
);

// Returned secret is shown ONCE — store it server-side immediately.
$webhookId = $created['id'];
$secret    = $created['secret'];
```

Throws `ConflictException` (409) if the signature webhook already exists for the org. Throws `ValidationException` (400) for non-HTTPS URLs.

### getWebhook

```php
$webhook = TurboWebhooks::getWebhook();
// $webhook['urls'], $webhook['events'], $webhook['isActive']
// $webhook['deliveryStats']['totalDeliveries'], ['successfulDeliveries'], ...
```

### updateWebhook

```php
TurboWebhooks::updateWebhook(
    urls: ['https://your-server.example.com/webhooks/turbodocx'],
    events: ['signature.document.completed'],
    isActive: true,
);
```

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

Unlike `TurboSign`, `TurboQuote` does **NOT** require `senderEmail` or `senderName` — quote routes never send signature emails. `orgId` is technically optional in the config object but the backend will return 401 if it is missing, so treat it as required.

## TurboQuote Usage

### createQuote

```php
use TurboDocx\Types\Requests\Quote\CreateQuoteRequest;

$quote = TurboQuote::createQuote(new CreateQuoteRequest(
    name: 'Enterprise License Q3',
    companyId: $company->id,
    contactId: $contact->id,
    currency: 'USD',
    termDays: 30,
));

echo "Quote ID: {$quote->id}\n";
echo "Status: {$quote->status}\n";
```

### addLineItems

```php
use TurboDocx\Types\Requests\Quote\AddLineItemRequest;

TurboQuote::addLineItems($quote->id, [
    new AddLineItemRequest(
        productId: null,
        productName: 'Platform Subscription',
        unitPrice: 499.00,
        billingFrequency: 'monthly',
        quantity: 1,
    ),
    new AddLineItemRequest(
        productId: null,
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

To add a bundle (a pre-grouped set of products) use `addBundleLineItems` with `AddBundleLineItemRequest`.

### sendQuote

```php
use TurboDocx\Types\Requests\Quote\SendQuoteRequest;

$result = TurboQuote::sendQuote($quote->id, new SendQuoteRequest(
    validUntil: date('Y-m-d', strtotime('+30 days')),
));

echo "Status: {$result->quote->status}\n";   // 'sent'
echo "Message: {$result->message}\n";
```

### downloadQuotePdf

```php
$pdfBytes = TurboQuote::downloadQuotePdf($quote->id);
file_put_contents('quote.pdf', $pdfBytes);
```

Returns raw bytes — write them directly with `file_put_contents` or stream as a response.

### Products and bundles (catalog)

```php
use TurboDocx\Types\Requests\Quote\CreateProductRequest;
use TurboDocx\Types\Requests\Quote\CreateBundleRequest;
use TurboDocx\Types\Requests\Quote\CreatePriceBookRequest;

// Create a catalog product
$product = TurboQuote::createProduct(new CreateProductRequest(
    name: 'Annual SaaS License',
    listPrice: 999.00,
    billingFrequency: 'annual',
    categoryId: 'category-uuid',
    showInCatalog: true,
));

// Create a bundle
$bundle = TurboQuote::createBundle(new CreateBundleRequest(
    name: 'Starter Pack',
    categoryId: 'category-uuid',
    items: [
        ['productId' => $product->id, 'quantity' => 1],
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
use TurboDocx\TurboDocxError;

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
        } catch (TurboDocxError $e) {
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode() ?: 500);
        }
    }

    public function status(string $id): JsonResponse
    {
        try {
            $status = TurboSign::getStatus($id);
            return response()->json($status);
        } catch (TurboDocxError $e) {
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode() ?: 500);
        }
    }
}
```

## Error Handling

```php
use TurboDocx\TurboDocxError;
use TurboDocx\Errors\AuthenticationError;
use TurboDocx\Errors\ValidationError;
use TurboDocx\Errors\NotFoundError;
use TurboDocx\Errors\RateLimitError;
use TurboDocx\Errors\NetworkError;

try {
    TurboSign::sendSignature($request);
} catch (AuthenticationError $e) {
    // Invalid/missing API key
} catch (ValidationError $e) {
    // Bad request (e.g., missing senderEmail)
} catch (NotFoundError $e) {
    // Document/org not found
} catch (RateLimitError $e) {
    // Too many requests
} catch (NetworkError $e) {
    // Connection failure
} catch (TurboDocxError $e) {
    // Catch-all for any SDK error
    echo "Error {$e->getCode()}: {$e->getMessage()}\n";
}
```

## Method Reference

| Method | Description |
|--------|-------------|
| `TurboSign::sendSignature($request)` | Send document for e-signature |
| `TurboSign::createSignatureReviewLink($request)` | Preview without emails |
| `TurboSign::getStatus($documentId)` | Get document + recipient status |
| `TurboSign::download($documentId)` | Download signed PDF as string |
| `TurboSign::void($documentId, $reason)` | Cancel a signature request (reason required) |
| `TurboSign::resend($documentId, $recipientIds)` | Resend signature email to recipient UUIDs |
| `TurboSign::getAuditTrail($documentId)` | Get complete audit trail |
| `TurboPartner::createOrganization($request)` | Provision a new customer org |
| `TurboPartner::listOrganizations(...)` | List managed organizations |
| `TurboPartner::getOrganization($orgId)` | Get org details |
| `TurboPartner::updateEntitlements($orgId, $features)` | Update org entitlements |
| `TurboWebhooks::createWebhook($urls, $events)` | Subscribe the org to events (HTTPS URLs only) |
| `TurboWebhooks::getWebhook()` | Get the org's signature webhook + delivery stats |
| `TurboWebhooks::updateWebhook(...)` | Patch URLs / events / isActive |
| `TurboWebhooks::deleteWebhook()` | Soft-delete the webhook |
| `TurboWebhooks::testWebhook($eventType, $payload)` | Fire a test delivery to all URLs |
| `TurboWebhooks::regenerateWebhookSecret()` | Rotate the HMAC secret (shown once) |
| `TurboWebhooks::listWebhookDeliveries(...)` | Page through delivery history with filters |
| `TurboWebhooks::replayWebhookDelivery($id)` | Manually retry a past delivery |
| `TurboWebhooks::getWebhookStats($days)` | Aggregate stats over a sliding window |
| `\TurboDocx\Utils\verifyWebhookSignature(...)` | Free function — verify inbound `X-TurboDocx-Signature` |
| **TurboQuote — Quotes** | |
| `TurboQuote::createQuote($request)` | Create a new quote |
| `TurboQuote::listQuotes($request?)` | List quotes with pagination, filters, and stats |
| `TurboQuote::getQuote($id)` | Get quote by ID (statusInfo merged in) |
| `TurboQuote::updateQuote($id, $request)` | Update quote fields (PATCH — null-clears nullable fields) |
| `TurboQuote::deleteQuote($id)` | Delete a quote |
| `TurboQuote::duplicateQuote($id)` | Duplicate a quote |
| `TurboQuote::downloadQuotePdf($id)` | Download quote as raw PDF bytes |
| `TurboQuote::sendQuote($id, $request?)` | Send quote to the contact |
| `TurboQuote::sendQuoteWithDeliverable($id, $request)` | Send with a TurboDocx-generated document attached |
| `TurboQuote::declineQuote($id, $request)` | Mark a quote as declined |
| `TurboQuote::voidQuote($id, $request)` | Void a quote |
| `TurboQuote::handleExpiredQuote($id, $request)` | Re-send or void an expired quote |
| `TurboQuote::applyPriceBook($quoteId, $priceBookId)` | Apply a price book, repricing line items |
| `TurboQuote::removePriceBook($quoteId)` | Remove the applied price book |
| `TurboQuote::createAndSend($request)` | Create quote + add items + send in one call |
| **TurboQuote — Line Items** | |
| `TurboQuote::listLineItems($quoteId, $request?)` | List items on a quote |
| `TurboQuote::addLineItems($quoteId, $items)` | Add one or more product line items (single or array) |
| `TurboQuote::addBundleLineItems($quoteId, $items)` | Add one or more bundle line items |
| `TurboQuote::updateLineItem($quoteId, $itemId, $request)` | Update a line item |
| `TurboQuote::removeLineItem($quoteId, $itemId)` | Remove a line item |
| **TurboQuote — Products** | |
| `TurboQuote::listProducts($request?)` | List catalog products |
| `TurboQuote::createProduct($request)` | Create a product (supports image upload via multipart) |
| `TurboQuote::getProduct($id)` | Get product by ID |
| `TurboQuote::updateProduct($id, $request)` | Update a product |
| `TurboQuote::deleteProduct($id)` | Delete a product |
| `TurboQuote::duplicateProduct($id)` | Duplicate a product |
| `TurboQuote::getProductPrimaryImages($productIds)` | Batch-fetch primary images for product IDs |
| **TurboQuote — Price Books** | |
| `TurboQuote::listPriceBooks($request?)` | List price books |
| `TurboQuote::createPriceBook($request)` | Create a price book |
| `TurboQuote::getPriceBook($id)` | Get price book by ID |
| `TurboQuote::updatePriceBook($id, $request)` | Update a price book |
| `TurboQuote::deletePriceBook($id)` | Delete a price book |
| `TurboQuote::duplicatePriceBook($id)` | Duplicate a price book |
| `TurboQuote::listPriceBookProducts($id, $request?)` | List products with custom pricing in a price book |
| **TurboQuote — Bundles** | |
| `TurboQuote::listBundles($request?)` | List catalog bundles |
| `TurboQuote::createBundle($request)` | Create a bundle |
| `TurboQuote::getBundle($id)` | Get bundle by ID |
| `TurboQuote::updateBundle($id, $request)` | Update a bundle |
| `TurboQuote::deleteBundle($id)` | Delete a bundle |
| `TurboQuote::duplicateBundle($id)` | Duplicate a bundle |
| **TurboQuote — Companies** | |
| `TurboQuote::listCompanies($request?)` | List companies |
| `TurboQuote::createCompany($request)` | Create a company (requires at least one contact in `contacts`) |
| `TurboQuote::getCompany($id)` | Get company by ID |
| `TurboQuote::updateCompany($id, $request)` | Update a company |
| `TurboQuote::deleteCompany($id)` | Delete a company |
| `TurboQuote::listCompanyContacts($companyId, $request?)` | List contacts for a company |
| **TurboQuote — Contacts** | |
| `TurboQuote::listContacts($request?)` | List contacts |
| `TurboQuote::createContact($request)` | Create a contact |
| `TurboQuote::updateContact($id, $request)` | Update a contact |
| `TurboQuote::deleteContact($id)` | Delete a contact |
| **TurboQuote — Templates** | |
| `TurboQuote::listTemplates($request?)` | List quote templates |
| `TurboQuote::getTemplate()` | Get the org's active quote template (singleton endpoint) |
| `TurboQuote::getTemplateById($id)` | Get a template by ID |
| `TurboQuote::createTemplate($request)` | Create a quote template |
| `TurboQuote::updateTemplate($id, $request)` | Update a quote template |
| `TurboQuote::deleteTemplate($id)` | Delete a quote template |
| **TurboQuote — Types** | |
| `TurboQuote::listTypes($request?)` | List quote types/categories |
| `TurboQuote::createType($request)` | Create a type/category |
| `TurboQuote::updateType($id, $request)` | Update a type/category |
| `TurboQuote::deleteType($id)` | Delete a type/category |
| **TurboQuote — Quote Numbering** | |
| `TurboQuote::getQuoteNumberConfig()` | Get the org's quote-number config (admin only) |
| `TurboQuote::updateQuoteNumberConfig($format)` | Update the quote-number format (admin only) |

## Gotchas

- **PHP 8.1+ required** for named arguments and enum support
- **`senderEmail` is required** — configure globally or pass per-call
- **PHP SDK uses static methods** — configure once, call on the class
- **Partner API keys are distinct** from regular API keys — using the wrong one returns `AuthenticationException`
- **Laravel config**: add TurboSign::configure() in a service provider's `boot()` method for clean initialization
- **`signUrl`** — each `RecipientResponse` in the `sendSignature`/`createSignatureReviewLink` response has a `signUrl` property: the personal signing link for that recipient. `createSignatureReviewLink` also returns a top-level `previewUrl` for document-level preview.
- **`resend` takes recipient UUIDs** (array of strings), not email addresses — fetch them from the send/review response or `getAuditTrail`. Pass an empty array to resend to all pending recipients.
- **TurboWebhooks is one-per-org** — every call hits the fixed `signature` webhook. Trying to create it twice returns `ConflictException` (409); update or delete the existing one instead.
- **TurboWebhooks requires admin** — the routes are gated by `requireOrgRole(administrator)`. A non-admin TDX- key throws `AuthorizationException` (403).
- **`createWebhook` URLs must be HTTPS** — non-HTTPS receivers return `ValidationException` (400). For local development, expose your receiver via an HTTPS tunnel (ngrok, cloudflared) and use the tunnel URL.
- **Save the secret immediately** — `createWebhook` and `regenerateWebhookSecret` return the HMAC secret ONCE. There is no endpoint to retrieve it later. If you lose it, `regenerateWebhookSecret` mints a new one (and invalidates the old).
- **Signature verification** — never `json_decode` the request body before passing it to `verifyWebhookSignature()`. The HMAC is over the raw bytes; re-encoded JSON will not match.

- **TurboQuote decimal fields come back as numbers**, not strings — the response normalizer coerces `listPrice`, `unitPrice`, `discountPercent`, `subtotal`, `grandTotal`, `taxRate`, and related fields from the backend's string representation to PHP floats. Do not try to parse them yourself.
- **PATCH null-clears nullable fields** — `updateQuote` (and other PATCH methods) include explicitly-set `null` values in the request body, which clears that field on the server. Only fields you actually pass are sent; fields you omit are left unchanged.
- **`discountType` is `'percent'` or `'amount'`** — use the string literals or `DiscountType::PERCENT->value` / `DiscountType::AMOUNT->value`; mixing them up silently falls back to the backend default.

**Full API reference:** https://docs.turbodocx.com/docs
