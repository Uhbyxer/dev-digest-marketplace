# architecture-review

Provides the read-only `architecture-reviewer` agent. It checks dependency
direction between layers and reports each violation with `file:line` and the
exact import.

Give it a layer map (which paths are domain core, application, adapters,
composition root) in the task, or let it read the project's architecture docs;
otherwise it infers one and says so. Default rules come from
`engineering-paved-path:onion-architecture`; this plugin depends on
`engineering-paved-path` `^1.0.0` for it.

## Install

```
/plugin install architecture-review@dev-digest-marketplace
```
