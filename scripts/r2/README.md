# NCI Dose Tools R2 release sync

This directory contains the private R2 upload service and the Mac-side sync client.

## Routine release sync

The upload token is stored in the macOS Keychain under the service name
`ncidosetools-r2-uploader`. From the repository root, run:

```bash
npm run r2:sync
```

By default the command syncs `~/ncidose_frontend/_release`. Pass another folder
after `--` when needed:

```bash
npm run r2:sync -- /absolute/path/to/releases
```

The sync is additive: it uploads new or changed files and skips objects whose
byte size and SHA-256 metadata match. It also builds four ZIP downloads for
the folders under `PHANTOM/nci_size` and places them at the top of that portal
folder. It never deletes R2 objects. `.DS_Store` and the legacy
`upload_to_r2.py` helper are excluded.

## Security

- The `ncidosetools` bucket remains private.
- The Worker rejects requests without the `UPLOAD_TOKEN` bearer secret.
- The token is stored only in Cloudflare Worker secrets and the macOS Keychain.
- Do not add the token to this repository or to shell history.

## Deploy an uploader update

After editing `worker.js`, deploy it with:

```bash
npm run r2:deploy-uploader
```

The deployed service is `ncidosetools-storage-admin` and is bound only to the
`ncidosetools` R2 bucket.
