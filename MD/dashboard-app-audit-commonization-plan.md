# dashboard-app 코드 감사 · 공통화 계획

- **작성일자:** 2026-04-17  
- **변경일자:** 2026-04-17  
- **지시:** 사용자(Yun Daeyoung) — 프로젝트 순회 후 불필요 로직·파일 확인, 공통화 파악, MD 작성 후 수정  

---

## 1. 의도적 보관 (삭제 대상 아님)

| 대상 | 사유 |
|------|------|
| [`StockOrderCard(backup).tsx`](../dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard(backup).tsx) | 운영 정책: 명시적 삭제 요청 전까지 보관. 번들에 미포함(미 import). |

---

## 2. 사용처 없음 · 정리함 (이번 수정)

| 항목 | 내용 |
|------|------|
| `dailyMeanAndSigmaFromTrend` | 재고 연산 API 이전 후 **import 0건**. 정의만 존재 → **삭제**. |
| `zFromServiceLevelPct` (프론트) | 패널에서 미사용. 목 API는 **별도 단계형 z 테이블** 사용 → 프론트 구현 **삭제**. |
| `jstat` 패키지 | 위 함수 제거 후 **프로젝트 내 미사용** → **의존성 및 `jstat.d.ts` 제거** 권장(적용). |

---

## 3. 중복 타입 · 정리함 (이번 수정)

| 항목 | 내용 |
|------|------|
| `CompetitorChannel` vs `SecondaryCompetitorChannel` | 필드 동일. UI 계산 모듈은 **API 타입 단일 소스** 사용, 로컬 중복 타입 **별칭으로 통일**. |

---

## 4. 날짜 유틸 공통화 · 정리함 (이번 수정)

| 항목 | 내용 |
|------|------|
| `daysInclusiveBetween` | [`ProductSecondaryPanel.tsx`](../dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx) 내부 함수 → [`utils/date.ts`](../dashboard-app/src/utils/date.ts) 로 이동 후 재사용. |

---

## 5. 목·프론트 이중 구현 (문서화만, 수식 통일은 별도 과제)

| 영역 | 현황 | 권장 |
|------|------|------|
| z값 | [`mock.ts`](../dashboard-app/src/api/mock.ts) 단계형 절단 vs (삭제 전) `jstat` 연속 근사 | 백엔드 단일 구현 확정 후 목을 그에 맞출 것. |
| 일평균·σ | `dailyMeanSigma`(목) vs (삭제되는) 트렌드 함수 | 이미 **목이 연산 주체**이므로 프론트 쪽 중복 제거로 일치. |

---

## 6. 스냅샷 / API 페이로드 이중 정의 (후속 과제)

| 항목 | 현황 |
|------|------|
| `SecondaryOrderSnapshot` vs `SecondaryOrderSnapshotPayload` | 패널은 강한 타입, API는 `unknown` 필드. 스냅샷 저장 API가 실제 백엔드와 맞춰지면 **한쪽으로 통합** 검토. |

---

## 7. UI 패턴 (후속 과제)

| 항목 | 메모 |
|------|------|
| `StockOrderCard` `void actions` | 신규 카드는 actions 미사용. 타입을 `Pick`/`Omit`으로 쪼개면 의도가 명확해짐. |
| 도움말 | `PortalHelpMark` + `PortalHelpPopoverLayer` 패턴은 이미 공통. |

---

## 8. 이번 커밋에서 수행한 코드 변경 요약

1. `utils/date.ts` — `daysInclusiveBetween` 추가.  
2. `ProductSecondaryPanel.tsx` — 위 유틸 import, 로컬 함수 제거.  
3. `secondaryPanelCalc.ts` — 미사용 트렌드/z/jstat 제거.  
4. `secondaryPanelTypes.ts` — `CompetitorChannel`을 API `SecondaryCompetitorChannel` 별칭으로 통일.  
5. `package.json` — `jstat` 제거, lock 갱신.  
6. `src/jstat.d.ts` — 삭제.  

---

## 9. 검증

- `npm run build` (dashboard-app 루트) — 2026-04-17 기준 통과.

---

## 10. 기존 MD와의 정합성

- [`z-from-service-level-jstat-plan.md`](z-from-service-level-jstat-plan.md) 는 프론트에서 `jstat`으로 z를 구하자는 계획이나, 현재는 **재고 연산을 API(목)에 두고** 프론트에서는 `jstat`을 **제거한 상태**이다. 해당 문서는 이력·참고용으로만 보면 된다.
