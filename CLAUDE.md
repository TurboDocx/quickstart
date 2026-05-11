# TurboDocx Skills

## What This Repo Is

An [Agent Skills](https://agentskills.io) plugin containing two skills for TurboDocx integration. Works with Claude Code (as a plugin), GitHub Copilot, Cursor, OpenAI Codex CLI, Gemini CLI, and any tool that supports the Agent Skills spec.

### Skills

1. **`/turbodocx-sdk`** — Detects the user's project language, asks whether they need TurboSign (digital signatures), TurboPartner (partner/org management), or both, then installs the SDK, configures environment variables, and generates working integration code. Supports JS/TS, Python, Go, PHP, and Java.

2. **`/turbodocx-html-to-docx`** — Sets up `@turbodocx/html-to-docx` in a Node.js/TypeScript project to convert HTML strings to Word documents. Installs the package, creates a helper module, and generates framework-appropriate integration code.

Both skills are *build-time* — they embed code into the user's project. For *runtime* agent access to the TurboDocx platform without the UI, see the separate MCP server (planned).

## Repo Structure

```
.claude-plugin/plugin.json          # Plugin manifest
skills/
  turbodocx-sdk/
    SKILL.md                        # Skill instructions (phases, logic, prompts)
    references/
      javascript.md                 # JS/TS SDK code templates
      python.md                     # Python SDK code templates
      go.md                         # Go SDK code templates
      php.md                        # PHP SDK code templates
      java.md                       # Java SDK code templates
      env-vars.md                   # Environment variable reference
  turbodocx-html-to-docx/
    SKILL.md                        # Skill instructions
    references/
      usage.md                      # API reference and code examples
evals/
  evals.json                        # Test prompts for both skills
```

## How It Works

- Each `SKILL.md` contains the skill logic — detection, user prompts, and step-by-step integration phases
- `references/*.md` files contain code templates that SKILL.md reads on demand
- Skills auto-discover project language/framework from manifest files

## How to Test / Iterate

1. Install the plugin locally: `claude plugin add /home/nicolas/repos/turbodocx-quickstart-skill`
2. Open a test project and run `/turbodocx-sdk` or `/turbodocx-html-to-docx`
3. Use evals: `claude evals run evals/evals.json`

## Coding Conventions

- SKILL.md uses markdown with YAML frontmatter
- Reference files are pure markdown with fenced code blocks
- Keep reference files focused: install + configure + usage examples + error handling + gotchas
- No MCP server needed — purely instruction-driven skills

## SDK Documentation

- SDK source: `/home/nicolas/repos/SDK/packages/`
- Public docs: https://docs.turbodocx.com
- Dashboard: https://app.turbodocx.com
