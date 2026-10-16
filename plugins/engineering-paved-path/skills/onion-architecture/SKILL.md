---
name: onion-architecture
description: "Enforces Onion / Hexagonal / Clean Architecture dependency direction in backend code. Use when writing or reviewing code that adds a dependency to a domain or application layer (fs, a DB driver, an HTTP client, an SDK, a web framework type), when adding a repository, adapter, port or interface, when deciding where validation or business logic belongs, or when asked whether something 'belongs in the domain', 'leaks infrastructure' or 'needs a port'. Review-time guidance, not a lint rule."
---

# Onion Architecture

Dependencies point inward only. Business logic must never depend on
infrastructure; infrastructure depends on it. Background and sources:
[references/fundamentals.md](references/fundamentals.md).

## Layer map first

Before judging a file, identify its ring. Take the layer map from the
project's own docs (architecture doc, `CLAUDE.md`, ADRs) or from the task
input. If none exists, infer it from the folder layout and state your
assumption. Typical rings, innermost first:

1. **Domain core** — pure logic and types. No I/O.
2. **Application** — orchestration/services. Depends on interfaces (ports) only.
3. **Infrastructure** — adapters, repositories, DB schema, SDK wrappers.
4. **Outermost** — HTTP routes, framework glue, and the composition root that wires concrete implementations.

## Rules

- An inner ring never imports an outer ring's concrete type. Flag the
  direction of the import, not its mere existence: an adapter importing a
  domain interface to implement it is correct.
- The domain core must not import `fs`, DB drivers, ORMs, HTTP clients,
  vendor SDKs or web-framework types. Anything it needs from outside is
  injected as a parameter, callback or port.
- Application services call repositories and adapters through interfaces,
  never an ORM, driver or SDK directly. Only the composition root and the
  adapter implementations may import concrete infrastructure.
- Validate untrusted input once, at the outer boundary (route/handler).
  Inner code trusts the parsed type.
- Add a port only when it has more than one implementation, protects an
  inner ring, or makes testing by substitution possible. Otherwise it is
  overengineering (see fundamentals.md).
- Do not invent stricter layering than the project has adopted.

## Quick decision guide

| Question | Default answer |
| :- | :- |
| New dependency (fs, DB, HTTP, SDK) inside the domain core? | No. Inject it through a port. |
| Query needed in a service? | Add or extend a repository function; the service calls the interface. |
| New external system? | Define an interface in the inner ring, implement it as an adapter, wire it in the composition root. |
| Logic is pure and reusable? | It belongs in the domain core. |
| Logic orchestrates repo + adapter + response shaping? | It stays in the application layer. |

## Reporting

Every finding cites `file:line` and the exact violating import or dependency,
and names the rule above that it breaks.
