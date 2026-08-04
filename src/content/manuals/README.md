# Editing the public manuals

The working source files are stored in `ncidose_frontend/_manuals`, where
Synology Drive can synchronize them with NCI Dose Tools development computers.
The files in `src/content/manuals` are the tracked website copies used by
GitHub Pages.

## Editing workflow

1. Edit the Markdown in `ncidose_frontend/_manuals` while developing a tool.
2. Allow Synology Drive to synchronize the source files to the website server.
3. Run `npm run docs:sync`, `npm run dev`, or `npm run build` in the website
   repository. Development and build commands run the documentation sync
   automatically.
4. Review and commit the updated files under `src/content/manuals` when the
   website is ready to publish.

Set `NCIDOSE_DOCUMENTATION_ROOT` if `ncidose_frontend` is stored somewhere
other than the current user's home directory.

## Images

Manual images live in the website repository under `public/manuals/images`. In Markdown, refer to them with a
path such as:

```markdown
![Description](images/example.png)
```

The website converts that path to `/manuals/images/example.png` when rendering
the manual. Keep filenames stable when replacing an existing image so links do
not need to change.

## Local preview

From the website repository, run `npm run dev`, then open:

`http://127.0.0.1:8084/src/index.html#/manuals`

When using a different port, substitute that port in the URL.
