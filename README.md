[![TurboDocx](https://raw.githubusercontent.com/TurboDocx/SDK/main/banner.png)](https://www.turbodocx.com)

<div align="center">

# TurboDocx Skills

**Agent Skills for TurboDocx integration — TurboSign, Deliverable, and HTML-to-DOCX**

[![GitHub Stars](https://img.shields.io/github/stars/TurboDocx/quickstart?style=social)](https://github.com/TurboDocx/quickstart)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-7289DA?logo=discord&logoColor=white)](https://discord.gg/NYKwz4BcpX)
[![X](https://img.shields.io/badge/X-@TurboDocx-000?logo=x&logoColor=white)](https://twitter.com/TurboDocx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-agentskills.io-8A2BE2)](https://agentskills.io)
[![skills.sh](https://skills.sh/b/TurboDocx/quickstart)](https://skills.sh/TurboDocx/quickstart)

[Documentation](https://docs.turbodocx.com/docs) • [SDK Reference](https://docs.turbodocx.com/docs/SDKs/) • [Discord](https://discord.gg/NYKwz4BcpX) • [Blog](https://www.turbodocx.com/blog)

</div>

---

An [Agent Skills](https://agentskills.io) plugin with two skills:

- **`/turbodocx-sdk`** — Install the TurboDocx SDK and generate working integration code for **TurboSign** (digital signatures) and **Deliverable** (template-based document generation) in one command. Also supports **TurboPartner** (partner-portal provisioning) for TurboDocx reseller/integrator accounts. Supports JS/TS, Python, Go, PHP, and Java.
- **`/turbodocx-html-to-docx`** — Set up `@turbodocx/html-to-docx` to convert HTML to Word documents in Node.js/TypeScript projects.

Works with any tool that supports the Agent Skills standard: Claude Code, GitHub Copilot, Cursor, OpenCode, OpenAI Codex CLI, Gemini CLI, and others.

---

## Supported Languages

| Language | Package | Frameworks |
|:---------|:--------|:-----------|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="20"/> **JavaScript/TypeScript** | `@turbodocx/sdk` | Express, Next.js, Fastify, NestJS, etc. |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" width="20"/> **Python** | `turbodocx-sdk` | FastAPI, Flask, Django |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg" width="20"/> **Go** | `github.com/turbodocx/sdk` | Gin, Echo, Fiber, net/http |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg" width="20"/> **PHP** | `turbodocx/sdk` | Laravel, Symfony |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" width="20"/> **Java** | `com.turbodocx:turbodocx-sdk` | Spring Boot, Micronaut, Quarkus |

---

## Install

### `npx skills add` (Claude Code, Copilot, Cursor, OpenCode, Codex CLI, Gemini CLI)

Auto-detects your installed agents and drops the skills into the right config directory. Works anywhere the [Agent Skills](https://agentskills.io) standard is supported.

```bash
# Install both skills at once
npx skills add TurboDocx/quickstart

# Or install one at a time
npx skills add TurboDocx/quickstart --skill turbodocx-sdk
npx skills add TurboDocx/quickstart --skill turbodocx-html-to-docx

# Install globally (user-level, available in every project)
npx skills add TurboDocx/quickstart -g
```

Available skills:

| Skill | What it does |
|:------|:-------------|
| **`turbodocx-sdk`** | Installs the TurboDocx SDK and generates working **TurboSign** + **Deliverable** integration code in JS/TS, Python, Go, PHP, or Java. **TurboPartner** is also available via explicit shortcut for partner-portal use cases. |
| **`turbodocx-html-to-docx`** | Sets up `@turbodocx/html-to-docx` to convert HTML strings to Word documents in Node.js/TypeScript projects. |

### Claude Code (plugin)

```bash
claude plugin add TurboDocx/quickstart
```

### Claude Code / GitHub Copilot (project-level)

```bash
mkdir -p .claude/skills
cp -r skills/turbodocx-sdk .claude/skills/
```

### Cursor / OpenAI Codex CLI / Gemini CLI (project-level)

```bash
mkdir -p .agents/skills
cp -r skills/turbodocx-sdk .agents/skills/
```

### All tools (symlink both directories)

```bash
mkdir -p .claude/skills .agents/skills
cp -r skills/turbodocx-sdk .claude/skills/
ln -s ../../.claude/skills/turbodocx-sdk .agents/skills/turbodocx-sdk
```

### User-level (available in all your projects)

```bash
# Claude Code + Copilot
cp -r skills/turbodocx-sdk ~/.claude/skills/

# Codex CLI + Gemini CLI
cp -r skills/turbodocx-sdk ~/.agents/skills/
```

---

## Usage

```
/turbodocx-sdk
```

The skill will:
1. Detect your project language from manifest files
2. Ask what you need — TurboSign (signatures), Deliverable (document generation), or both
3. Install the SDK package
4. Add environment variables to `.env` and `.env.example`
5. Analyze your codebase structure and generate integration code that matches your patterns
6. Provide a working example with inline comments

### Shortcuts

Skip the product selection prompt:

```
/turbodocx-sdk turbosign                # TurboSign only
/turbodocx-sdk deliverable              # Deliverable only
/turbodocx-sdk turbosign+deliverable    # Generate-then-sign workflow
/turbodocx-sdk turbopartner             # TurboPartner (partner-portal use case; requires partner credentials)
```

---

## What It Generates

### TurboSign Integration
- Client configuration with env var loading
- `sendSignature()`, `getStatus()`, `download()` — send, track, retrieve signed PDFs
- Optional: `void()`, `resend()`, `getAuditTrail()` — cancellation, reminders, tamper-evident audit log
- Route handlers wired into your existing app

### Deliverable Integration
- Client configuration with env var loading
- `generateDeliverable()` — render a template with variable substitution
- `getDeliverableDetails()`, `downloadPDF()`, `downloadSourceFile()` — read and download generated documents
- When combined with TurboSign: generate-then-sign workflow (the new deliverable ID is handed directly to `sendSignature()` — no download/re-upload)

### TurboPartner Integration *(opt-in via `/turbodocx-sdk turbopartner`)*
- Partner client configuration
- Organizations, users, API keys, entitlements, and audit logs
- Designed for TurboDocx reseller/integrator accounts (uses a separate partner API key)

---

## 🌐 Explore the TurboDocx Ecosystem

| Package | Links | Description |
|---------|-------|-------------|
| TurboDocx SDKs | [![GitHub](https://img.shields.io/github/stars/turbodocx/sdk?style=social)](https://github.com/TurboDocx/sdk) | Official multi-language SDKs for JS, Python, Go, PHP, Java |
| @turbodocx/html-to-docx | [![npm](https://img.shields.io/npm/v/@turbodocx/html-to-docx?logo=npm&logoColor=white&label=npm)](https://www.npmjs.com/package/@turbodocx/html-to-docx) [![GitHub](https://img.shields.io/github/stars/turbodocx/html-to-docx?style=social)](https://github.com/turbodocx/html-to-docx) | Convert HTML to DOCX with the fastest JavaScript library |
| n8n-nodes-turbodocx | [![npm](https://img.shields.io/npm/v/@turbodocx/n8n-nodes-turbodocx?logo=npm&logoColor=white&label=npm)](https://www.npmjs.com/package/@turbodocx/n8n-nodes-turbodocx) [![GitHub](https://img.shields.io/github/stars/turbodocx/n8n-nodes-turbodocx?style=social)](https://github.com/turbodocx/n8n-nodes-turbodocx) | n8n community node for TurboDocx API & TurboSign |
| TurboDocx Writer | [![AppSource](https://img.shields.io/badge/Microsoft-AppSource-blue?logo=microsoft)](https://appsource.microsoft.com/en-us/product/office/WA200007397) | Official Microsoft Word add-in for document automation |

---

## Prerequisites

Get your API credentials at [app.turbodocx.com](https://app.turbodocx.com).

---

## Support

<table>
<tr>
<td align="center" width="33%">
<a href="https://docs.turbodocx.com/docs">
<img src="https://cdn-icons-png.flaticon.com/512/2991/2991112.png" width="40"/><br/>
<strong>Documentation</strong>
</a>
</td>
<td align="center" width="33%">
<a href="https://discord.gg/NYKwz4BcpX">
<img src="https://cdn-icons-png.flaticon.com/512/5968/5968756.png" width="40"/><br/>
<strong>Discord</strong>
</a>
</td>
<td align="center" width="33%">
<a href="https://github.com/TurboDocx/quickstart/issues">
<img src="https://cdn-icons-png.flaticon.com/512/733/733553.png" width="40"/><br/>
<strong>GitHub Issues</strong>
</a>
</td>
</tr>
</table>

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**[Website](https://www.turbodocx.com)** • **[Documentation](https://docs.turbodocx.com/docs)** • **[Discord](https://discord.gg/NYKwz4BcpX)** • **[Twitter/X](https://twitter.com/TurboDocx)**

<sub>Built with ❤️ by the TurboDocx team</sub>

[![TurboDocx](https://raw.githubusercontent.com/TurboDocx/SDK/main/footer.png)](https://www.turbodocx.com)

</div>
