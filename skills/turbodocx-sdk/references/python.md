# Python SDK Reference

## Install

```bash
# pip
pip install turbodocx-sdk

# poetry
poetry add turbodocx-sdk

# pipenv
pipenv install turbodocx-sdk
```

Also install python-dotenv if not already present:
```bash
pip install python-dotenv
```

Add to your entry point:
```python
from dotenv import load_dotenv
load_dotenv()
```

## Imports

```python
from turbodocx_sdk import TurboSign, TurboPartner
```

## TurboSign Configuration

```python
import os
from turbodocx_sdk import TurboSign

TurboSign.configure(
    api_key=os.environ["TURBODOCX_API_KEY"],
    org_id=os.environ["TURBODOCX_ORG_ID"],
    sender_email=os.environ["TURBODOCX_SENDER_EMAIL"],
    sender_name=os.getenv("TURBODOCX_SENDER_NAME"),
)
```

## TurboSign Usage

### send_signature

```python
with open("contract.pdf", "rb") as f:
    pdf_file = f.read()

result = await TurboSign.send_signature(
    file=pdf_file,
    document_name="Partnership Agreement",
    recipients=[
        {"name": "John Doe", "email": "john@example.com", "signingOrder": 1},
    ],
    fields=[
        {
            "type": "signature",
            "recipientEmail": "john@example.com",
            "template": {
                "anchor": "{signature1}",
                "placement": "replace",
                "size": {"width": 100, "height": 30},
            },
        },
    ],
)

print(f"Document ID: {result['documentId']}")
```

### get_status

```python
status = await TurboSign.get_status(document_id)
print(f"Status: {status['status']}")         # 'pending' | 'completed' | 'voided'
print(f"Recipients: {status['recipients']}")
```

### download

```python
pdf_bytes = await TurboSign.download(document_id)
with open("signed.pdf", "wb") as f:
    f.write(pdf_bytes)
```

### create_signature_review_link

Prepares the document with recipients and fields but **does not send signature emails** — use this to preview field placement before sending.

```python
result = await TurboSign.create_signature_review_link(
    file=pdf_bytes,
    document_name="NDA - Acme",
    recipients=[
        {"name": "John Doe", "email": "john@example.com", "signingOrder": 1},
    ],
    fields=[
        {
            "type": "signature",
            "page": 1,
            "x": 100,
            "y": 500,
            "width": 200,
            "height": 50,
            "recipientEmail": "john@example.com",
        },
    ],
)

print(f"Document ID: {result['documentId']}")
print(f"Preview URL: {result['previewUrl']}")  # open to review field placement
# Each recipient also has a signUrl for their personal signing link
for r in result.get("recipients", []):
    print(f"  {r['name']}: {r.get('signUrl')}")
```

### void_document

```python
voided = await TurboSign.void_document(document_id, "Counterparty requested changes")
print(f"Status: {voided['status']}")    # 'voided'
print(f"Voided at: {voided['voidedAt']}")
```

`reason` is **required**.

### resend_email

```python
# recipient_ids are UUIDs — fetch from send_signature/create_signature_review_link response or get_audit_trail
result = await TurboSign.resend_email(document_id, ["recipient-uuid-1", "recipient-uuid-2"])
print(f"Resent to {result['recipientCount']} recipients")
```

### get_audit_trail

```python
audit = await TurboSign.get_audit_trail(document_id)
print(f"Document: {audit['document']['name']}")

for entry in audit["auditTrail"]:
    print(f"{entry['timestamp']}  {entry['actionType']}  {entry.get('user', {}).get('email', '')}")
```

## TurboPartner Configuration

```python
import os
from turbodocx_sdk import TurboPartner

TurboPartner.configure(
    partner_api_key=os.environ["TURBODOCX_PARTNER_API_KEY"],
    partner_id=os.environ["TURBODOCX_PARTNER_ID"],
)
```

## TurboPartner Usage

### create_organization

```python
org = await TurboPartner.create_organization(
    name="Acme Corp",
    features={"maxUsers": 50, "hasTDAI": True},
)

print(f"Org ID: {org['data']['id']}")
```

### list_organizations

