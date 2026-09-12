# 버전 기록 편집 위치

이 `_versions` 폴더가 모든 버전 기록의 유일한 원본입니다.
위치: `ncidose_frontend/ncidose.github.io/_versions`.
제품의 `*-Version-History.md`를 열어 편집하거나 Markdown 미리보기로 읽으세요.
웹사이트가 같은 파일을 직접 읽으므로 별도 복사본을 관리하지 않습니다.

## Editing workflow

1. Edit the appropriate Markdown file in this `_versions` folder while making software changes.
2. Add the newest dated entry at the top of its year.
3. Update the three metadata lines near the top of the file when applicable:
   - `Latest release`
   - `Latest scientific update`
   - `Record begins`
4. Preview the site with `npm run dev`; the Markdown is read directly, with no document-copy step.
5. When the draft is finished and publication is requested, test/build and push the approved changes to GitHub. Keep unfinished drafts out of unrelated website pushes.

The metadata is read directly by the website. No TypeScript edit is needed for
an ordinary release-history update. Local editing/building and Synology file
synchronization do not publish the website; GitHub publication is a separate step.

## Current records

- `NCICT-Version-History.md`
- `NCIRF-Version-History.md`
- `NCINM-Version-History.md`
- `PHANTOM-Version-History.md`

Additional products can be added as separate Markdown files and registered once in `src/data/releases.ts`.

## Update classification

Every public software or library update is a release and is classified as one
of two types:

- `Scientific Update`: changes scientific data, anatomy, models, coefficients,
  phantom selection, dose algorithms, or a defect that can change a reported
  scientific result.
- `Maintenance Update`: changes interfaces, input/output formats,
  compatibility, performance, packaging, security, documentation, or a defect
  where valid scientific results are expected to remain unchanged.

Classify a mixed release as `Scientific Update`. Historical publication or
presentation milestones that do not describe a software or data change may
remain unclassified. Do not add a separate official designation; every
published release is an approved release.
