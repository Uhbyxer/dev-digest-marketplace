---
name: run-plan
description: Orchestrates implementation of an approved Development Plan with the SDD agents — implementer (per module, parallel worktrees in multi-agent mode), then plan-verifier, then architecture-reviewer. Use when the user says to run, execute or implement a plan, or types /run-plan <plan path>. Does not write code itself and never commits or pushes.
argument-hint: <path to the plan file>
---

# Run a Development Plan

Plan: `$ARGUMENTS` (if empty, use the most recent file in the plans directory,
default `docs/plans/`; ask if more than one is plausible). Delegate everything
to agents and relay concise results — do not implement, test or review yourself.

## Steps

1. **Read the plan** and its `Execution mode`. If single-agent, run one
   `implementer` on the whole plan, then continue at step 3.
2. **implementer** — split the steps by module. Independent modules go to
   separate `implementer` agents in parallel, each with `isolation: "worktree"`
   and told exactly which steps/module to do; merge the worktrees back
   afterwards. Dependent steps run sequentially. Never `git push`.
3. **Gate: plan-verifier and architecture-reviewer in parallel** — launch both
   in one message. Both are read-only.
   - `plan-verifier` (`sdd-engineering:plan-verifier`): pass the plan path and its spec.
   - `architecture-review:architecture-reviewer`: pass the changed file list, the
     spec's `AC-n` IDs, and the layer map if the project has one.
4. **Fix loop** — if the verifier reports PARTIAL, NOT FOUND or DIVERGED steps,
   or the reviewer reports critical findings, send them back to `implementer`,
   then re-run the affected gate agents (max 2 rounds). After that stop and ask
   the user.
5. **Summary** — verifier verdict, architecture findings count, test result,
   AC coverage, open flags. If everything is green, suggest moving the spec to
   `Status: implemented` (the user or `spec-creator` edits it). Do not commit
   or push unless asked.

Optional passes the project may add after step 4: test writing, bug/security
review (`engineering-paved-path:security`), documentation.
