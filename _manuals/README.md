# 매뉴얼 편집 위치

이 `_manuals` 폴더가 모든 매뉴얼의 유일한 원본입니다.
위치: `ncidose_frontend/ncidose.github.io/_manuals`.
제품의 `*-User-Manual.md`를 열고 편집하거나 Markdown 미리보기로 읽으세요.
API 매뉴얼은 파일명에 `API`가 들어 있습니다.

## Editing workflow

1. 개발 중에는 이 폴더의 Markdown을 계속 수정합니다.
2. `ncidose.github.io`에서 `npm run dev`로 웹사이트 미리보기를 확인합니다.
3. 완성되면 테스트와 build를 확인하고 승인된 문서만 GitHub에 push합니다.
   다른 웹사이트 변경을 게시하더라도 미완성 초안은 포함하지 않습니다.

웹사이트의 화면과 SEO 페이지가 이 원본을 직접 읽습니다. 별도 Markdown
복사본이나 외부 문서 경로 환경변수는 사용하지 않습니다. Synology 동기화와
GitHub 공개 배포는 별개이며, 로컬 수정/build만으로 공개 사이트는 바뀌지 않습니다.

Software, API, and library manuals should keep these metadata lines current:

- `Current documented release`
- `Current release type`
- `Latest scientific update`

Use only `Scientific Update` or `Maintenance Update`, following the
classification policy in [../_versions/README.md](../_versions/README.md). Use the release date in public
documentation; the application-specific date build number does not need to be
repeated there.

## Images

The editable image sources live beside these Markdown files under
`_manuals/images`. This keeps images visible when a source manual is previewed
directly. In Markdown, refer to them with a path such as:

```markdown
![Description](images/example.png)
```

`npm run docs:prepare` (also run before dev/build) prepares a generated image
copy at `public/manuals/images`; the website preserves URLs such as
`/manuals/images/example.png`. Edit only this folder's `images/`, not the
generated public copy. Commit `_manuals/images` with the Markdown. A clean CI
build creates the public copy automatically. Keep filenames stable when
replacing an existing image so links do not need to change.

## Local preview

From the website repository, run `npm run dev`, then open:

`http://127.0.0.1:8084/manuals`

When using a different port, substitute that port in the URL.
