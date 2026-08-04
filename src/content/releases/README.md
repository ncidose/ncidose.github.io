# Release-history source files

This directory is the single source of truth for the public release histories shown on the NCI Dose Tools website.

## Editing workflow

1. Edit the appropriate Markdown file while making software changes.
2. Add the newest dated entry at the top of its year.
3. Update the three metadata lines near the top of the file when applicable:
   - `Latest update`
   - `Latest official release`
   - `Record begins`
4. Preview and test the website, then commit the software and documentation changes together when appropriate.

The metadata is read directly by the website. No TypeScript edit is needed for an ordinary release-history update.

## Current records

- `NCICT-Version-History.md`

Additional products can be added as separate Markdown files and registered once in `src/data/releases.ts`.
