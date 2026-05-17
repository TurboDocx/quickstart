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

## Gotchas

- **All SDK methods are async** — use `await` in async functions, or `asyncio.run()` for sync contexts
- **`sender_email` is required** — configure it globally or pass per-call
- **Flask needs asyncio.run()** wrapping since Flask routes are synchronous by default
- **File input** accepts: `bytes`, file path string, URL string, deliverable ID, or template ID
- **`signUrl`** — each recipient dict in the `send_signature`/`create_signature_review_link` response includes a `signUrl` field: the personal signing link for that recipient. `create_signature_review_link` also returns a top-level `previewUrl` for document-level preview.
- **`resend_email` takes recipient UUIDs**, not email addresses — fetch them from the `send_signature` or `create_signature_review_link` response recipients, or from `get_audit_trail`.

**Full API reference:** https://docs.turbodocx.com/docs
