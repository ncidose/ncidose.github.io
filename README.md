# NCI Dose Tools Website

Static Vite/React website for NCI Dose Tools.

## 매뉴얼과 버전 기록 편집

이 폴더 안의 아래 두 폴더가 유일한 편집 원본입니다.

| 편집할 내용 | 위치 |
| --- | --- |
| 소프트웨어 / API 매뉴얼 | [_manuals/](_manuals/README.md) |
| 매뉴얼에 넣는 그림 | [_manuals/images/](_manuals/images/) |
| 제품별 버전 기록 | [_versions/](_versions/README.md) |

개발 중에는 이 파일을 계속 수정하고 Markdown 미리보기로 읽으면 됩니다.
웹사이트도 같은 원본을 직접 읽으므로 별도의 문서 동기화는 필요 없습니다.
완성되면 로컬 미리보기와 테스트를 확인한 뒤, 요청한 변경만 GitHub에 push합니다.
로컬 편집이나 build만으로 공개 사이트가 바뀌지는 않습니다.
아직 게시하면 안 되는 초안은 다른 웹사이트 작업을 push할 때도 제외합니다.

기존 `src/content/manuals`, `src/content/releases` 복사본은 더 이상 사용하지 않습니다.
`public/manuals/images`는 자동 생성되는 이미지 복사본이므로 편집하지 마세요.

## Local Development

```sh
./scripts/macos-node.sh npm ci
./scripts/macos-node.sh npm run dev
```

## Build

```sh
./scripts/macos-node.sh npm run build
```

## Google Analytics 4

The GitHub Pages workflow builds the site with measurement ID
`G-95GQF2F891`. Local builds can use `VITE_GA_MEASUREMENT_ID` in `.env.local`.

Analytics is disabled automatically when the variable is absent.

## GitHub Pages

This project is ready to run as the GitHub Pages user/organization site repo:

```text
ncidose.github.io
```

Push the `main` branch to `ncidose/ncidose.github.io` or `ncidose.github.io` under the intended GitHub account/organization, then set the repository Pages source to **GitHub Actions**.

The Pages workflow builds `dist/`, adds a `404.html` SPA fallback for direct route refreshes, adds `.nojekyll`, and deploys the artifact to GitHub Pages.
