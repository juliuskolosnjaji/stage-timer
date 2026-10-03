#!/usr/bin/env bash
set -euo pipefail

version="${1:?Usage: package-release.sh VERSION NODE_VERSION}"
node_version="${2:?Usage: package-release.sh VERSION NODE_VERSION}"
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
dist_dir="$root_dir/dist"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

mkdir -p "$dist_dir"
rm -f "$dist_dir"/stage-timer-*.zip "$dist_dir"/stage-timer-*.tar.gz

copy_app() {
  local destination="$1"
  mkdir -p "$destination/app"
  cp "$root_dir/server.js" "$root_dir/timer.js" "$root_dir/dmx.js" \
    "$root_dir/package.json" "$root_dir/README.md" "$destination/app/"
  cp -R "$root_dir/public" "$root_dir/fixtures" "$destination/app/"
}

download_node() {
  local platform="$1"
  local archive="node-v${node_version}-${platform}.tar.gz"
  curl --fail --location --silent --show-error \
    "https://nodejs.org/dist/v${node_version}/${archive}" \
    --output "$work_dir/$archive"
  tar -xzf "$work_dir/$archive" -C "$work_dir"
  printf '%s\n' "$work_dir/node-v${node_version}-${platform}"
}

package_unix() {
  local platform="$1"
  local architecture="$2"
  local launcher="$3"
  local archive_platform="$4"
  local bundle_name="Stage-Timer-${version}-${platform}-${architecture}"
  local bundle_dir="$work_dir/$bundle_name"
  local runtime_dir

  runtime_dir="$(download_node "$launcher-$architecture")"
  copy_app "$bundle_dir"
  mkdir -p "$bundle_dir/runtime/bin"
  cp "$runtime_dir/bin/node" "$bundle_dir/runtime/bin/node"
  cp "$runtime_dir/LICENSE" "$bundle_dir/runtime/LICENSE-node.txt"

  if [[ "$platform" == "macOS" ]]; then
    cat > "$bundle_dir/Start Stage Timer.command" <<'LAUNCHER'
#!/bin/sh
set -eu
base_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$base_dir/app"
(sleep 1; open "http://localhost:8181") &
exec "$base_dir/runtime/bin/node" server.js
LAUNCHER
    chmod +x "$bundle_dir/Start Stage Timer.command"
  else
    cat > "$bundle_dir/start-stage-timer.sh" <<'LAUNCHER'
#!/bin/sh
set -eu
base_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$base_dir/app"
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1; xdg-open "http://localhost:8181" >/dev/null 2>&1) &
fi
exec "$base_dir/runtime/bin/node" server.js
LAUNCHER
    chmod +x "$bundle_dir/start-stage-timer.sh"
  fi

  tar -czf "$dist_dir/stage-timer-${version}-${archive_platform}-${architecture}.tar.gz" \
    -C "$work_dir" "$bundle_name"
}

package_windows() {
  local bundle_name="Stage-Timer-${version}-Windows-x64"
  local bundle_dir="$work_dir/$bundle_name"
  local archive="node-v${node_version}-win-x64.zip"

  curl --fail --location --silent --show-error \
    "https://nodejs.org/dist/v${node_version}/${archive}" \
    --output "$work_dir/$archive"
  unzip -q "$work_dir/$archive" -d "$work_dir"
  copy_app "$bundle_dir"
  mkdir -p "$bundle_dir/runtime"
  cp "$work_dir/node-v${node_version}-win-x64/node.exe" "$bundle_dir/runtime/node.exe"
  cp "$work_dir/node-v${node_version}-win-x64/LICENSE" "$bundle_dir/runtime/LICENSE-node.txt"
  cat > "$bundle_dir/Start Stage Timer.bat" <<'LAUNCHER'
@echo off
cd /d "%~dp0app"
start "" "http://localhost:8181"
"%~dp0runtime\node.exe" server.js
pause
LAUNCHER
  (cd "$work_dir" && zip -qr "$dist_dir/stage-timer-${version}-windows-x64.zip" "$bundle_name")
}

package_windows
package_unix "Linux" "x64" "linux" "linux"
package_unix "macOS" "x64" "darwin" "macos"
package_unix "macOS" "arm64" "darwin" "macos"

printf 'Created release archives in %s\n' "$dist_dir"
