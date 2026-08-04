# Release-history source files

The working source files are stored in `ncidose_frontend/_versions`, where Synology Drive can synchronize them with NCI Dose Tools development computers. The files in `src/content/releases` are the tracked website copies used by GitHub Pages.

## Editing workflow

1. Edit the appropriate Markdown file in `ncidose_frontend/_versions` while making software changes.
2. Add the newest dated entry at the top of its year.
3. Update the three metadata lines near the top of the file when applicable:
   - `Latest update`
   - `Latest official release`
   - `Record begins`
4. Allow Synology Drive to synchronize the source file to the website server.
5. Run `npm run docs:sync`, `npm run dev`, or `npm run build` in the website repository. Development and build commands synchronize the files automatically.
6. Preview and test the website, then commit the software and website-copy changes together when appropriate.

The metadata is read directly by the website. No TypeScript edit is needed for an ordinary release-history update. Set `NCIDOSE_DOCUMENTATION_ROOT` if `ncidose_frontend` is stored somewhere other than the current user's home directory.

## Current records

- `NCICT-Version-History.md`
- `NCIRF-Version-History.md`
- `NCINM-Version-History.md`
- `PHANTOM-Version-History.md`

Additional products can be added as separate Markdown files and registered once in `src/data/releases.ts`.
