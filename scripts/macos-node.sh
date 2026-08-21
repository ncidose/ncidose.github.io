#!/bin/sh

set -eu

node_version="${NCIDOSE_NODE_VERSION:-24.19.0}"

case "$(uname -s)" in
  Darwin) ;;
  *)
    printf '%s\n' "This helper supports macOS only." >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  arm64) node_arch="arm64" ;;
  x86_64) node_arch="x64" ;;
  *)
    printf 'Unsupported Mac architecture: %s\n' "$(uname -m)" >&2
    exit 1
    ;;
esac

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  if [ "$#" -eq 0 ]; then
    printf 'Using system Node: %s\n' "$(command -v node)"
    node --version
    npm --version
    exit 0
  fi
  exec "$@"
fi

cache_base="${XDG_CACHE_HOME:-$HOME/Library/Caches}/NCI Dose Tools/node"
distribution="node-v${node_version}-darwin-${node_arch}"
node_home="${cache_base}/${distribution}"

if [ ! -x "${node_home}/bin/node" ]; then
  archive="${distribution}.tar.gz"
  download_base="https://nodejs.org/dist/v${node_version}"
  temp_directory="$(mktemp -d "${TMPDIR:-/tmp}/ncidose-node.XXXXXX")"
  trap 'rm -rf "$temp_directory"' EXIT HUP INT TERM

  printf 'Downloading Node.js %s for macOS %s...\n' "$node_version" "$node_arch"
  curl --fail --location --retry 3 --output "${temp_directory}/${archive}" "${download_base}/${archive}"
  curl --fail --location --retry 3 --output "${temp_directory}/SHASUMS256.txt" "${download_base}/SHASUMS256.txt"

  expected_sha="$(awk -v archive="$archive" '$2 == archive { print $1 }' "${temp_directory}/SHASUMS256.txt")"
  actual_sha="$(shasum -a 256 "${temp_directory}/${archive}" | awk '{ print $1 }')"
  if [ -z "$expected_sha" ] || [ "$actual_sha" != "$expected_sha" ]; then
    printf '%s\n' "Node.js archive checksum verification failed." >&2
    exit 1
  fi

  tar -xzf "${temp_directory}/${archive}" -C "$temp_directory"
  mkdir -p "$cache_base"
  if [ ! -e "$node_home" ]; then
    mv "${temp_directory}/${distribution}" "$node_home"
  fi
  printf 'Cached verified Node.js at %s\n' "$node_home"
fi

PATH="${node_home}/bin:${PATH}"
export PATH

if [ "$#" -eq 0 ]; then
  printf 'Using cached Node: %s\n' "${node_home}/bin/node"
  node --version
  npm --version
  exit 0
fi

exec "$@"