```python
orgs = await TurboPartner.list_organizations(page=1, limit=20)

print(f"Total: {orgs['total']}")
for org in orgs["data"]:
    print(f"{org['name']} ({org['id']})")
```

## FastAPI Integration Example

```python
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from turbodocx_sdk import TurboSign, TurboDocxError
import json

router = APIRouter(prefix="/api/signatures", tags=["signatures"])

@router.post("/send")
async def send_signature(
    file: UploadFile = File(...),
    document_name: str = Form(...),
    recipients: str = Form(...),
    fields: str = Form(...),
):
    try:
        pdf_bytes = await file.read()
        result = await TurboSign.send_signature(
            file=pdf_bytes,
            document_name=document_name,
            recipients=json.loads(recipients),
            fields=json.loads(fields),
        )
        return result
    except TurboDocxError as e:
        raise HTTPException(status_code=e.status or 500, detail=str(e))

@router.get("/{document_id}/status")
async def get_status(document_id: str):
    try:
        return await TurboSign.get_status(document_id)
    except TurboDocxError as e:
        raise HTTPException(status_code=e.status or 500, detail=str(e))
```

## Flask Integration Example

```python
from flask import Blueprint, request, jsonify
from turbodocx_sdk import TurboSign, TurboDocxError
import json
import asyncio

signatures_bp = Blueprint("signatures", __name__)

@signatures_bp.route("/send", methods=["POST"])
def send_signature():
    try:
        file = request.files["file"]
        result = asyncio.run(TurboSign.send_signature(
            file=file.read(),
            document_name=request.form["document_name"],
            recipients=json.loads(request.form["recipients"]),
            fields=json.loads(request.form["fields"]),
        ))
        return jsonify(result)
    except TurboDocxError as e:
        return jsonify({"error": str(e)}), e.status or 500
```

## TurboWebhooks

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to TurboDocx events such as `signature.document.completed` and `signature.document.voided`. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

### TurboWebhooks.configure

```python
import os
from turbodocx_sdk import TurboWebhooks

TurboWebhooks.configure(
    api_key=os.environ["TURBODOCX_API_KEY"],   # admin TDX- key
    org_id=os.environ["TURBODOCX_ORG_ID"],
)
```

`skip_sender_validation=True` is hardcoded inside `configure()` because webhooks don't send email — only TurboSign needs `sender_email`. The webhook routes require the organization administrator role; a non-admin TDX- key returns `AuthorizationError` (HTTP 403).

### create_webhook

```python
created = await TurboWebhooks.create_webhook(
    urls=["https://your-server.example.com/webhooks/turbodocx"],  # must be HTTPS
    events=["signature.document.completed", "signature.document.voided"],
)

# Returned secret is shown ONCE — store it server-side immediately.
webhook_id = created["id"]
secret = created["secret"]
```

Raises `ConflictError` (409) if the signature webhook already exists for the org. Raises `ValidationError` (400) for non-HTTPS URLs.

### get_webhook

```python
webhook = await TurboWebhooks.get_webhook()
# webhook["urls"], webhook["events"], webhook["isActive"]
# webhook["deliveryStats"]: {"totalDeliveries", "successfulDeliveries", "failedDeliveries", "pendingRetries"}
```

### update_webhook

```python
await TurboWebhooks.update_webhook(
    urls=["https://your-server.example.com/webhooks/turbodocx"],
    events=["signature.document.completed"],
    is_active=True,
)
```

All three fields are keyword-only and optional — pass only what you want to change.

### delete_webhook

```python
await TurboWebhooks.delete_webhook()  # soft-delete + delivery history wiped
```

### test_webhook

```python
result = await TurboWebhooks.test_webhook(
    event_type="signature.document.completed",
    payload={"documentId": "...", "documentName": "..."},
)
# result["summary"]: {"total", "successful", "failed", "errors": [...]}
# result["deliveries"]: list of WebhookDelivery records
```

Per-URL failure messages live in `result["summary"]["errors"]`. Use this from a CI smoke test before flipping a new receiver into production.

### regenerate_webhook_secret

```python
rotated = await TurboWebhooks.regenerate_webhook_secret()
# rotated["secret"] — shown ONCE; old signatures fail immediately after rotation
```

### list_webhook_deliveries

