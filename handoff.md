# NCI Dose Tools Website Handoff

## Current Location

Website repo root:

```text
/Users/choonsiklee/Sites/ncidose.github.io
```

GitHub repository:

```text
git@github.com-choonsiklee:ncidose/ncidose.github.io.git
```

Published site:

```text
https://ncidose.github.io/
```

## What This Is

This is a Vite + React + TypeScript site deployed to GitHub Pages.

Important routing detail: the app uses `HashRouter`, so internal pages resolve as:

```text
https://ncidose.github.io/#/tools
https://ncidose.github.io/#/vendors
https://ncidose.github.io/#/researchers
https://ncidose.github.io/#/literature
https://ncidose.github.io/#/resources
```

This avoids GitHub Pages 404s on direct internal route visits.

## Common Commands

```bash
npm install
npm run build:pages
npm test
git status --short --branch
git push origin main
```

`npm run build:pages` runs the production Vite build, copies `dist/index.html` to `dist/404.html`, and creates `dist/.nojekyll`.

## Deployment

Pushing `main` triggers `.github/workflows/deploy-pages.yml`.

The workflow builds the site with Node 20, uploads `dist`, and deploys with GitHub Pages Actions.

## GitHub SSH Setup

This folder has local-only SSH material under:

```text
.ssh/
```

That directory is intentionally ignored by git and must not be committed.

Repo-local git config is set to use:

```text
core.sshCommand = ssh -F /Users/choonsiklee/Sites/ncidose.github.io/.ssh/config
```

The SSH host alias is:

```text
github.com-choonsiklee
```

The key is authorized on GitHub account `choonsiklee` and SAML-authorized for the `ncidose` organization.

To verify:

```bash
ssh -F /Users/choonsiklee/Sites/ncidose.github.io/.ssh/config -T git@github.com-choonsiklee
```

Expected response includes:

```text
Hi choonsiklee! You've successfully authenticated
```

## Recent Changes

- Site was moved from `/Users/choonsiklee/Sites/ncidosetools`.
- Site was moved from Synology sync folder `/Users/choonsiklee/ncidose_frontend/ncidose.github.io` to `/Users/choonsiklee/Sites/ncidose.github.io`.
- GitHub Pages deploy is live at `https://ncidose.github.io/`.
- Internal navigation was changed from `BrowserRouter` to `HashRouter`.
- Old documentation portal link `https://ncidosimetry.github.io/ncidosetools/` was changed to `https://ncidose.github.io/`.

## Safety Notes

- Do not commit `.ssh/`.
- Do not print or paste the private key.
- Check `git status --short --ignored` if unsure whether `.ssh/` is ignored.
- If push fails with SAML SSO, re-authorize the SSH key for the `ncidose` organization in GitHub account settings.
