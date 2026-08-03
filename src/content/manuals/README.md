# Editing the public manuals

The Markdown files in this folder are the single source for the public Manuals
section of the NCI Dose Tools website. The former GitHub Wiki does not need to
be updated after the migration is complete.

## Edit from GitHub

1. Open `src/content/manuals` in the `ncidose/ncidose.github.io` repository.
2. Select a manual and use the pencil icon to edit it.
3. Commit the change to `main` (or submit a pull request for review).
4. The existing GitHub Pages workflow automatically builds and publishes the
   updated Markdown using the website's documentation design.

## Images

Manual images live in `public/manuals/images`. In Markdown, refer to them with a
path such as:

```markdown
![Description](images/example.png)
```

The website converts that path to `/manuals/images/example.png` when rendering
the manual. Keep filenames stable when replacing an existing image so links do
not need to change.

## Local preview

Run `npm run dev`, then open:

`http://127.0.0.1:8084/src/index.html#/manuals`

When using a different port, substitute that port in the URL.
