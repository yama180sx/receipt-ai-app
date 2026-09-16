#!/usr/bin/env bash
# 実credential・systemd・Dockerを使わず、runtime秘密ファイルの配置契約を検証する。
set -euo pipefail

temporary_directory="$(mktemp -d)"
trap 'rm -rf -- "${temporary_directory}"' EXIT

source_file="${temporary_directory}/source"
target_file="${temporary_directory}/target"
target_directory="${temporary_directory}/target-directory"

printf 'synthetic-value\n' > "${source_file}"
install -T -m 0444 "${source_file}" "${target_file}"

test -f "${target_file}"
test ! -d "${target_file}"
test "$(stat -c '%a' "${target_file}")" = '444'

install -d "${target_directory}"
if install -T -m 0444 "${source_file}" "${target_directory}" 2>/dev/null; then
  echo '[ERROR] credential staging accepted a directory target' >&2
  exit 1
fi

echo '[OK] runtime secret staging contract is valid.'
