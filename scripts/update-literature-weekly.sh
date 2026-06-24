#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="/Users/choonsiklee/Sites/ncidose.github.io"
NPM="/opt/homebrew/bin/npm"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/literature-update.log"
LOCK_DIR="$LOG_DIR/literature-update.lock"
SSH_KEY="/Users/choonsiklee/.ssh/github_ncidose_ed25519"

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

  cd "$PROJECT_DIR"

  if [[ -n "$(git status --porcelain)" ]]; then
    printf '[%s] Working tree is not clean; refusing to auto-commit\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    git status --short
    exit 1
  fi

  git fetch origin main
  git merge --ff-only origin/main

  "$NPM" run literature:update
  "$NPM" run publish:root

  if git diff --quiet -- public/literature.json literature.json; then
    printf '[%s] No literature data changes to commit\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    exit 0
  fi

  git add public/literature.json literature.json
  git commit -m "Update literature data"
  git push origin main

  printf '[%s] Finished NCI Dose Tools literature update\n' "$(date '+%Y-%m-%d %H:%M:%S')"
} >>"$LOG_FILE" 2>&1
