# TurboDocx Quickstart Skill

## What This Repo Is

A Claude Code plugin that provides a `/turbodocx-quickstart` skill. When invoked, it detects the user's project language, asks whether they need TurboSign (digital signatures), TurboPartner (partner/org management), or both, then installs the SDK, configures environment variables, and generates working integration code.

## Repo Structure

```
.claude-plugin/plugin.json    # Plugin manifest
skills/
  turbodocx-quickstart/
    SKILL.md                  # Main skill instructions (phases, logic, prompts)
    references/
      javascript.md           # JS/TS SDK code templates
      python.md               # Python SDK code templates
      go.md                   # Go SDK code templates
      php.md                  # PHP SDK code templates
      java.md                 # Java SDK code templates
      env-vars.md             # Environment variable reference
evals/
  evals.json                  # Test prompts for validating the skill
```

## How It Works

- `SKILL.md` contains the main skill logic — language detection, user prompts, and step-by-step integration phases
- `references/*.md` files contain language-specific code templates that SKILL.md reads on demand
- The skill auto-discovers project language from manifest files (package.json, go.mod, etc.)

## Skill Structure (SKILL.md)

The skill follows a phased approach:
1. **Detect language** from project files
2. **Ask product selection** (TurboSign / TurboPartner / both)
3. **Install SDK** for detected language
4. **Configure env vars** (.env + .env.example)
5. **Read reference file** for detected language
6. **Analyze codebase** and generate integration code matching existing patterns
7. **Verify** and provide summary

## How to Test / Iterate

1. Install the plugin locally: `claude plugin add /home/nicolas/repos/turbodocx-quickstart-skill`
2. Open a test project and run `/turbodocx-quickstart`
3. Use evals: `claude evals run evals/evals.json`

## Coding Conventions

- SKILL.md uses markdown with YAML frontmatter
- Reference files are pure markdown with fenced code blocks
- Keep reference files focused: install + configure + usage examples + error handling + gotchas
- Each reference file should be ~100-150 lines
- No MCP server needed — this is a purely instruction-driven skill

## Key Differences from turbodocx-wizard

- **Language-level** not framework-level (5 languages vs 17 framework-specific skills)
- **Covers both TurboSign AND TurboPartner** (wizard only covers TurboSign)
- **Includes PHP** (wizard does not)
- **No MCP server** — zero dependencies, purely instruction-driven
- **Single skill file** — simpler to maintain

## SDK Documentation

- SDK source: `/home/nicolas/repos/SDK/packages/`
- Public docs: https://docs.turbodocx.com
- Dashboard: https://app.turbodocx.com
