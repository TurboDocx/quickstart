# Skill Benchmark: turbodocx-quickstart (Iteration 2)

**Model**: claude-opus-4-6
**Date**: 2026-03-13T16:15:00Z
**Focus**: Framework-specific variants — testing frameworks NOT in reference files

## Summary

| Eval | with_skill | without_skill | Delta |
|------|-----------|---------------|-------|
| NestJS + TurboSign | 9/9 (100%) | 5/9 (56%) | +44% |
| Next.js App Router + TurboSign | 9/9 (100%) | 9/9 (100%) | +0% |
| Django + TurboPartner | 8/8 (100%) | 8/8 (100%) | +0% |
| Spring Boot + TurboSign | 8/8 (100%) | 6/8 (75%) | +25% |
| Laravel + TurboPartner | 8/8 (100%) | 5/8 (63%) | +37% |
| Gin + Both | 8/8 (100%) | 5/8 (63%) | +37% |
| **Average** | **100% +/- 0%** | **76% +/- 19%** | **+24%** |

## Key Findings

### with_skill: Perfect 100% across all frameworks
The skill correctly adapted to each framework's patterns despite reference files only showing Express, FastAPI, and net/http examples. No SKILL.md updates needed.

### without_skill failures by category

**SDK Configuration (most common failure)**
- NestJS: Used raw fetch() instead of `@turbodocx/sdk`, no `TurboSign.configure()`
- Laravel: Used HTTP wrapper instead of `TurboPartner::configure()` with SDK
- Gin: Wrong package name (`sdk-go` instead of `sdk`)

**Environment Variables**
- NestJS: Missing `TURBODOCX_SENDER_EMAIL` in .env
- Spring Boot: Env vars in application.properties with wrong format
- Laravel: Missing partner-specific env vars
- Gin: Incomplete env var set

**Context/Pattern Issues**
- Gin: Missing `context.Context` propagation in handlers

### Frameworks that passed without skill
- **Next.js** and **Django** passed 100% even without the skill
- The model has strong built-in knowledge of these frameworks' patterns
- These don't differentiate skill value as well

### Frameworks where skill adds most value
- **NestJS** (+44%): Decorator-based patterns are very different from Express
- **Laravel** (+37%): PHP SDK patterns are unfamiliar to the model
- **Gin** (+37%): Different handler signatures from net/http
- **Spring Boot** (+25%): Java SDK patterns need guidance

## Timing

| Config | Avg Time | Avg Tokens |
|--------|----------|------------|
| with_skill | 98.9s | 26,130 |
| without_skill | 111.1s | 28,813 |
| Delta | -12.2s | -2,683 |

with_skill runs are both faster and use fewer tokens — reference files prevent wrong turns.

## Conclusion

The skill achieves 100% on all 6 new framework variants without any reference file updates. The language-level reference approach (JS/Python/Go/PHP/Java) generalizes well to framework-specific patterns. No iteration 3 needed for framework coverage.

Combined with iteration 1 results (3 evals, 100% with_skill vs 52% without):
- **Total: 9 evals, 100% with_skill vs 66% without_skill, +34% delta**
