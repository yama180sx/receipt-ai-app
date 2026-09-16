#!/usr/bin/env bash

set -euo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

declare -a forbidden_paths=(
  '.env'
  '.env.secret'
  'backend/.env'
  'frontend/.env'
)

failed=0

for path in "${forbidden_paths[@]}"; do
  if git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
    printf 'FAIL tracked-secret-file path=%s\n' "$path"
    failed=1
  else
    printf 'OK untracked-secret-file path=%s\n' "$path"
  fi
done

for path in "${forbidden_paths[@]}"; do
  if git check-ignore -q -- "$path"; then
    printf 'OK ignored-secret-file path=%s\n' "$path"
  else
    printf 'FAIL unignored-secret-file path=%s\n' "$path"
    failed=1
  fi
done

if (( failed != 0 )); then
  exit 1
fi

printf 'OK secret-safety-static-check\n'
