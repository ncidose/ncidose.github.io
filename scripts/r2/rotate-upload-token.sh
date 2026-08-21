#!/bin/sh

set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  printf '%s\n' "Run this credential rotation on the local Mac." >&2
  exit 1
fi

if [ -n "${SSH_CONNECTION:-}" ] || [ -n "${SSH_TTY:-}" ]; then
  printf '%s\n' "Remote sessions are not supported. Run this directly on the local Mac." >&2
  exit 1
fi

script_directory="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repository_root="$(CDPATH= cd -- "${script_directory}/../.." && pwd)"
keychain_service="ncidosetools-r2-uploader"
keychain_account="${USER:-$(id -un)}"

had_previous=false
previous_token=""
if previous_token="$(security find-generic-password -a "$keychain_account" -s "$keychain_service" -w 2>/dev/null)"; then
  had_previous=true
fi

new_token="$(openssl rand -hex 32)"
security add-generic-password -U -a "$keychain_account" -s "$keychain_service" -w "$new_token" >/dev/null

if ! printf '%s\n' "$new_token" | "${repository_root}/scripts/macos-node.sh" \
  npx --yes wrangler@latest secret put UPLOAD_TOKEN \
  --config "${repository_root}/scripts/r2/wrangler.jsonc"; then
  if [ "$had_previous" = true ]; then
    security add-generic-password -U -a "$keychain_account" -s "$keychain_service" -w "$previous_token" >/dev/null
  else
    security delete-generic-password -a "$keychain_account" -s "$keychain_service" >/dev/null 2>&1 || true
  fi
  printf '%s\n' "Cloudflare update failed; the prior local Keychain state was restored." >&2
  exit 1
fi

new_token=""
previous_token=""
unset new_token previous_token
printf '%s\n' "R2 uploader credential rotated in Cloudflare and this Mac's Keychain."
