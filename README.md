# TurboDocx Quickstart — Claude Code Plugin

Install the TurboDocx SDK and generate working integration code for **TurboSign** (digital signatures) and **TurboPartner** (partner management) in one command.

## Supported Languages

| Language | Package | Frameworks |
|----------|---------|------------|
| JavaScript/TypeScript | `@turbodocx/sdk` | Express, Next.js, Fastify, NestJS, etc. |
| Python | `turbodocx-sdk` | FastAPI, Flask, Django |
| Go | `github.com/turbodocx/sdk` | Gin, Echo, Fiber, net/http |
| PHP | `turbodocx/sdk` | Laravel, Symfony |
| Java | `com.turbodocx:turbodocx-sdk` | Spring Boot, Micronaut, Quarkus |

## Install

```bash
claude plugin add turbodocx/quickstart-skill
```

## Usage

```
/turbodocx-quickstart
```

The skill will:
1. Detect your project language from manifest files
2. Ask what you need — TurboSign, TurboPartner, or both
3. Install the SDK package
4. Add environment variables to `.env` and `.env.example`
5. Analyze your codebase structure and generate integration code that matches your patterns
6. Provide a working example with inline comments

### Shortcuts

Skip the product selection prompt:

```
/turbodocx-quickstart turbosign       # TurboSign only
/turbodocx-quickstart turbopartner    # TurboPartner only
/turbodocx-quickstart both            # Both products
```

## What It Generates

### TurboSign Integration
- Client configuration with env var loading
- `sendSignature()` — send documents for e-signature
- `getStatus()` — check document/recipient status
- Route handler wired into your existing app

### TurboPartner Integration
- Partner client configuration
- `createOrganization()` — provision customer orgs
- `listOrganizations()` — list managed orgs
- Route handler wired into your existing app

## Prerequisites

Get your API credentials at [app.turbodocx.com](https://app.turbodocx.com).

## Resources

- [Documentation](https://docs.turbodocx.com)
- [Discord](https://discord.gg/NYKwz4BcpX)
- [SDK Source](https://github.com/TurboDocx/SDK)

## License

MIT
