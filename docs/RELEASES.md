# Releases

Users receive a plugin update only when its computed version changes, so every
release (and every rollback) must produce a new version.

## Versioning strategy

This marketplace pins versions: each plugin sets `version` in its own
`plugin.json` (semver) and nothing else does. Never set `version` in both
`plugin.json` and the `marketplace.json` entry; `plugin.json` silently wins.

Release tags use the `<plugin>--v<version>` format (for example
`example-plugin--v1.2.0`). Claude Code resolves plugin dependency version
ranges against these tags.

## Cut a release

```bash
scripts/release.sh <plugin> <major|minor|patch|X.Y.Z> [--push] [--dry-run]
```

The script requires a clean `main`, bumps `version` in `plugin.json`, runs
`scripts/validate.sh` (reverting the bump if it fails), then commits
`release(<plugin>): vX.Y.Z` and creates the annotated tag. Without `--push` it
stays local so you can inspect it; publish with
`git push origin main <plugin>--vX.Y.Z`.

Users pick it up with `/plugin marketplace update dev-digest-marketplace`
(or automatically if they enabled auto-update).

## Roll back a bad release

```bash
scripts/rollback.sh <plugin> <good-version> [--push] [--dry-run]
```

Rollback rolls **forward**: the plugin directory is restored from the
`<plugin>--v<good-version>` tag and published as a new, higher patch version
(for example 1.0.1 is bad, 1.0.0 is good, so the result is 1.0.2 with the
1.0.0 contents). Git history is never rewritten and the version never goes
down, so users already on the bad version are moved off it.

List available releases with `git tag -l '<plugin>--v*'`.

If a release is dangerous, roll back first, then investigate.

## Renaming or removing a plugin

Add it to `renames` in `.claude-plugin/marketplace.json` (`"old": "new"`, or
`"old": null` for a removed plugin). Treat `renames` as append-only history.
Set `forceRemoveDeletedPlugins: true` only if removed plugins should be
uninstalled from users' machines.

## Checklist

1. `scripts/validate.sh` passes
2. `scripts/release.sh <plugin> <bump>`
3. Review the commit and tag, then `git push origin main <tag>`
4. Verify: `/plugin marketplace update dev-digest-marketplace`, then install
