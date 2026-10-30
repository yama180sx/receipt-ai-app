#!/usr/bin/env bash
# Issue #152: build/runtime imageのタグとmanifest digestを同時に固定する契約。
set -euo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly node_slim='node:22-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da'
readonly node_alpine='node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914'
readonly nginx_alpine='nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949'
readonly postgres='postgres:18@sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4'

require_line() {
  local file="$1"
  local expected="$2"

  if ! grep -Fxq "${expected}" "${repo_root}/${file}"; then
    echo "[ERROR] expected pinned image is missing: ${file}" >&2
    exit 1
  fi
}

for dockerfile in \
  backend/Dockerfile \
  backend/Dockerfile.runtime \
  backend/Dockerfile.runtime-macbook \
  frontend/Dockerfile \
  frontend/Dockerfile.runtime-dev; do
  require_line "${dockerfile}" "FROM ${node_slim}"
done

require_line frontend/Dockerfile.web "FROM ${node_alpine} AS builder"
require_line frontend/Dockerfile.web "FROM ${nginx_alpine}"
require_line docker-compose.yml "    image: ${postgres}"
require_line docker-compose.production.yml "    image: ${postgres}"

echo '[OK] build and runtime container images are pinned to manifest digests.'
