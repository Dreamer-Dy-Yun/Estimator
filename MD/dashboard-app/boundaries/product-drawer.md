# Product Drawer Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-26 |
| 상태 | 유지 문서 |
| 적용 범위 | 상품 1차/2차 드로워, 저장 스냅샷, AI 코멘트, 재고·발주 계산 |

## 책임 요약

상품 드로워는 분석 페이지와 오더 후보군 상세에서 공통으로 여는 상품 상세 UI다. 페이지 상태를 직접 소유하지 않고, 상품 요약, 2차 상세, 경쟁 채널, 재고·발주 계산, AI 코멘트 요청은 API 경계 뒤에서 가져온다.

단일 회사가 선택된 경우 1차/2차 드로워의 조회 요청에는 `companyUuid`가 전달된다. `전체` 선택은 조회성 API에서만 scope 생략으로 처리하며, 후보군 저장/확정 같은 side effect는 후보군 경계에서 차단한다.

## 주요 파일

| 파일 | 책임 |
|------|------|
| `ProductDrawer.tsx` | 1차 드로워 shell, 2차 패널 열림 상태, 회사 scope 전달 |
| `ProductDrawerSecondaryPane.tsx` | 2차 패널 로딩/오류/상세 데이터 분기 |
| `mergePrimarySummaryFromSnapshot.ts` | API bundle summary와 저장 스냅샷 summary 병합 규칙 |
| `useSecondaryDrawerDetail.ts` | 2차 상세 조회와 스냅샷 hydrate 기준 선택 |
| `secondary/ProductSecondaryDrawer.tsx` | 2차 드로워 상태 조립 |
| `secondary/hooks/useSecondaryForecastModel.ts` | 재고·발주 계산, size row, snapshot builder 연결 |
| `secondary/secondarySnapshot.ts` | 현재 2차 드로워 상태를 저장 스냅샷 JSON으로 생성 |
| `src/snapshot/orderSnapshotTypes.ts` | 저장 스냅샷 current 타입 |
| `src/snapshot/parseOrderSnapshot.ts` | 저장 스냅샷 파싱과 legacy normalize |

## 1차 드로워

| 영역 | API |
|------|-----|
| 상품 이미지/요약 | `getProductDrawerBundle` + `companyUuid` |
| 판매 정보 | `getProductSalesInsight` + `companyUuid` |
| 월간 판매 추이 | `getProductMonthlyTrend` + `companyUuid` |

1차 드로워의 판매 추이 그래프는 선형 축으로 고정한다. 자사/선택 경쟁 채널 표시는 각 카드에서 독립적으로 관리한다. 분석 페이지의 자사/경쟁사 리스트는 2차 드로워를 열지 않는다.

## 2차 드로워

| 영역 | API/모듈 |
|------|----------|
| 2차 상세 | `getProductSecondaryDetail` + `companyUuid` |
| AI 코멘트 | `getSecondaryAiComment`, `useSecondaryAiComment.ts` + `companyUuid` |
| 재고·발주 계산 | `getSecondaryStockOrderCalc`, `useSecondaryStockOrderCalc.ts` + `companyUuid` |
| 일간 추이 | `getSecondaryDailyTrend` + `companyUuid` |
| 후보군 저장/확정 | `useSecondaryCandidateActions.ts` |
| 사이즈별 오더 | `cards/SizeOrderCard.tsx`, `model/secondarySizeOrderRows.ts` |

재고·발주 계산 API는 입력이 바뀔 때마다 즉시 호출하지 않고 debounce 후 요청한다. stale 응답은 현재 화면 상태를 덮지 않아야 한다.

## 저장 스냅샷 current v2

독립 스냅샷 목록 API는 없다. 후보 아이템의 `details` JSON이 저장·복원 경로다.

새로 생성하는 current v2 스냅샷은 화면/API 응답 객체를 넓게 복사하지 않고, 복원과 AI 판단에 필요한 값만 명시적으로 저장한다. 백엔드는 스냅샷을 JSON blob으로 저장할 수 있더라도 각 필드의 의미를 기준으로 최소 검증해야 한다.

| snapshot 영역 | current 책임 |
|------|------|
| `schemaVersion` | 현재 스냅샷 스키마 버전. 값은 `2`를 유지한다. |
| `skuGroupKey` | 상품 단위 묶음 key. DB `SKU.uuid`가 아니다. |
| `savedAt` | 저장 시각. 화면 표시가 아니라 저장 근거다. |
| `context` | 분석 기간, 예측 개월, 일간 추이 재조회 기준. |
| `drawer1.summary` | 1차 드로워 compact summary. 상품 식별/표시 메타와 기간 KPI만 저장한다. |
| `drawer2.competitorSalesBasis` | 2차 판매 기준 데이터. `ProductSecondaryDetail` 전체가 아니라 `skuGroupKey`, `competitorPrice`, `competitorQty`, `competitorRatioBySize`만 저장한다. |
| `drawer2.competitorChannelId`, `competitorChannelLabel` | 선택 경쟁 채널. |
| `drawer2.stockInputs` | 재고·발주 계산 입력. 날짜, 일평균, 리드타임, 안전재고 설정을 복원한다. |
| `drawer2.orderUnitInputs` | 저장 당시 단가, 원가, 예상 수수료율. |
| `drawer2.stockDisplay` | 저장 당시 사이즈별 재고, 총 잔량, 입고예정 잔량 표시값. |
| `drawer2.selfWeightPct`, `bufferStock` | 사용자가 조정한 사이즈 가중치와 버퍼 재고. |
| `drawer2.llmPrompt`, `llmAnswer` | AI 코멘트 입력/결과. |
| `drawer2.confirmedTotals` | 확정 오더 합계와 예상 매출/이익 요약. |
| `drawer2.sizeRows` | 사이즈별 비중, 추천 수량, 확정 수량. |

