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

Before deploying administrator secondary-email changes, run the offline SQLite
integration checks with the pinned Mac Node runtime (Node 24):

```bash
./scripts/macos-node.sh node --test scripts/portal/secondary-email.test.mjs
```

These use an in-memory database and mocked email delivery to check identity
replacement, re-verification, session revocation, duplicate addresses,
administrator authorization, transaction rollback, and delivery failure.

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
- Community discussion and administrator announcement email notifications default to enabled and can be controlled separately in Account. Turning either off affects email only; discussions and announcements remain available in the Portal. Sign-in codes and essential account or security mail are always sent, and private Team-only conversation notifications remain limited to the author and NCI Dose Team.
- The Worker sends six-digit, ten-minute login codes through Resend only to active emails linked in D1. Successful verification creates a hashed, revocable portal session in an HttpOnly cookie. Cloudflare Access remains enabled only during the migration and can be removed after the portal email flow is verified.

## Production design

The production importer will run behind administrator authentication and write to Cloudflare D1. Each import records a SHA-256 fingerprint and presents additions and removals before applying them. Removed group members are suspended rather than deleted so account and download history remain auditable.

The CSV file and the approved-email table must not be stored in Git, GitHub Pages, public R2 objects, or browser JavaScript.

## Scientific update subscriptions

The homepage's compact top-right **Stay updated** button opens the subscription
form. STA preparation/confirmation screens and Kevin Chang commercial
licensing sections offer an optional public email subscription. Registration
creates a pending `public_subscribers` record, sends a confirmation link, and
sends a welcome email after confirmation. These records are independent of
`users`, STA approval, commercial licensing, and portal login permissions.

Administrators manage this list in **Admin → Subscribers**, including email
search, status filters, registration source, unsubscribe, and recent mail status.
An administrator cannot activate an unconfirmed address. Subscribers can stop
mail through the unsubscribe link in each email without signing in.

In **Admin → Announcements**, select **Scientific Update** and enable **Email
scientific update subscribers when publishing**. Generic Release, Maintenance,
Access, draft, and historical imported announcements cannot email this list.
Publishing a version-history Markdown edit alone does not send email. Approved
user email is a separate option; select both before publishing to notify both
lists. The accepted approved-user recipient snapshot is excluded from public
mail to avoid duplicate emails. Public-mail content and recipients are frozen
when queued; editing the announcement does not send it again or add later
subscribers to an old campaign.

Public confirmation, welcome, and scientific messages use the existing Resend
sender/API key with a separate D1 mail queue; no new Resend segment is required.
The Worker cron drains up to 20 messages each minute, rechecks subscription
status before sending, and retries transient failures. Requests use stable
[Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
and frozen payloads; retries stop after five attempts or 12 hours from the first
attempt, within the provider's 24-hour deduplication window. “Sent” means the
email provider accepted the message, not confirmation of inbox delivery.

Before deploying this feature, apply migration 0018 to the existing database
(after 0017), then deploy the Worker including its cron trigger, then the public
site. Existing `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, and
`ALLOWED_ORIGINS` settings are reused. For an already-initialized database:

```bash
./scripts/macos-node.sh npx wrangler d1 execute ncidosetools-portal --remote --config scripts/portal/wrangler.jsonc --file scripts/portal/migrations/0018_add_scientific_subscribers.sql
./scripts/macos-node.sh node --test scripts/portal/subscriptions.test.mjs
```

The integration tests use in-memory SQLite and mock all outgoing email. They
cover confirmation/expiry, welcome deduplication, unsubscribe, rate limits,
admin permissions, scientific-only filtering, cross-list deduplication, retries,
and preservation of portal access boundaries.

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

## Literature update

`.github/workflows/update-literature.yml` refreshes `public/literature.json`
every Monday at 9:00 AM America/New_York time. GitHub Actions cron uses UTC, so
the workflow checks both Eastern Time offsets and proceeds only when the local
hour is 09. It runs `npm run literature:update`, commits the generated JSON to
`main`, builds the site, and deploys the refreshed GitHub Pages artifact in the
same workflow run.

The same workflow can be started manually from the GitHub Actions page when an
out-of-cycle refresh is needed. The former macOS launchd plist is no longer
used; `scripts/update-literature-weekly.sh` remains only as a local recovery
tool.

## Portal authentication

- `AUTH_SECRET` is a Worker secret used to HMAC login codes, IP rate-limit keys, and session tokens. Never store it in Git or in a plaintext Wrangler variable.
- Login codes expire after 10 minutes, are single-use, and allow five verification attempts.
- Code requests are limited per email and per connecting IP.
- Portal sessions expire after 30 days. Suspending a user revokes all of that user's sessions immediately.
- Primary and verified secondary identities authenticate the same D1 user account.
