#!/bin/sh

# Sharp's wasm32 package declares `cpu: wasm32`, so npm skips it on an x64 host.
# This script is only for legacy Linux x64 CPUs that cannot run Sharp's x64-v2
# prebuilt binary. It installs the official packages into local node_modules and
# hides the incompatible native package so Sharp's own loader selects Wasm.
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

install_tarball() {
  package_name=$1
  package_version=$2
  target_dir=$3

  archive=$(cd "$WORK_DIR" && npm pack "${package_name}@${package_version}" --silent)
  mkdir -p "$target_dir"
  tar -xzf "$WORK_DIR/$archive" -C "$target_dir" --strip-components=1
}

install_tarball '@emnapi/runtime' '1.7.0' "$APP_DIR/node_modules/@emnapi/runtime"
install_tarball '@img/sharp-wasm32' '0.34.5' "$APP_DIR/node_modules/@img/sharp-wasm32"

native_dir="$APP_DIR/node_modules/@img/sharp-linux-x64"
if [ -d "$native_dir" ]; then
  mv "$native_dir" "$native_dir.disabled-for-legacy-cpu.$(date +%s)"
fi

node -e "require('sharp'); console.log('Sharp Wasm fallback: ready')"
