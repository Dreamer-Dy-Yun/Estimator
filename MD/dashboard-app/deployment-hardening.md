# dashboard-app 배포 하드닝 기준

## 목적

GitHub Pages 배포에서 반복된 문제를 검증 절차와 회피 기준으로 고정한다.

## 현재 배포 기준

- 배포 대상: `dashboard-app`
- 배포 workflow: `.github/workflows/deploy-dashboard.yml`
- 필수 로컬 검증: `npm run verify:deploy`
- 필수 CI 검증: `npm run verify:deploy`
- Pages build base: `/Estimator/`
- Pages router mode: `VITE_ROUTER_MODE=hash`
- Pages API mode:
  - push 배포: `DASHBOARD_API_BASE_URL`이 있으면 HTTP, 없으면 mock preview
  - manual 배포: `workflow_dispatch.deploy_api_mode`로 `mock` 또는 `http` 선택
- HTTP API base URL: GitHub Actions variable 또는 manual input `dashboard_api_base_url` → `VITE_API_BASE_URL`
- SPA fallback: `dist/index.html`을 `dist/404.html`로 복사

## 배포 전 검증

`dashboard-app`에서 다음 단일 명령을 실행한다.

```bash
npm run verify:deploy
```

이 명령은 아래 순서로 실패 즉시 중단한다.

1. `npm run lint`
2. `npm run check:encoding`
3. `npm run test:run`
4. `npm run build -- --base=/Estimator/`

PowerShell에서 여러 npm 명령을 직접 이어서 실행하면 native command 실패를 놓칠 수 있으므로 배포 전 검증은 이 스크립트를 기준으로 한다.

앱 런타임 기본값은 HTTP mode다. `VITE_USE_MOCK_API=true`일 때만 mock mode로 동작하며, `false`, 빈 값, 미설정은 HTTP mode로 해석한다.

배포 workflow는 현재 프로젝트 단계에서 mock preview 배포를 허용한다. `push` 배포는 `DASHBOARD_API_BASE_URL`이 있으면 HTTP mode로 빌드하고, 값이 없으면 mock mode로 빌드한다. `workflow_dispatch` 배포는 `deploy_api_mode` 입력값을 따른다.

`DASHBOARD_API_BASE_URL`은 secret이 아니라 브라우저 번들에 노출되는 API origin이므로 GitHub Actions variable로 관리한다. HTTP mode에서 값이 없으면 workflow의 runtime configuration step에서 빌드 전에 실패시킨다. mock preview mode에서는 이 값을 요구하지 않는다.

## 배포 후 확인

배포 완료 판단은 다음 세 가지를 분리해서 본다.

| 구분 | 확인 방법 | 완료 기준 |
|---|---|---|
| 원격 반영 | `git status --short --branch`, `git rev-parse --short HEAD` | `main...origin/main` clean, 로컬 HEAD와 원격 HEAD 일치 |
| workflow 실행 | `gh run list --branch main`, `gh run watch <run-id> --exit-status` | 해당 SHA의 Pages workflow가 `success` |
| Pages 반영 | `https://dreamer-dy-yun.github.io/Estimator/?v=<sha>#/...` 접속 또는 원격 index asset 확인 | cache-busted URL에서 최신 asset 로드 |

## 지금까지 확인된 배포 문제와 처리 기준

| 문제 | 원인 | 해결 | 정상 회피 기준 |
|---|---|---|---|
| 로컬 검증이 실패했는데 다음 명령이 계속 실행됨 | PowerShell native command exit code를 명시적으로 확인하지 않음 | `verify-dashboard-deploy.mjs`로 검증을 단일화 | 개별 명령을 직접 나열하지 않는다. 필요하면 각 명령 뒤 `$LASTEXITCODE`를 확인한다. |
| GitHub Pages가 최신인지 불명확함 | push, workflow run, Pages 배포 상태를 하나로 봄 | 세 상태를 분리해서 확인 | run이 생성되지 않으면 재푸시보다 `gh run list`, check suite, GitHub Status를 먼저 확인한다. |
| e2e 설치가 배포를 과도하게 지연함 | Playwright browser install 비용이 큼 | Pages 배포 gate에서는 e2e를 제외하고 별도 `Dashboard E2E` workflow로 분리 | e2e를 생략하는 것이 아니라 수동/별도 workflow로 실행한다. lint/encoding/unit/build는 생략하지 않는다. |
| 한글 문자열이 깨짐 | PowerShell here-string, `Set-Content`, 콘솔 인코딩 혼동 | 한국어 편집은 `apply_patch` 또는 UTF-8 안전 스크립트로만 수행하고 `check:encoding` 실행 | 콘솔 출력 mojibake만 보고 파일 손상으로 단정하지 않는다. 실제 파일 검증을 먼저 한다. |
| KaTeX tooltip이 배포본에서만 raw LaTeX로 보임 | Vite 8 OXC minifier와 `react-katex` production output 조합 문제 | Vite build minifier를 `esbuild`로 고정 | minifier를 바꾸려면 최소 KaTeX production smoke를 먼저 통과시킨다. |
| 브라우저에서 변경이 안 보임 | GitHub Pages/cache와 이전 asset 사용 | `?v=<short-sha>` cache-busted URL을 제공 | 사용자가 보는 URL의 `v`가 최신 SHA인지 확인한다. |
| 문서가 CI 실제 동작과 다름 | e2e gate 분리 이후 문서 갱신 누락 | runtime/test/e2e 문서에서 deploy gate와 e2e workflow를 분리 | 배포 workflow 변경 시 이 문서를 함께 갱신한다. |
| 의도와 다른 API mode로 배포됨 | mock preview와 HTTP production 기준 혼동 | workflow에서 deploy mode를 먼저 resolve하고 `VITE_USE_MOCK_API`를 그 결과로만 주입 | 배포 결과 보고 시 mock/http mode와 SHA를 함께 남긴다. |
| HTTP 배포본이 사용자 브라우저의 localhost를 호출함 | `VITE_API_BASE_URL` 누락 | HTTP mode에서만 `DASHBOARD_API_BASE_URL` preflight 후 `VITE_API_BASE_URL`로 주입 | production HTTP mode에서 backend base URL 누락을 허용하지 않는다. |

## 금지 기준

- lint, encoding, unit, build 중 하나를 실패한 상태로 Pages 배포하지 않는다.
- e2e를 배포 gate에서 제외하더라도 실행 책임을 없애지 않는다.
- workflow run 생성 실패를 코드 문제로 단정하지 않는다.
- GitHub Pages URL만 열어 보고 최신 배포라고 보고하지 않는다.
- 한국어 파일을 PowerShell here-string이나 `Set-Content`로 재작성하지 않는다.
- 앱 런타임에서 `VITE_USE_MOCK_API` 누락을 mock 사용으로 해석하지 않는다.
- Pages HTTP 배포에서 `VITE_API_BASE_URL` 누락을 localhost fallback으로 처리하지 않는다.
- mock preview 배포를 HTTP production 배포로 보고하지 않는다.
