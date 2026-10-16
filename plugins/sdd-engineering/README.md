# sdd-engineering

Spec Driven Development workflow for Claude Code: write a spec, plan it, build
it, verify it.

## Install

```
/plugin marketplace add Uhbyxer/dev-digest-marketplace
/plugin install sdd-engineering@dev-digest-marketplace
```

The three dependencies below are installed automatically.

## Dependencies

| Plugin | Range | Provides |
| :- | :- | :- |
| `engineering-paved-path` | `^1.0.0` | Skills the agents apply (React, Next.js, Fastify, architecture, testing, security) |
| `research-tools` | `^1.0.0` | `researcher` agent |
| `architecture-review` | `^1.0.0` | `architecture-reviewer` agent (itself depends on `engineering-paved-path`) |

## Pieces

| Piece | Type | Role |
| :- | :- | :- |
| `spec-creator` | agent | Interviews you, writes an EARS spec with `AC-n` criteria; delegates research to `researcher` |
| `implementation-planner` | agent | Reviews the spec, asks questions (delegates research to `researcher`), writes a Development Plan naming the skill per step |
| `implementer` | agent | Executes the plan step by step with targeted tests |
| `plan-verifier` | agent | Marks each plan step DONE / PARTIAL / NOT FOUND / DIVERGED |
| `run-plan` | skill | Orchestrates implementer, then plan-verifier and architecture-reviewer in parallel |
| `researcher`, `architecture-reviewer` | agents (dependencies) | Research and boundary review |

## Workflow

```
spec-creator → (you approve spec) → implementation-planner → (you approve plan)
  → /sdd-engineering:run-plan <plan>
      implementer → [plan-verifier ∥ architecture-reviewer] (max 2 fix rounds)
```

Run `spec-creator` and `implementation-planner` as the main agent so they can
ask you questions directly:

```
claude --agent sdd-engineering:spec-creator
claude --agent sdd-engineering:implementation-planner
```

## Where files go

| Artifact | Default location | Override |
| :- | :- | :- |
| Specs | `docs/specs/<slug>.md` | Tell `spec-creator` another directory |
| Plans | `docs/plans/<slug>.md` | Tell `implementation-planner` another directory |

## Worked example

1. `spec-creator`: "Spec a CSV export for the reports page" → `docs/specs/csv-export.md` (SPEC-01, AC-1…AC-4). You approve it.
2. `implementation-planner`: "Plan SPEC-01" → asks questions and single- vs multi-agent → `docs/plans/csv-export.md`.
3. `/sdd-engineering:run-plan docs/plans/csv-export.md` → implementation, verification, architecture check, summary.

## Versions

See [CHANGELOG.md](CHANGELOG.md). Release with `scripts/release.sh`; the
dependencies must be released before `sdd-engineering` (see
[docs/RELEASES.md](../../docs/RELEASES.md)).
