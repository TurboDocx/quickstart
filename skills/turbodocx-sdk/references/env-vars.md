# Environment Variables Reference

TurboSign and Deliverable share the same API key + org ID. TurboPartner uses a separate set of partner credentials.

## TurboSign + Deliverable Variables

| Variable | Required for | Description |
|----------|----------|-------------|
| `TURBODOCX_API_KEY` | TurboSign, Deliverable | API key from your TurboDocx dashboard |
| `TURBODOCX_ORG_ID` | TurboSign, Deliverable | Organization UUID from your dashboard |
| `TURBODOCX_SENDER_EMAIL` | TurboSign only | Reply-to email for signature request emails. **Must be a verified email.** |
| `TURBODOCX_SENDER_NAME` | No | Display name on signature emails (defaults to org name) |

Deliverable does not send email, so it doesn't need the sender variables.

## TurboPartner Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURBODOCX_PARTNER_API_KEY` | Yes | Partner API key from your partner dashboard |
| `TURBODOCX_PARTNER_ID` | Yes | Partner UUID from your partner dashboard |

## .env Template

```env
# TurboDocx — TurboSign and Deliverable (shared credentials)
TURBODOCX_API_KEY=your_api_key_here
TURBODOCX_ORG_ID=your_org_id_here

# TurboDocx — TurboSign-only (sender identity for signature emails)
TURBODOCX_SENDER_EMAIL=you@company.com
TURBODOCX_SENDER_NAME=Your Company

# TurboDocx — TurboPartner (separate partner credentials)
TURBODOCX_PARTNER_API_KEY=your_partner_api_key_here
TURBODOCX_PARTNER_ID=your_partner_id_here
```

## Config Resolution Order

The SDK resolves configuration in this order (first found wins):

1. Values passed directly to `configure()` / `NewClientWithConfig()`
2. Environment variables (listed above)
3. `.env` file in project root (if using dotenv/godotenv/phpdotenv)

## Common Gotchas

- **`senderEmail` is required** for all TurboSign operations. Without it, `sendSignature()` will throw a `ValidationError`.
- **Partner keys are distinct from regular API keys.** Using a regular API key with TurboPartner methods will return `AuthenticationError`.
- **Don't commit `.env`** — always add it to `.gitignore`. Use `.env.example` with placeholder values for documentation.
- **Org ID vs Partner ID** — these are different UUIDs. The org ID identifies your organization; the partner ID identifies your partner account. Don't mix them up.

## Per-Language dotenv Setup

| Language | Package | Load Command |
|----------|---------|-------------|
| JavaScript | `dotenv` | `import 'dotenv/config'` (at entry point) |
| Python | `python-dotenv` | `from dotenv import load_dotenv; load_dotenv()` |
| Go | `github.com/joho/godotenv` | `godotenv.Load()` (in main) |
| PHP | `vlucas/phpdotenv` | `Dotenv\Dotenv::createImmutable(__DIR__)->load()` |
| Java (Spring) | Built-in | `application.properties` with `${TURBODOCX_API_KEY}` |
| Java (plain) | `io.github.cdimascio:dotenv-java` | `Dotenv.load()` |
