#!/usr/bin/env bash
# 実credential、R2、systemdを操作せず、R2 credential登録helperの安全契約だけを確認する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/ops/systemd/libexec/receipt-register-offsite-credentials"

test -f "${helper}"
bash -n "${helper}"

require_text() {
  local expected="$1"
  grep -Fq "${expected}" "${helper}" || {
    echo "[ERROR] R2 credential registration helper is missing: ${expected}" >&2
    exit 1
  }
}

for expected in \
  "[ \"\$(id -u)\" -eq 0 ]" \
  "usage: receipt-register-offsite-credentials {dev|stable}" \
  'IFS= read -r -s value' \
  'rclone obscure -' \
  'systemd-creds encrypt --name="${name}" - "${temporary}"' \
  'systemd-creds decrypt --name="${name}" "${temporary}" /dev/null' \
  'credential already exists:' \
  'no values were printed'; do
  require_text "${expected}"
done

if grep -Ev '^[[:space:]]*#' "${helper}" | grep -Eq '(^|[^A-Za-z_])\.env([^A-Za-z_]|$)|rclone obscure[[:space:]]+[^-[:space:]]'; then
  echo '[ERROR] R2 credential registration must not use dotenv or pass a crypt value as an rclone argument.' >&2
  exit 1
fi

echo '[OK] R2 credential registration contract is structurally valid.'
