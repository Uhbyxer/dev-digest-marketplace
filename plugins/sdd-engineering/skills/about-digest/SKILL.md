---
name: about-digest
description: Explains the Dev Digest SDD workflow and which piece to use when — spec-creator, implementation-planner, implementer, plan-verifier, run-plan. Use when the user asks what sdd-engineering does, where to start, or which agent or skill fits their situation.
---

# About Dev Digest SDD

Spec Driven Development: spec → plan → build → verify. Each step has one
piece; pick by what the user already has.

| Situation | Use |
| :- | :- |
| New feature, only an idea or design | `spec-creator` — interviews, writes a spec with `AC-n` criteria |
| Approved spec, issue or task, no plan yet | `implementation-planner` — writes a Development Plan |
| Approved plan, want it built end to end | `/sdd-engineering:run-plan <plan path>` |
| Approved plan, want to build only (no review) | `implementer` |
| Code finished, check it against the plan | `plan-verifier` |
| Want a boundary or layering review | `architecture-reviewer` (from `architecture-review`) |
| Need facts from docs or the codebase | `researcher` (from `research-tools`) |

## Rules of thumb

- Start at the earliest missing artifact; do not skip approval gates between spec and plan, or plan and build.
- `spec-creator` and `implementation-planner` never write application code; `implementer` never writes specs or plans.
- `plan-verifier` checks completeness only; quality, architecture and security go to `architecture-reviewer`.
- Nothing here commits or pushes; the user does that.

Briefly tell the user which piece fits their situation and why, then offer to start it.