### 저장하지 않는 필드

current v2 스냅샷은 다음 값을 새로 저장하지 않는다. 이 값들은 compact snapshot hydrate 과정에서 빈 배열, `0`, 임의 계산값으로 되살리지 않는다.

| 제외 필드 | 처리 |
|------|------|
| `drawer1.summary.monthlySalesTrend` | 월간 추이는 필요 시 API로 재조회한다. |
| `drawer1.summary.sizeMix` | current 확정 결과는 `drawer2.sizeRows`에 저장한다. |
| `drawer1.summary.seasonality` | 화면 복원/AI 입력에 직접 쓰지 않는다. |
| `drawer1.summary.recommendedOrderQty` | 2차 추천/확정 수량은 `drawer2.sizeRows`와 `confirmedTotals`가 기준이다. |
| `drawer2.secondary` | legacy field. 새 payload는 `drawer2.competitorSalesBasis`를 사용한다. |
| `drawer2.salesSelf`, `drawer2.salesCompetitor` | current 저장 대상이 아니다. 화면/AI에 필요한 요약은 명시 필드로 저장한다. |
| `drawer2.stockDerived` | current 저장 대상이 아니다. 화면 기준 합계는 `confirmedTotals`, `sizeRows`, `stockDisplay`, `orderUnitInputs`로 복원한다. |
| `drawer2.sizeForecastSource`, `drawer2.minOpMarginPct`, `drawer2.forecastQtyCalc` | current 저장 대상이 아니다. 필요한 계산 근거는 current 필드로 명시해야 한다. |

### 1차 summary hydrate 규칙

`drawer1.summary`는 current v2에서 compact summary이므로 단독으로 `ProductPrimarySummary`를 완성하지 않는다. compact summary에는 `monthlySalesTrend`, `seasonality`, `sizeMix`, `recommendedOrderQty`가 없으며, 이 필드를 빈 배열, `0`, 임의 계산값으로 padding하는 fallback은 금지한다.

| 상황 | 처리 |
|------|------|
| live `ProductDrawerBundle` 있음 | bundle의 실제 `ProductPrimarySummary`를 기준으로 삼고, snapshot compact summary의 저장 필드만 덮어쓴다. `monthlySalesTrend`, `seasonality`, `sizeMix`, `recommendedOrderQty`는 snapshot에서 가져오지 않는다. |
| live bundle 없음 + current compact snapshot | `ProductPrimarySummary` fallback을 만들지 않는다. 빈 배열, `0`, 임의 추천 수량으로 화면 shape만 맞추지 않는다. |
| live bundle 없음 + parsed snapshot | parser 통과 후에는 legacy full summary 필드가 제거되므로 parsed `OrderSnapshotDocumentV1`만으로 legacy full summary fallback을 수행하지 않는다. |
| live bundle 없음 + parse 전 raw legacy full summary 별도 보유 | `skuGroupKey`가 일치하고 raw legacy snapshot이 완전한 `ProductPrimarySummary`를 보유한 경우에만 별도 legacy fallback 계약으로 hydrate할 수 있다. 이 경로는 current compact summary fallback이 아니며, parsed snapshot 객체에서 복원할 수 없다. |

### legacy normalize

기존 후보 아이템 `details`에 legacy JSON이 남아 있을 수 있다. 프론트는 `parseOrderSnapshot`에서 legacy v2의 `drawer2.secondary`를 `drawer2.competitorSalesBasis`로 normalize하고, 이후 로직은 current field 기준으로 수행한다.

`parseOrderSnapshot`은 `drawer1.summary`도 current compact field set으로 다시 만든다. 따라서 parser를 통과한 `OrderSnapshotDocumentV1`에는 legacy full summary의 `monthlySalesTrend`, `seasonality`, `sizeMix`, `recommendedOrderQty`가 남지 않는다. parse 이후 객체만으로는 legacy full summary fallback을 수행할 수 없고, current compact summary를 빈 배열/`0`으로 padding하는 fallback도 금지한다. legacy full summary fallback이 필요하다면 parse 전 raw payload를 별도 계약으로 보존한 경우에만 가능하다.

legacy JSON에 current v2 제외 필드가 남아 있어도 새 저장 payload의 필드로 승격하지 않는다. 특히 `drawer1.summary`의 비저장 필드나 `drawer2.forecastQtyCalc` 같은 계산 상세는 current snapshot 계약에 포함하지 않는다.

## 키보드

- 좌/우 방향키: 드로워 열기/닫기.
- 위/아래 방향키: 현재 후보군 목록의 이전/다음 item 이동.
- ESC: 2차 패널이 열려 있으면 2차 패널을 먼저 닫고, 다시 누르면 1차 드로워를 닫는다.
- 입력/콤보박스 내부 방향키는 가로채지 않는다.

## 스타일

- 2차 드로워 CSS public facade는 `secondaryDrawer.module.css`다.
- 카드 단위 UI는 `secondary/cards/*`, hook 경계는 `secondary/hooks/*`, 계산 모델은 `secondary/model/*`에 둔다.
- 기존 카드, 그리드, 패널, 버튼 리듬을 유지한다.
