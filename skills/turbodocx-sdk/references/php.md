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

## Gotchas

- **PHP 8.1+ required** for named arguments and enum support
- **`senderEmail` is required** — configure globally or pass per-call
- **PHP SDK uses static methods** — configure once, call on the class
- **Partner API keys are distinct** from regular API keys — using the wrong one returns `AuthenticationException`
- **Laravel config**: add TurboSign::configure() in a service provider's `boot()` method for clean initialization
- **`signUrl`** — each `RecipientResponse` in the `sendSignature`/`createSignatureReviewLink` response has a `signUrl` property: the personal signing link for that recipient. `createSignatureReviewLink` also returns a top-level `previewUrl` for document-level preview.
- **`resend` takes recipient UUIDs** (array of strings), not email addresses — fetch them from the send/review response or `getAuditTrail`. Pass an empty array to resend to all pending recipients.

**Full API reference:** https://docs.turbodocx.com/docs
