# dashboard-app 하드닝 상태

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-20 |
| 최종 수정일 | 2026-05-20 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app` CSS public facade, 직접 import 예외, selector/token 하드닝 후보 |

## 목적

이 문서는 `dashboard-app`에서 하드닝 완료, 보류, 수정 전 승인 필요 대상을 추적하는 기준 문서다. 현재 버전은 TODO-008 범위에 맞춰 CSS facade/import boundary, selector 중복, token 후보만 기록한다.

## 참조 입력

- `mulAg/md/done/DONE-004-css-boundary.md`
- `MD/dashboard-app/source-boundary-map.md`
- `dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawer.module.css`
- `dashboard-app/src/dashboard/components/product-drawer/secondary/cards/AiCommentCard.tsx`
- `dashboard-app/src/dashboard/components/product-drawer/primary/cards/SalesMetricsCard.tsx`
- `dashboard-app/src/dashboard/components/common.module.css`
- `dashboard-app/src/styles/tokens.css`

## 하드닝 완료 기준

- public 계약이 문서화되어 있다.
- 수정 가능 범위와 cascade/import 영향 범위가 문서화되어 있다.
- 직접 import 또는 cross-boundary 예외가 있으면 예외 조건과 후속 결정 지점이 문서화되어 있다.
- 완료 표기는 코드가 완전히 안전하다는 의미가 아니라, 다음 작업자가 계약을 보고 참조/확장 여부를 판단할 수 있다는 의미다.

## 하드닝 완료 또는 기준 확정

| 대상 | 상태 | public 계약 | 수정 가능 범위 | 예외 조건 |
|------|------|------|------|------|
| `dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawer.module.css` | 기준 확정 | 2차 드로워 CSS public facade. TS/TSX는 원칙적으로 이 파일만 import한다. | `@import './style-parts/*'` 순서, facade 설명, facade에 노출되는 selector 계약. 실제 selector 변경은 별도 TODO와 시각 회귀 기준 필요. | `AiCommentCard.tsx`의 `cardAi.module.css` 직접 import는 승인 필요 후보로 둔다. primary `SalesMetricsCard.tsx`의 secondary facade 참조는 cross-boundary 예외로 둔다. |
| `dashboard-app/src/dashboard/components/common.module.css` | 기준 확정 | dashboard 공통 CSS public facade. TS/TSX는 `common-style-parts/**`를 직접 import하지 않는다. | 공통 page, table, drawer, chart, filter, modal style-parts의 import entrypoint와 공개 selector 계약. | `common-style-parts/**` 수정은 여러 화면에 동시 영향이 있으므로 단일 화면 CSS 수정처럼 처리하지 않는다. |

## 보류 대상

| 대상 | 보류 이유 | 다음 결정 |
|------|------|------|
| `dashboard-app/src/dashboard/components/product-drawer/secondary/cards/AiCommentCard.tsx` | `secondaryDrawer.module.css` facade와 `cardAi.module.css`를 동시에 import한다. | 직접 import를 문서화된 예외로 유지할지, AI 카드 selector를 facade 뒤로 되돌릴지 결정한다. |
| `dashboard-app/src/dashboard/components/product-drawer/primary/cards/SalesMetricsCard.tsx` | primary card가 secondary drawer CSS facade를 참조한다. | 공통 sales metrics facade 또는 `common-style-parts`로 분리할지 결정한다. |
| 2차 드로워 selector 중복 | `.btn`, `.btnViewportAdaptive`, `.card`, `.panel`, `.sectionTitle`, `.table`, `.stockInputList`, `.stockNumberInput`, `.salesMetricsPeriodLine`, `.confirmOrderHelpAnchor`의 의미가 파일별로 다르다. | 이름 변경보다 공개 selector 계약과 사용처 영향 범위를 먼저 정한다. |
| 공통 selector 중복 | `.periodMeta`, `.analysisBulkAddButton`, 공통 `.table` 계열 selector가 drawer, table, filter, modal 책임에 걸쳐 있다. | `common.module.css` facade에서 공개할 규칙과 내부 style-parts 전용 규칙을 나눈다. |
| token 확장 | `tokens.css`에는 color, spacing, radius 일부만 있다. 버튼 높이/반경/variant, card surface/border, layout gap, typography weight token이 없다. | 기존 화면 리듬을 유지하는 token 이름과 적용 범위를 먼저 승인받는다. |

## 수정 전 승인 필요 후보

| 후보 | 승인 필요한 이유 | 허용되지 않는 TODO-008 작업 |
|------|------|------|
| `AiCommentCard.tsx` 직접 import 제거 또는 유지 확정 | 코드 파일 수정과 selector 공개 범위 변경이 필요하다. | TODO-008은 코드 수정 금지이므로 수정하지 않는다. |
| `SalesMetricsCard.tsx`의 secondary CSS 의존 분리 | primary/secondary 드로워 경계와 공통 metrics style 책임을 바꾼다. | TODO-008은 코드 수정 금지이므로 수정하지 않는다. |
| `secondary/style-parts/**` selector rename | facade 사용자 전체와 cascade 순서에 영향이 난다. | TODO-008 읽기 허용 파일 밖의 CSS를 수정하지 않는다. |
| `common-style-parts/**` selector rename | dashboard page, table, drawer, chart, filter에 동시에 영향이 난다. | TODO-008 읽기 허용 파일 밖의 CSS를 수정하지 않는다. |
| `tokens.css` token 추가 또는 기존 token 교체 | CSS 전체의 색상, 간격, typography 리듬을 바꿀 수 있다. | TODO-008은 문서 정리만 수행하므로 token을 추가하지 않는다. |

## 후속 검토 메모

- `secondaryDrawer.module.css`를 2차 드로워의 유일한 public facade로 유지하려면 `style-parts/**` 직접 import 금지와 예외 승인 절차를 함께 유지한다.
- `AiCommentCard.tsx`의 직접 import는 작은 국소 예외처럼 보이지만 `cardAi.module.css`를 독립 공개 API처럼 만든다.
- `SalesMetricsCard.tsx`의 secondary facade 참조는 현재 UI 재사용에 유리하지만 primary/secondary 책임 경계를 흐린다.
- selector 중복은 CSS Modules 때문에 런타임 class 충돌 가능성은 낮다. 다만 같은 facade 안에서 다른 의미의 공개 이름이 늘어나면 하드닝 후 변경 비용이 커진다.
- `:global(...)` 또는 내부 DOM 구조에 결합한 selector는 제거보다 영향 범위 문서화와 시각 회귀 기준 지정이 먼저다.

## 검증 상태

- TODO-008 사용자 지시에 따라 검증 명령은 실행하지 않았다.
- 코드 파일은 수정하지 않았다.