```python
page = await TurboWebhooks.list_webhook_deliveries(
    limit=20,
    offset=0,
    event_type="signature.document.completed",
    is_delivered=False,
    http_status=500,
)
# page["results"]: list of WebhookDelivery; page["totalRecords"]: int
```

### replay_webhook_delivery

```python
new_delivery = await TurboWebhooks.replay_webhook_delivery(delivery_id)
# Full WebhookDelivery row returned — id, httpStatus, attemptCount, etc.
```

### get_webhook_stats

```python
stats = await TurboWebhooks.get_webhook_stats(days=30)
# stats["summary"]: {"successRate", "avgResponseTime", ...}
# stats["eventBreakdown"]: per-event totals
```

### Verifying inbound webhook signatures

When TurboDocx POSTs to your receiver, verify the `X-TurboDocx-Signature` header before trusting the payload. The helper enforces a 5-minute timestamp tolerance and uses `hmac.compare_digest` for constant-time comparison.

```python
import os
from flask import Flask, request, abort
from turbodocx_sdk import verify_webhook_signature

app = Flask(__name__)

@app.post("/webhooks/turbodocx")
def turbodocx_webhook():
    # IMPORTANT: read raw bytes — the signature is computed over them.
    # request.get_json() will mangle whitespace and break verification.
    raw_body = request.get_data()
    signature = request.headers.get("X-TurboDocx-Signature", "")
    timestamp = request.headers.get("X-TurboDocx-Timestamp", "")
    secret = os.environ["TURBODOCX_WEBHOOK_SECRET"]

    if not verify_webhook_signature(raw_body, signature, timestamp, secret):
        abort(401, "Invalid signature")

    import json
    event = json.loads(raw_body)
    # process event["eventType"], event["data"], ...
    return ("ok", 200)
```

