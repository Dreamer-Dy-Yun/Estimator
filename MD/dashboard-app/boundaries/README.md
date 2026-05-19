# dashboard-app boundary 문서

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-19 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app` 기능별 책임 경계 상세 |

## 목적

이 폴더는 [source-boundary-map.md](../source-boundary-map.md)가 가리키는 상세 boundary 문서를 보관한다.

마스터 문서는 탐색 지도만 맡고, 이 폴더의 각 문서는 기능별 현재 계약, 대표 소스, 변경 시 주의점을 짧게 유지한다.

## 문서 목록

| 문서 | 다루는 내용 |
|------|------|
| [repository-runtime.md](./repository-runtime.md) | 저장소 루트, 앱 루트, 라우팅, 빌드, e2e, CI/배포 |
| [api-contracts.md](./api-contracts.md) | `src/api`, 타입 계약, mock/HTTP adapter, SSE/API 경계 |
| [auth-admin.md](./auth-admin.md) | 로그인/세션, 관리자 사용자/GPT 키/구글 시트 관리 |
| [analysis-pages.md](./analysis-pages.md) | 자사/경쟁사 분석 페이지, 필터, 리스트, 산점도, 후보군 담기 |
| [candidate-stash.md](./candidate-stash.md) | 오더 후보군, 이너 후보군, 추천, 상세확정, 오더 지표, 엑셀 |
| [product-drawer.md](./product-drawer.md) | 상품 1차/2차 드로워, 스냅샷, AI 코멘트, 재고·발주 계산 |
| [shared-modules.md](./shared-modules.md) | 공통 UI, hooks/model/interaction/drawer, snapshot, styles, utils |

## 작성 규칙

- 각 문서는 현재 살아있는 계약만 둔다.
- 과거 결정 과정이나 날짜별 작업 내역은 [../../HISTORY](../../HISTORY)로 이동한다.
- 한 문서가 길어져 특정 기능을 찾기 어렵다면 하위 문서로 다시 나눈다.
