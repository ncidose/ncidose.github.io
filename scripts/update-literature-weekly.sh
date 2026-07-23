#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="/Users/choonsiklee/Sites/ncidose.github.io"
NPM="/opt/homebrew/bin/npm"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/literature-update.log"
LOCK_DIR="$LOG_DIR/literature-update.lock"
SSH_KEY="/Users/choonsiklee/.ssh/github_ncidose_ed25519"
REPOSITORY="git@github.com:ncidose/ncidose.github.io.git"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export GIT_SSH_COMMAND="ssh -F /dev/null -i $SSH_KEY -o IdentitiesOnly=yes"

mkdir -p "$LOG_DIR"

{
  printf '\n[%s] Starting NCI Dose Tools literature update\n' "$(date '+%Y-%m-%d %H:%M:%S')"

  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    printf '[%s] Another literature update is already running; exiting\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    exit 0
  fi
  trap 'rmdir "$LOCK_DIR"' EXIT

  UPDATE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ncidose-literature-update.XXXXXX")"
  trap 'rm -rf "$UPDATE_DIR"; rmdir "$LOCK_DIR"' EXIT

  git clone --depth 1 --branch main "$REPOSITORY" "$UPDATE_DIR"
  cd "$UPDATE_DIR"

  "$NPM" ci
  "$NPM" run literature:update
  cp public/literature.json literature.json

  if git diff --quiet -- public/literature.json literature.json; then
    printf '[%s] No literature data changes to commit\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    exit 0
  fi

  git add public/literature.json literature.json
  git commit -m "Update literature data"
  git push origin main

  printf '[%s] Finished NCI Dose Tools literature update\n' "$(date '+%Y-%m-%d %H:%M:%S')"
} >>"$LOG_FILE" 2>&1
