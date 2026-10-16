# Shared helpers for release.sh and rollback.sh. Source this file; do not run it.

die() { echo "error: $*" >&2; exit 1; }

require_tools() {
  for tool in git jq claude; do
    command -v "$tool" >/dev/null || die "'$tool' is required but not installed"
  done
}

repo_root() { git rev-parse --show-toplevel; }

# Fail unless the working tree is clean and we are on the main branch.
require_clean_main() {
  [[ -z "$(git status --porcelain)" ]] || die "working tree is not clean; commit or stash first"
  [[ "$(git rev-parse --abbrev-ref HEAD)" == "main" ]] || die "releases must be cut from the 'main' branch"
}

plugin_manifest() { echo "plugins/$1/.claude-plugin/plugin.json"; }

require_plugin() {
  [[ -f "$(plugin_manifest "$1")" ]] || die "unknown plugin '$1' (no $(plugin_manifest "$1"))"
}

# Current version from plugin.json, or 0.0.0 when the field is absent.
current_version() { jq -r '.version // "0.0.0"' "$(plugin_manifest "$1")"; }

is_semver() { [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; }

# bump_version <current> <major|minor|patch>
bump_version() {
  local major minor patch
  IFS=. read -r major minor patch <<<"$1"
  case "$2" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *) die "unknown bump '$2' (use major, minor, patch or an explicit X.Y.Z)" ;;
  esac
}

# set_version <plugin> <version>
set_version() {
  local manifest tmp
  manifest="$(plugin_manifest "$1")"
  tmp="$(mktemp)"
  jq --arg v "$2" '.version = $v' "$manifest" >"$tmp" && mv "$tmp" "$manifest"
}

tag_name() { echo "$1--v$2"; }

validate_all() { ./scripts/validate.sh; }
