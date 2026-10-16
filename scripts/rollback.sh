#!/usr/bin/env bash
# Roll a plugin back to an earlier release by rolling FORWARD: the plugin files
# are restored from the old tag and published as a new, higher patch version.
#
# Claude Code only updates users when the computed version changes, and users
# already on the bad version must move off it, so history is never rewritten
# and the version never goes down.
#
# Usage: scripts/rollback.sh <plugin> <good-version> [--push] [--dry-run]
#   <good-version>  an existing release of the plugin, e.g. 1.2.0
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib.sh

plugin="" good="" push=false dry_run=false
for arg in "$@"; do
  case "$arg" in
    --push) push=true ;;
    --dry-run) dry_run=true ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) if [[ -z "$plugin" ]]; then plugin="$arg"; elif [[ -z "$good" ]]; then good="${arg#v}"; else die "unexpected argument '$arg'"; fi ;;
  esac
done
[[ -n "$plugin" && -n "$good" ]] || die "usage: scripts/rollback.sh <plugin> <good-version> [--push] [--dry-run]"

require_tools
require_plugin "$plugin"
is_semver "$good" || die "'$good' is not a valid X.Y.Z version"
require_clean_main

good_tag="$(tag_name "$plugin" "$good")"
git rev-parse -q --verify "refs/tags/$good_tag" >/dev/null || die "tag $good_tag does not exist (see: git tag -l '$plugin--v*')"

current="$(current_version "$plugin")"
next="$(bump_version "$current" patch)"
tag="$(tag_name "$plugin" "$next")"
git rev-parse -q --verify "refs/tags/$tag" >/dev/null && die "tag $tag already exists"

echo "Rolling back $plugin: restoring files from $good_tag, publishing as v$next (current: v$current)"
if $dry_run; then echo "dry run: no changes made"; exit 0; fi

dir="plugins/$plugin"
# Replace the plugin directory with its contents at the good tag.
git rm -r -q --ignore-unmatch "$dir"
rm -rf "$dir"
git checkout "$good_tag" -- "$dir"
set_version "$plugin" "$next"
git add "$dir"

if ! validate_all >/dev/null; then
  git reset -q --hard HEAD
  die "validation failed; rollback aborted and working tree restored"
fi

git commit -m "rollback($plugin): restore v$good as v$next"
git tag -a "$tag" -m "$plugin v$next (rollback to v$good)"

if $push; then
  git push origin main "$tag"
  echo "Pushed. Users get it via: /plugin marketplace update dev-digest-marketplace"
else
  echo "Created commit and tag locally. Publish with: git push origin main $tag"
fi
