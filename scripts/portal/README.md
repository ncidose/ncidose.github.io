# Approved-user membership data

The Google Group export is transition data for the private portal. It must never be committed or shipped in the frontend bundle.

## Local storage

Save the current export as:

```text
.private/portal/ncidose.csv
```

`.private/` is ignored by Git. Check a new export with:

```bash
npm run portal:members:check
```

Only `member`, `manager`, and `owner` rows are eligible for portal access. `invited`, `pending`, banned, or unknown states are held for administrator review.

## Separate data sources

- The Google Group export is the operational user list for portal login and downloads during the transition.
- The executed-STA spreadsheet is not used to authenticate portal users. It remains the source for the public world-map totals and outreach reporting.
- A user may optionally add and verify an institutional email after signing in with the Gmail address used for the Google Group. This does not trigger an automatic match against the STA spreadsheet.

## Production design

The production importer will run behind administrator authentication and write to Cloudflare D1. Each import records a SHA-256 fingerprint and presents additions and removals before applying them. Removed group members are suspended rather than deleted so account and download history remain auditable.

The CSV file and the approved-email table must not be stored in Git, GitHub Pages, public R2 objects, or browser JavaScript.
