# 대형 파일 분리 계획 (모달 / 2차 패널 CSS)

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-04-23 |
| 지시 | Yun Daeyoung |

---

## 진행

1. **완료** — `CandidateStashDetailModal` → `useCandidateStashDetailModal` 훅 분리 (`dashboard-app/src/dashboard/hooks/useCandidateStashDetailModal.ts`).
2. **완료** — `productSecondaryPanel.module.css` → `panel-styles/*.module.css` 9개 조각 + 엔트리에서 `@import` (`dashboard-app/src/dashboard/components/product-secondary/panel-styles/`).

---

## 목적 (최종 범위)

- `CandidateStashDetailModal`: 표시는 TSX, 상태·API·드로어 로직은 훅.
- `productSecondaryPanel`: 2차 패널·카드·후보 액션이 **같은 CSS 모듈 엔트리**를 공유하되, 유지보수를 위해 조각 파일로만 분리.
- 목(mock) `mock.ts` 대형 분리는 **생략** (요청에 따라).

---

## 경계 정리

### 후보 상세 모달

| 구분 | 위치 | 비고 |
|------|------|------|
| UI | `CandidateStashDetailModal.tsx` | 마크업·이벤트만 |
| 로직 | `useCandidateStashDetailModal.ts` | 목록/필터/드로어/삭제/인접 이동 |
| 부모 연동 | `SnapshotConfirmPage.tsx` | `stashSummary`로 `getCandidateStashes` 중복 호출 감소 |
| 공용 유틸 | `utils/uniqueSortedStrings.ts` | 필터 제안 문자열 정렬 |

### 2차 패널 CSS

| 규칙 | 설명 |
|------|------|
| **진입점 하나** | TS/TSX에서는 `productSecondaryPanel.module.css`만 import. `panel-styles/*`는 직접 import하지 않음. |
| **조각 역할** | `panel-styles/` 아래 9파일은 물리 분할일 뿐, 빌드 시 한 CSS 모듈로 합쳐져 클래스 맵이 동일하다. |
| **@import 순서** | 엔트리 파일의 `@import` 순서 = 예전 단일 파일의 위에서 아래 순서. 바꾸면 캐스케이드가 깨질 수 있음. |
| **조각 간 선택자** | 예: `layout.module.css`의 `.panel` + `tablesSizeOrder.module.css`의 `.panel .table` — 순서상 layout이 먼저 오므로 안전. |
| **소비자** | `ProductSecondaryPanel.tsx`, `candidateActionCards.tsx`, 카드 컴포넌트들이 **동일 엔트리**를 import — 스타일 공유가 의도이며, 조각 파일을 여러 번 중복 정의한 것은 아님. |

### 조각 파일 대응 (참고)

| 파일 | 대략적 범위 |
|------|-------------|
| `layout.module.css` | 패널 루트·3열 그리드·스크롤 래퍼 |
| `headers.module.css` | 섹션 타이틀·일간 트렌드/재고 타이틀 줄 |
| `metaFilterCandidate.module.css` | 메타/필터 그리드·후보 UI·모달·관련 미디어쿼리 |
| `cardsControls.module.css` | 메타 카드·필터·컨트롤 |
| `tablesSizeOrder.module.css` | 표·사이즈 오더 표 |
| `stockInputs.module.css` | 재고 입력 필드 |
| `cardAi.module.css` | 카드 래퍼·AI 카드·버튼 |
| `slider.module.css` | 가중치 슬라이더 |
| `misc.module.css` | 힌트·스냅샷 테스트 UI |

---

## 검증

- `npm run test:run`, `npm run build` 통과.
