# dashboard-app 프로젝트 정리 기록 (2026-06-02)

## Goal

문서 체계를 코드 기준으로 재정렬하여, 현재 코드 구조와 경계(ownership)가 일치하도록 한다.

## Scope

- `MD/dashboard-app/source-boundary-map.md`
- `MD/dashboard-app/boundaries/style-facades.md`
- `MD/dashboard-app/boundaries/{README,auth-admin,analysis-pages,repository-runtime}.md`
- `MD/dashboard-app/README.md`
- `MD/dashboard-app/frontend-overview.md`
- `dashboard-app/src/dashboard/components/product-drawer/primary/cards/SalesMetricsCard.tsx`
- `dashboard-app/src/dashboard/components/product-drawer/primary/cards/SalesMetricsCard.module.css`

## Principles

- 문서의 책임 범위는 실제 폴더/파일 소유권에 기반한다.
- mock/adapter/모듈 책임을 중복 임포트하지 않는다.
- primary product drawer card는 secondary drawer CSS facade에 의존하지 않는다.
- 경계 변경이 있으면 최소 2개 문서(맵 + 해당 boundary)를 동시 갱신한다.
- 인코딩 깨짐 및 불명확한 문장은 즉시 교체한다.

## Plan

1. 코드 루트(`dashboard-app/src`, `dashboard-app/e2e`, workflow) 기준 경계 점검
2. 기존 경계 문서에서 오염/손상 텍스트 정리
3. 경로 기반 책임 문구를 실제 파일 단위로 정리
4. 누락된 정리 파일을 추가
5. SalesMetricsCard의 CSS ownership을 source/CSS/style facade 문서 기준으로 정렬

## Result

- `source-boundary-map.md`를 폴더 소유권 + 문서 맵 + 갱신 규칙 기준으로 정리
- `boundaries/style-facades.md`에 `SalesMetricsCard.module.css`를 primary sales metrics card의 public facade로 명시
- `boundaries/README.md`를 깔끔한 문서 색인으로 정리
- `boundaries/auth-admin.md`를 라우트 기준 인증/관리 경계로 정리
- `boundaries/analysis-pages.md`의 필터/조회/로딩 규약을 정리
- `boundaries/repository-runtime.md`를 런타임·배포·e2e 기준으로 정리
- `dashboard-app/README.md`, `frontend-overview.md`의 문서 링크/설명 정렬
- `SalesMetricsCard.tsx`의 style import 표면을 adjacent `SalesMetricsCard.module.css` 기준으로 정렬
- `SalesMetricsCard.module.css`가 primary sales metrics card/table 스타일 소유권을 갖는 상태로 정리
- 기존 삭제되었던 `project-cleanup-2026-06-02.md` 재생성

## Validation

- 문서 근거: `MD/dashboard-app/boundaries/style-facades.md`가 `SalesMetricsCard.module.css`를 primary sales metrics card facade로 정의한다.
- 소스 근거: `SalesMetricsCard.tsx`는 `./SalesMetricsCard.module.css`를 import하며 secondary drawer CSS facade를 import하지 않는다.
- CSS 근거: `SalesMetricsCard.module.css`가 card, table, header, unavailable state selector를 보유한다.
- 2026-06-02 MulAg 통합 검증: `npm run check:encoding`, `npm run test:run`, `npm run build` 통과.

## Non-goals / Follow-up

- API 계약, sales metric 계산식, 백엔드 동작은 변경하지 않았다.
- 코드 표면 변경 범위는 SalesMetricsCard의 CSS import/ownership 정렬에 한정한다.
- 추후 후보군/공유 모듈 문서를 동일한 방식으로 동일한 규칙으로 정기 동기화할 예정
