# Approved-user membership data

The Google Group export is transition data for the private portal. It must never be committed or shipped in the frontend bundle.

## Local deployment

Portal builds and Cloudflare Worker deployments run from the local Mac. NIH
Helix, NIH VPN, and remote shell sessions are not required or supported as
fallbacks. From the repository root:

```bash
./scripts/macos-node.sh npm ci
./scripts/macos-node.sh npx --yes wrangler@latest login
./scripts/macos-node.sh npm run portal:api:deploy
```

Wrangler authentication is stored locally after the browser login. Keep Worker
secrets in Cloudflare and local credentials in the macOS Keychain; do not copy
them to remote hosts.

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
- The STA status spreadsheet is not used to authenticate portal users. It remains the source for the public world-map totals and outreach reporting. The map combines pending, executed, withdrawn, and closed records and counts each agreement number only once.
- A user may optionally add one secondary work or personal email after signing in with the address already linked to the account. The added address is stored as pending and becomes verified when the user signs in with a one-time portal code sent to that address.
- For newly executed STAs, an administrator registers the email copied on the NCI Technology Transfer approval message. The recipient can use that email immediately and may link one additional verified address later.
- Users may optionally maintain their full name, institution, and country in Account. These fields update the private administrator directory only and do not alter STA approval or public world-map data.
- The Worker sends six-digit, ten-minute login codes through Resend only to active emails linked in D1. Successful verification creates a hashed, revocable portal session in an HttpOnly cookie. Cloudflare Access remains enabled only during the migration and can be removed after the portal email flow is verified.

## Production design

The production importer will run behind administrator authentication and write to Cloudflare D1. Each import records a SHA-256 fingerprint and presents additions and removals before applying them. Removed group members are suspended rather than deleted so account and download history remain auditable.

The CSV file and the approved-email table must not be stored in Git, GitHub Pages, public R2 objects, or browser JavaScript.

## World-map update

Place the newest `STA Status Spreadsheet ... .xlsx` file in
`~/ncidose_frontend/_release`, then run:

```bash
npm run worldmap:update
```

The August 6, 2026 aggregate and hashed agreement-number set are the fixed
baseline. The updater adds only agreement numbers that were not in that
baseline, regardless of which status worksheet contains them. Country is
inferred from the institution and email domain; when it cannot be inferred,
the record is assigned to the United States for this approximate public map.
Only country-level totals are generated in `src/data/worldMap.ts`; workbook
names, email addresses, institutions, and agreement numbers are not shipped to
the public site.

## Portal authentication

- `AUTH_SECRET` is a Worker secret used to HMAC login codes, IP rate-limit keys, and session tokens. Never store it in Git or in a plaintext Wrangler variable.
- Login codes expire after 10 minutes, are single-use, and allow five verification attempts.
- Code requests are limited per email and per connecting IP.
- Portal sessions expire after 30 days. Suspending a user revokes all of that user's sessions immediately.
- Primary and verified secondary identities authenticate the same D1 user account.
