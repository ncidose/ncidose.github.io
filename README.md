# NCI Dose Tools Website

Static Vite/React website for NCI Dose Tools.

## Local Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## GitHub Pages

This project is ready to run as the GitHub Pages user/organization site repo:

```text
ncidose.github.io
```

Push the `main` branch to `ncidose/ncidose.github.io` or `ncidose.github.io` under the intended GitHub account/organization, then set the repository Pages source to **GitHub Actions**.

The Pages workflow builds `dist/`, adds a `404.html` SPA fallback for direct route refreshes, adds `.nojekyll`, and deploys the artifact to GitHub Pages.