**Canonical end-to-end Python example:** [`packages/py-sdk/examples/turbowebhooks_crud.py`](https://github.com/TurboDocx/SDK/blob/main/packages/py-sdk/examples/turbowebhooks_crud.py) walks through create → conflict → get → update → test-fire → rotate → list → delete + every error branch.

### TurboWebhooks error handling

```python
from turbodocx_sdk import (
    TurboDocxError,
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    ConflictError,
    NotFoundError,
    RateLimitError,
    NetworkError,
)

try:
    await TurboWebhooks.create_webhook(urls=urls, events=events)
except ConflictError:        pass  # 409 — already exists; update or delete
except ValidationError:      pass  # 400 — non-HTTPS URL or empty events
except AuthorizationError:   pass  # 403 — TDX- key lacks administrator role
except AuthenticationError:  pass  # 401 — bad / revoked API key
except NotFoundError:        pass  # 404 — webhook does not exist
except RateLimitError:       pass  # 429 — back off and retry
except NetworkError:         pass  # never reached the server
except TurboDocxError:       pass  # other typed SDK error (e.g. 5xx)
```

## TurboQuote

TurboQuote manages the full CPQ (Configure, Price, Quote) workflow: products, bundles, price books, companies, contacts, quote templates, and interactive PDF quotes.

### TurboQuote.configure

```python
import os
from turbodocx_sdk import TurboQuote

TurboQuote.configure(
    api_key=os.environ["TURBODOCX_API_KEY"],
    org_id=os.environ["TURBODOCX_ORG_ID"],
)
```

`sender_email` is **not required** — TurboQuote does not send signature emails. `org_id` is technically optional in the SDK (auto-init from env on first use), but the backend returns `401` if it is missing, so always pass it.

### create_quote

```python
quote = await TurboQuote.create_quote({
    "name": "Enterprise License Q3",
    "companyId": "company-uuid",
    "contactId": "contact-uuid",
    "currency": "USD",
    "termDays": 30,
})

print(f"Quote ID: {quote['id']}")   # quote dict (result unwrapped)
```

### add_line_items

```python
# Single item dict is auto-wrapped to array
items = await TurboQuote.add_line_items(quote["id"], {
    "productName": "Platform License",
    "unitPrice": 500.00,
    "billingFrequency": "monthly",   # 'monthly'|'quarterly'|'annual'|'one-time'
    "quantity": 10,
    "discountType": "percent",       # 'percent'|'amount'
    "discountPercent": 15,
})
# items is a list of created LineItem dicts
```

### send_quote

```python
result = await TurboQuote.send_quote(quote["id"])
# result["quote"]["status"]  →  'sent'
# result["message"]          →  human-readable confirmation string
```

### download_quote_pdf

```python
pdf_bytes = await TurboQuote.download_quote_pdf(quote["id"])
with open("quote.pdf", "wb") as f:
    f.write(pdf_bytes)
```

### Product / bundle / price book catalog example

```python
# Create a product
product = await TurboQuote.create_product({
    "name": "Widget Pro",
    "listPrice": 199.99,
    "billingFrequency": "one-time",
    "showInCatalog": True,
})

# Create a price book and apply to a quote
price_book = await TurboQuote.create_price_book({"name": "Partner Pricing"})
result = await TurboQuote.apply_price_book(quote["id"], price_book["id"])
# result: {"quote": ..., "message": ..., "updatedCount": int, "skippedCount": int}
```

### create_and_send convenience method

```python
# Create + add items + send in one call
result = await TurboQuote.create_and_send({
    "name": "Quick Deal",
    "companyId": "company-uuid",
    "contactId": "contact-uuid",
    "currency": "USD",
    "items": [
        {"productName": "Starter Plan", "unitPrice": 99.00, "billingFrequency": "monthly", "quantity": 1},
    ],
})
print(result["quote"]["status"])  # 'sent'
```

### TurboQuote error handling

```python
from turbodocx_sdk import (
    TurboDocxError,
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    NetworkError,
)

try:
    await TurboQuote.send_quote(quote_id)
except ValidationError as e:
    pass  # 400 — missing required fields or invalid enum value
except NotFoundError:
    pass  # 404 — quote_id does not exist
except AuthenticationError:
    pass  # 401 — bad / revoked API key or missing org_id
except RateLimitError:
    pass  # 429 — back off and retry
except NetworkError:
    pass  # never reached the server
except TurboDocxError:
    pass  # other typed SDK error (e.g. 5xx)
```

## Error Handling

```python
from turbodocx_sdk import (
    TurboDocxError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    NetworkError,
)

try:
    await TurboSign.send_signature(...)
except AuthenticationError:
    # Invalid/missing API key
except ValidationError as e:
    # Bad request (e.g., missing sender_email)
    print(f"Validation failed: {e.message}")
except NotFoundError:
    # Document/org not found
except RateLimitError:
    # Too many requests — back off
except NetworkError:
    # Connection failure
except TurboDocxError as e:
    # Catch-all for any SDK error
    print(f"Error {e.code}: {e.message}")
```

## Method Reference

| Method | Description |
|--------|-------------|
| `TurboSign.send_signature(...)` | Send document for e-signature |
| `TurboSign.create_signature_review_link(...)` | Preview without sending emails |
| `TurboSign.get_status(document_id)` | Get document + recipient status |
| `TurboSign.download(document_id)` | Download signed PDF as bytes |
| `TurboSign.void_document(document_id, reason)` | Cancel a signature request (reason required) |
| `TurboSign.resend_email(document_id, recipient_ids)` | Resend signature email to recipient UUIDs |
| `TurboSign.get_audit_trail(document_id)` | Get complete audit trail |
| `TurboPartner.create_organization(...)` | Provision a new customer org |
| `TurboPartner.list_organizations(...)` | List managed organizations |
| `TurboPartner.get_organization(org_id)` | Get org details |
| `TurboPartner.update_entitlements(org_id, ...)` | Update org entitlements |
| `TurboWebhooks.configure(api_key, org_id, base_url=...)` | Configure the webhook client (skip_sender_validation is hardcoded) |
| `TurboWebhooks.create_webhook(urls, events)` | Subscribe the org to events (HTTPS URLs only) |
| `TurboWebhooks.get_webhook()` | Get the org's signature webhook + delivery stats |
| `TurboWebhooks.update_webhook(urls=, events=, is_active=)` | Patch any subset of fields |
| `TurboWebhooks.delete_webhook()` | Soft-delete the webhook |
| `TurboWebhooks.test_webhook(event_type, payload)` | Fire a test delivery; surfaces per-URL errors |
| `TurboWebhooks.notify_webhook(event_type, payload)` | Manual notify; same handler as `test_webhook` |
| `TurboWebhooks.regenerate_webhook_secret()` | Rotate the HMAC secret (shown ONCE) |
| `TurboWebhooks.list_webhook_deliveries(limit=, offset=, ...)` | Paginated delivery history with filters |
| `TurboWebhooks.replay_webhook_delivery(delivery_id)` | Retry a past delivery; returns the new delivery row |
| `TurboWebhooks.get_webhook_stats(days=)` | Aggregate stats over a sliding window |
| `verify_webhook_signature(raw_body, sig_header, ts_header, secret, ...)` | Free function; verifies inbound deliveries |
| `TurboQuote.configure(api_key, org_id, base_url=...)` | Configure the quote client (no sender_email needed) |
| `TurboQuote.list_quotes(options=)` | List quotes with pagination and filters |
| `TurboQuote.create_quote(request)` | Create a new quote |
| `TurboQuote.get_quote(id)` | Get quote by ID (statusInfo merged in) |
| `TurboQuote.update_quote(id, request)` | PATCH any subset of quote fields |
| `TurboQuote.delete_quote(id)` | Delete a quote |
| `TurboQuote.duplicate_quote(id)` | Duplicate a quote |
| `TurboQuote.send_quote(id, request=)` | Send quote to recipient; returns `{quote, message}` |
| `TurboQuote.send_quote_with_deliverable(id, request)` | Send with attached deliverable; returns `{quote, message, documentId}` |
| `TurboQuote.decline_quote(id, {reason})` | Decline a sent quote |
| `TurboQuote.void_quote(id, {reason})` | Void a quote |
| `TurboQuote.handle_expired_quote(id, request)` | Act on an expired sent quote (void/decline + new valid date) |
| `TurboQuote.apply_price_book(quote_id, price_book_id)` | Apply price book to quote; returns `{quote, message, updatedCount, skippedCount}` |
| `TurboQuote.remove_price_book(quote_id)` | Remove price book from quote |
| `TurboQuote.download_quote_pdf(id)` | Download quote as raw PDF bytes |
| `TurboQuote.create_and_send(request)` | Convenience: create + add items + send in one call |
| `TurboQuote.list_line_items(quote_id, options=)` | List line items for a quote |
| `TurboQuote.add_line_items(quote_id, items)` | Add product line item(s); single dict auto-wrapped to array |
| `TurboQuote.add_bundle_line_items(quote_id, items)` | Add bundle line item(s) |
| `TurboQuote.update_line_item(quote_id, item_id, request)` | Update a line item |
| `TurboQuote.remove_line_item(quote_id, item_id)` | Remove a line item |
| `TurboQuote.list_products(options=)` | List products |
| `TurboQuote.create_product(request)` | Create product (multipart when `images` provided) |
| `TurboQuote.get_product(id)` | Get product by ID |
| `TurboQuote.update_product(id, request)` | Update product |
| `TurboQuote.delete_product(id)` | Delete product |
| `TurboQuote.duplicate_product(id)` | Duplicate product |
| `TurboQuote.get_product_primary_images(product_ids)` | Batch-fetch primary images; returns `{product_id: image|None}` |
| `TurboQuote.list_price_books(options=)` | List price books |
| `TurboQuote.create_price_book(request)` | Create price book |
| `TurboQuote.get_price_book(id)` | Get price book by ID |
| `TurboQuote.update_price_book(id, request)` | Update price book |
| `TurboQuote.delete_price_book(id)` | Delete price book |
| `TurboQuote.duplicate_price_book(id)` | Duplicate price book |
| `TurboQuote.list_price_book_products(id, options=)` | List products in a price book |
| `TurboQuote.list_bundles(options=)` | List bundles |
| `TurboQuote.create_bundle(request)` | Create bundle |
| `TurboQuote.get_bundle(id)` | Get bundle by ID |
| `TurboQuote.update_bundle(id, request)` | Update bundle |
| `TurboQuote.delete_bundle(id)` | Delete bundle |
| `TurboQuote.duplicate_bundle(id)` | Duplicate bundle |
| `TurboQuote.list_companies(options=)` | List companies |
| `TurboQuote.create_company(request)` | Create company (`contacts` list required, min 1) |
| `TurboQuote.get_company(id)` | Get company by ID |
| `TurboQuote.update_company(id, request)` | Update company |
| `TurboQuote.delete_company(id)` | Delete company |
| `TurboQuote.list_company_contacts(company_id, options=)` | List contacts for a company |
| `TurboQuote.list_contacts(options=)` | List contacts |
| `TurboQuote.create_contact(request)` | Create contact |
| `TurboQuote.update_contact(id, request)` | Update contact |
| `TurboQuote.delete_contact(id)` | Delete contact |
| `TurboQuote.list_templates(options=)` | List quote templates |
| `TurboQuote.get_template()` | Get the org's default (singleton) template |
| `TurboQuote.get_template_by_id(id)` | Get a specific template by ID |
| `TurboQuote.create_template(request)` | Create quote template |
| `TurboQuote.update_template(id, request)` | Update quote template |
| `TurboQuote.delete_template(id)` | Delete quote template |
| `TurboQuote.list_types(options=)` | List types/categories |
| `TurboQuote.create_type(request)` | Create a type |
| `TurboQuote.update_type(id, request)` | Update a type |
| `TurboQuote.delete_type(id)` | Delete a type |

## Gotchas

- **All SDK methods are async** — use `await` in async functions, or `asyncio.run()` for sync contexts
- **`sender_email` is required** — configure it globally or pass per-call
- **Flask needs asyncio.run()** wrapping since Flask routes are synchronous by default
- **File input** accepts: `bytes`, file path string, URL string, deliverable ID, or template ID
- **`signUrl`** — each recipient dict in the `send_signature`/`create_signature_review_link` response includes a `signUrl` field: the personal signing link for that recipient. `create_signature_review_link` also returns a top-level `previewUrl` for document-level preview.
- **`resend_email` takes recipient UUIDs**, not email addresses — fetch them from the `send_signature` or `create_signature_review_link` response recipients, or from `get_audit_trail`.
- **TurboWebhooks requires an admin TDX- key.** The backend route gate is `requireOrgRole(administrator)` — a non-admin key returns 403 `AuthorizationError`.
- **One webhook per org, fixed name `signature`.** The SDK is hardcoded to `/api/webhooks/signature` to stay in sync with the dashboard's Signature Webhooks page. There is no `list_webhooks` by design. For multi-webhook management call the REST API directly.
- **Webhook secrets are shown ONCE** — capture `created["secret"]` from `create_webhook` and `rotated["secret"]` from `regenerate_webhook_secret` immediately. They are never returned again by `get_webhook` or any other endpoint.
- **Webhook URLs must be HTTPS.** Non-HTTPS URLs return 400 `ValidationError` from the backend.
- **Read the raw request body in your receiver, not the parsed JSON.** Use Flask's `request.get_data()` or FastAPI's `await request.body()`. Signature verification is computed over the raw bytes; a JSON re-stringify will not match.
- **`verify_webhook_signature` is a free function**, not a method on `TurboWebhooks` — import it directly from `turbodocx_sdk`. It has no `api_key`/`org_id` dependency.

- **TurboQuote decimal fields come back as Python `float`**, not strings. The response normalizer coerces `listPrice`, `unitPrice`, `discountPercent`, `subtotal`, `grandTotal`, `taxRate`, and all other money/rate fields from the database string representation to `float` automatically — never parse them yourself.
- **PATCH null clears nullable fields.** `update_quote` / `update_line_item` / `update_product` etc. use HTTP PATCH: explicitly passing `None` for a nullable field (e.g. `{"taxRate": None}`) sends `null` in the JSON body and clears that column. Omitting the key entirely leaves it unchanged. Do not pass `None` for fields you do not intend to clear.
- **`discountType` is `'percent'` or `'amount'`, not `'percentage'`.** The backend enum is `'percent'`; using the wrong value returns a `400 ValidationError`. Similarly, `billingFrequency` values are `'monthly'`, `'quarterly'`, `'annual'`, and `'one-time'` (hyphen, not underscore).

**Full API reference:** https://docs.turbodocx.com/docs
