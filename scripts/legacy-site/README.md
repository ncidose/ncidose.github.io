# Retire the old project website

These files belong to the separate `ncidose/ncidosetools` repository when
publishing the redirect. Keep its DCC data, README, and security policy.

- Copy `build.mjs` and `redirect.html` to `scripts/legacy-site/` in that repository.
- Copy `deploy-pages.yml` to `.github/workflows/deploy-pages.yml` there.
- Set that repository's homepage URL to `https://ncidose.github.io/`.
- Publish the scoped redirect changes to its `main` branch and verify its Pages run.

The redirect preserves product paths, queries, and anchors and converts the old
hash routes, documentation path, and questions path. Updating the main
`ncidose.github.io` repository alone does not replace this separate Pages site.
