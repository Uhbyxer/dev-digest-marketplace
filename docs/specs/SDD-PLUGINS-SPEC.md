# SDD Plugins Specification

Status: Implemented (v1.0.0) · Scope: four new plugins under `plugins/`
Source: <https://github.com/Uhbyxer/dev-digest> (`.claude/agents`, `.claude/skills`, `evals/`)

## 1. Goal

Ship the Spec Driven Development (SDD) workflow from dev-digest as plugins.
The workflow lives in one plugin (`sdd-engineering`); everything reusable lives
in separate plugins that `sdd-engineering` depends on, so other plugins can
depend on them too.

## 2. Plugins and dependency graph

| Plugin | Provides | Depends on |
| :- | :- | :- |
| `engineering-paved-path` | React, Next.js, Fastify, architecture, testing and security skills | none |
| `research-tools` | Read-only agent `researcher` | none |
| `architecture-review` | Generalized agent `architecture-reviewer` | `engineering-paved-path` `^1.0.0` |
| `sdd-engineering` | Agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`; skill `run-plan` | the three plugins above, each `^1.0.0` |

```
sdd-engineering
├── engineering-paved-path  ^1.0.0
├── research-tools          ^1.0.0
└── architecture-review     ^1.0.0
    └── engineering-paved-path  ^1.0.0
```

Dependencies are declared in `sdd-engineering`'s `plugin.json` and resolved
against `<plugin>--v<version>` tags (see [RELEASES.md](../RELEASES.md)), so
`engineering-paved-path` and `research-tools` are released as `1.0.0` first, then
`architecture-review`, and `sdd-engineering` last.

## 3. What is included and what is not

Included: the four SDD agents, `run-plan`, `researcher`,
`architecture-reviewer`, the shared skills, evals and documentation.

Not carried over: product specs, secrets, cache, DevDigest-specific
instructions (paths, module names such as `reviewer-core`/`server`/`client`,
`CLAUDE.md`/`TESTING.md` references).

Source agents not in this release: `test-writer`, `doc-writer`. `run-plan`
steps that call them (and `pr-self-review`/`code-review`) become optional.

## 4. Layout

```
plugins/
├── engineering-paved-path/
│   ├── .claude-plugin/plugin.json
│   ├── README.md · CHANGELOG.md
│   └── skills/
│       ├── react-best-practices/       (+ examples.md)
│       ├── next-best-practices/        (+ topic .md files)
│       ├── fastify-best-practices/     (+ rules/)
│       ├── react-nextjs-architecture/  (+ references/)
│       ├── onion-architecture/         (+ references/)
│       ├── react-testing-library/
│       └── security/                   (+ checklists, examples, references)
├── research-tools/
│   ├── .claude-plugin/plugin.json
│   ├── README.md · CHANGELOG.md
│   └── agents/researcher.md
├── architecture-review/
│   ├── .claude-plugin/plugin.json
│   ├── README.md · CHANGELOG.md
│   └── agents/architecture-reviewer.md
└── sdd-engineering/
    ├── .claude-plugin/plugin.json      (declares the 3 dependencies)
    ├── README.md                       (how the pieces work together)
    ├── CHANGELOG.md                    (versions and releases)
    ├── agents/
    │   ├── spec-creator.md
    │   ├── implementation-planner.md
    │   ├── implementer.md
    │   └── plan-verifier.md
    ├── skills/
    │   └── run-plan/SKILL.md
```

Each plugin gets an entry in `.claude-plugin/marketplace.json` (own `name`,
`source`, `description`; owner is the marketplace owner; `version` only in
`plugin.json`) and a row in the root `README.md`.

## 5. Shared skills

Rule: a skill lives where its consumers can reach it.

- Needed by more than one plugin, or useful standalone: `engineering-paved-path`.
  Reached through a declared dependency, never copied.
- Used only by one workflow: inside that plugin's `skills/`.
- A plugin cannot reference files outside its own directory.

Skills are called through the plugin namespace, e.g.
`engineering-paved-path:react-best-practices`. Supporting scripts are located
via `${CLAUDE_SKILL_DIR}`, never `.claude/skills/`.

Source skills and their destination:

| Source skill | Destination |
| :- | :- |
| react-best-practices, next-best-practices, fastify-best-practices, react-nextjs-architecture, onion-architecture, react-testing-library, security | `engineering-paved-path` |
| engineering-insights, zod, typescript-expert, drizzle-orm-patterns, postgresql-table-design | not moved |
| dependency-checker, mermaid-diagram, pr-self-review | not in this release |

## 6. Agents

| Agent | Plugin | Role | Tools |
| :- | :- | :- | :- |
| `researcher` | `research-tools` | Answers a question from the repo and/or external sources; report only, never edits | Read, Grep, Glob, Bash, WebFetch, WebSearch |
| `architecture-reviewer` | `architecture-review` | Read-only boundary check, every finding cites file:line and the exact violating import | Read, Grep, Glob, Bash, Skill |
| `spec-creator` | `sdd-engineering` | Interviews the user, writes EARS feature specs; delegates research to `researcher` | Read, Grep, Glob, Write, AskUserQuestion, Agent |
| `implementation-planner` | `sdd-engineering` | Reviews the spec, asks questions, writes a Development Plan naming the skill per step | Read, Grep, Glob, Bash, Write, AskUserQuestion, Agent |
| `implementer` | `sdd-engineering` | Executes the plan step by step, applying the named skills | Read, Write, Edit, Bash, Glob, Grep, Skill |
| `plan-verifier` | `sdd-engineering` | Marks each plan step DONE / PARTIAL / NOT FOUND / DIVERGED with file evidence | Read, Glob, Grep, Bash |

`researcher` and `architecture-reviewer` are read-only by tool list. The
source `architecture-reviewer` checks onion-architecture boundaries between
`reviewer-core` and `server`; the plugin version is generalized to
configurable layer boundaries given as input (paths and rules), with the
`onion-architecture` skill as the default rule set.

## 7. Workflow

```
spec-creator → (user approves spec) → implementation-planner → (user approves plan)
  → run-plan <plan>:
      implementer → [plan-verifier ∥ architecture-reviewer]  (max 2 fix rounds)
```

- `run-plan` executes an approved plan: `implementer` (per module, parallel
  worktrees when the plan says multi-agent), then `plan-verifier` and
  `architecture-reviewer` in parallel. It never implements itself and never commits or pushes.
- `spec-creator` and `implementation-planner` run as the main agent so they
  can ask the user questions.

DevDigest paths (`docs/plans/`, `docs/specs/`, module names) are replaced with
explicit inputs, with a documented default for the plan and spec directories.

## 8. Documentation, versions, evals

- `sdd-engineering/README.md`: install, dependency graph, each agent's role,
  how `run-plan` orchestrates them, where artifacts go,
  a worked example.
- Every plugin has a `CHANGELOG.md` (Keep a Changelog), one section per
  release, written when running `scripts/release.sh`.
- Versions live only in each `plugin.json`; all four start at `1.0.0`.
- Evals are not moved in 1.0.0 (their fixtures are DevDigest-specific).
- Marketplace commit or tag after registration fixes the catalog state.

## 9. Decisions

- `workflow-retro` is not included (it does not exist in the source repo).
- `zod`, `typescript-expert`, `drizzle-orm-patterns`, `postgresql-table-design`,
  `engineering-insights` are not moved.
- `example-plugin` stays.
- `architecture-reviewer` input: a layer map in the task, else the project's
  architecture docs, else inferred and stated in the report.
- Artifact directories: specs in `docs/specs/`, plans in `docs/plans/`, both
  overridable per request.
