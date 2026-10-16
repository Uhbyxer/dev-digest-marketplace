#!/usr/bin/env bash
# Validate the marketplace and every plugin listed in it.
set -euo pipefail
cd "$(dirname "$0")/.."

claude plugin validate .
for dir in plugins/*/; do
  claude plugin validate "$dir"
done
