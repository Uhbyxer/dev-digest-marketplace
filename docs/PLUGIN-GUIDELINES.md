# Plugin guidelines

## Layout

```
plugins/<plugin-name>/
├── .claude-plugin/plugin.json
├── skills/<skill>/SKILL.md
├── commands/ agents/ hooks/hooks.json   (optional)
└── scripts/                             (not bin/)
```

## Rules

- Plugin directory name, `plugin.json` `name` and the `marketplace.json` entry `name` must be identical (kebab-case).
- `source` is relative to the repo root and starts with `./` (never `..`).
- Do not use reserved marketplace/plugin names (`anthropic-*`, `claude-*-official`, …).
- Put hooks in the plugin's own `hooks/hooks.json`, not in the marketplace entry.
- Do not use a top-level `bin/` directory; use `scripts/` and `${CLAUDE_PLUGIN_ROOT}/scripts/...`.
- Do not store plugin files in Git LFS.
- Set `version` only in `plugin.json`, and only via `scripts/release.sh`.
- Run `./scripts/validate.sh` before every PR.
