#!/usr/bin/env bash
# Cut a release of one plugin: bump version, validate, commit and tag.
#
# Usage: scripts/release.sh <plugin> <major|minor|patch|X.Y.Z> [--push] [--dry-run]
#
# Tags use the "<plugin>--v<version>" convention that Claude Code resolves
# plugin dependency version ranges against.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib.sh

plugin="" bump="" push=false dry_run=false
for arg in "$@"; do
  case "$arg" in
    --push) push=true ;;
    --dry-run) dry_run=true ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) if [[ -z "$plugin" ]]; then plugin="$arg"; elif [[ -z "$bump" ]]; then bump="$arg"; else die "unexpected argument '$arg'"; fi ;;
  esac
done
[[ -n "$plugin" && -n "$bump" ]] || die "usage: scripts/release.sh <plugin> <major|minor|patch|X.Y.Z> [--push] [--dry-run]"

require_tools
require_plugin "$plugin"
require_clean_main

current="$(current_version "$plugin")"
if is_semver "$bump"; then next="$bump"; else next="$(bump_version "$current" "$bump")"; fi
is_semver "$next" || die "'$next' is not a valid X.Y.Z version"

tag="$(tag_name "$plugin" "$next")"
git rev-parse -q --verify "refs/tags/$tag" >/dev/null && die "tag $tag already exists"

echo "Releasing $plugin: $current -> $next (tag $tag)"
if $dry_run; then echo "dry run: no changes made"; exit 0; fi

set_version "$plugin" "$next"
if ! validate_all >/dev/null; then
  git checkout -- "$(plugin_manifest "$plugin")"
  die "validation failed; version bump reverted"
fi

git add "$(plugin_manifest "$plugin")"
git commit -m "release($plugin): v$next"
git tag -a "$tag" -m "$plugin v$next"

if $push; then
  git push origin main "$tag"
  echo "Pushed. Users get it via: /plugin marketplace update dev-digest-marketplace"
else
  echo "Created commit and tag locally. Publish with: git push origin main $tag"
fi
