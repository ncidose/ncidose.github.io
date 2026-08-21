# NCI Dose Tools R2 release sync

This directory contains the private R2 upload service and the Mac-side sync client.

## Local Mac setup

Run all Cloudflare and R2 operations from the local Mac. NIH Helix, NIH VPN,
and remote shell sessions are not part of this workflow and must not be used as
deployment fallbacks.

The repository includes a macOS helper that uses an existing local Node.js
installation when available. Otherwise, it downloads the pinned official
Node.js archive, verifies its SHA-256 checksum, and keeps it under the user's
cache directory without installing system-wide packages:

```bash
./scripts/macos-node.sh npm ci
./scripts/macos-node.sh npx --yes wrangler@latest login
```

Wrangler login opens a browser and stores Cloudflare authentication locally.
It does not require NIH VPN access.

## Routine release sync

The upload token is stored only in the local macOS Keychain under the service
name `ncidosetools-r2-uploader`. The sync client deliberately has no remote-file
fallback. From the repository root, run:

```bash
./scripts/macos-node.sh npm run r2:sync
```

By default the command finds `_release` as the sibling of this website
repository, including when the frontend workspace path contains spaces. Pass
another folder after `--` when needed:

```bash
./scripts/macos-node.sh npm run r2:sync -- /absolute/path/to/releases
```

The sync is additive: it uploads new or changed files and skips objects whose
byte size and SHA-256 metadata match. It also builds private folder-download
archives for every nested folder under `PHANTOM/` and `DCC/`. The portal keeps
those archives out of the file browser and presents a consistent **Download
folder** action instead. It never deletes R2 objects. `.DS_Store` and the legacy
`upload_to_r2.py` helper are excluded. The local `_release/_archive` directory
is also excluded so historical installers remain only in the local archive and
are not republished to R2.

To rebuild and publish only the hidden PHANTOM and DCC folder downloads, run:

```bash
./scripts/macos-node.sh npm run r2:sync-folder-downloads
```

## Security

- The `ncidosetools` bucket remains private.
- The Worker rejects requests without the `UPLOAD_TOKEN` bearer secret.
- The token is stored only in the Cloudflare Worker secret and this Mac's
  Keychain.
- Do not add the token to this repository or to shell history.

To rotate the credential without exposing it in shell history, run locally:

```bash
./scripts/r2/rotate-upload-token.sh
```

The command updates this Mac's Keychain and the Worker secret together. It
refuses to run through SSH and restores the prior Keychain value if the
Cloudflare update fails. A successful rotation invalidates every older token,
including copies that may remain on remote hosts.

## Deploy an uploader update

After editing `worker.js`, deploy it with:

```bash
./scripts/macos-node.sh npm run r2:deploy-uploader
```

The deployed service is `ncidosetools-storage-admin` and is bound only to the
`ncidosetools` R2 bucket.

## PHANTOM working folder

The release-ready local copy of the R2 `PHANTOM/` folder is:

```text
/Users/leechoonsik/ choonsikdrive/ncidose_frontend/_release/PHANTOM
```

After updating the local folder, publish its new and changed files with:

```bash
./scripts/macos-node.sh npm run phantom:push
```

The push maps the local folder root to R2 `PHANTOM/`. It rebuilds the hidden
folder-download archives and does not delete remote objects.

When a PHANTOM release reorganizes or removes files, replace the remote folder
with an exact mirror of the local release:

```bash
./scripts/macos-node.sh npm run phantom:replace
```

Replacement uploads and verifies every local file and folder-download archive
before deleting stale objects under `PHANTOM/` and
`_folder-downloads/PHANTOM/`. The delete API is restricted to those two
prefixes. The command finishes with a second listing that verifies the remote
object set and byte sizes exactly match the local release.
