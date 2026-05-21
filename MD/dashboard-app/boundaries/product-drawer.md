# Product Drawer Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-21 |
| 상태 | 유지 문서 |
| 적용 범위 | 상품 1차/2차 드로워, 스냅샷, AI 코멘트, 재고·발주 계산 |

## 책임 요약

상품 드로워는 분석 페이지와 이너후보군에서 공통으로 쓰는 상품 상세 UI다. 특정 페이지 state에 직접 의존하지 않고 필요한 데이터는 API 경계로 호출한다. 단일 회사 선택 시 1차/2차 드로워, AI 코멘트, 재고·발주 계산 요청에는 `companyUuid`를 포함하고, `전체` 선택 시 생략해 전체 회사 기준으로 조회한다. mock 드로워 응답도 같은 `companyUuid`를 판매량/재고/경쟁 지표 계산 입력으로 사용한다.

## 루트와 공통 상태

| 파일 | 역할 |
|------|------|
| `ProductDrawer.tsx` | overlay와 공유 상태 조율 |
| `ProductDrawerSecondaryPane.tsx` | 2차 패널 로딩/오류/상세 렌더 분기 |
| `useProductDrawerKeyboard.ts` | 좌/우/상/하/ESC 키보드 계약 |
| `useCompetitorChannels.ts` | 1차 판매 정보/월간 추이와 2차 일별 추이가 공유하는 경쟁 채널 목록과 선택 상태 |

경쟁 채널 master data 중복 요청 coalescing은 드로워가 아니라 API request boundary의 `dashboardMasterDataCache.ts`가 맡는다.

회사 scope 경계는 `ProductDrawer.tsx`에서 확정한다. `ProductDrawerContent`는 `companyUuid`를 `ProductDrawerSecondaryPane.tsx`와 `ProductSecondaryDrawer.tsx`로 전달하고, `useSecondaryForecastModel.ts`와 `useSecondaryDrawerRequests.ts`가 하위 API hook에 주입한다. 2차 드로워 하위 hook은 `AuthContext`를 직접 읽지 않으며, mock/HTTP adapter 모두 이 DI 값을 API scope로 취급한다.

## 1차 드로워

`product-drawer/primary`가 소유한다.

| 영역 | API |
|------|-----|
| 상품 이미지/요약 | `getProductDrawerBundle` + `companyUuid` |
| 판매 정보 | `getProductSalesInsight` + `companyUuid` |
| 월간 판매 추이 | `getProductMonthlyTrend` + `companyUuid` |

판매 추이 그래프는 선형 축으로 고정하고, 자사/선택 경쟁 채널 표시를 각각 토글한다. 자사/경쟁사 분석 탭에서는 2차 드로워를 열지 않는다.

## 2차 드로워

`product-drawer/secondary`가 소유한다.

| 영역 | API/모듈 |
|------|----------|
| 2차 상세 | `getProductSecondaryDetail` + `companyUuid` |
| AI 코멘트 | `getSecondaryAiComment`, `useSecondaryAiComment.ts` + `companyUuid` |
| 재고·발주 계산 | `getSecondaryStockOrderCalc`, `useSecondaryStockOrderCalc.ts` + `companyUuid` |
| 일별 추이 | `getSecondaryDailyTrend` + `companyUuid` |
| 후보군 저장/확정 | `useSecondaryCandidateActions.ts` |
| 사이즈별 오더 | `cards/SizeOrderCard.tsx`, `model/secondarySizeOrderRows.ts` |

재고·발주 계산 API는 입력 변경마다 즉시 호출하지 않고 최종 입력 1초 후 호출한다. stale 응답은 화면에 반영하지 않는다.
통합 오더 설정 카드의 `일평균 판매량`과 `일평균 기대 판매량`은 계산값 자체를 변경하지 않고 표시 단계에서 소수 첫째 자리 고정으로 반올림한다.

## 스냅샷

| 파일 | 역할 |
|------|------|
| `secondary/secondarySnapshot.ts` | 2차 드로워의 오더 스냅샷 문서 생성 |
| `src/snapshot/orderSnapshotTypes.ts` | `OrderSnapshotDocumentV1` 스키마 |
| `src/snapshot/parseOrderSnapshot.ts` | 저장 스냅샷 파싱 |

독립 스냅샷 목록 API는 없다. 후보 아이템 `details`가 저장·복원 경로다.

저장 스냅샷은 판단 근거 보존을 위해 그래프 외 전 영역을 저장한다. 화면 표시는 현재 모드에 따라 live 계산값 또는 스냅샷 초기값을 사용한다.

## 키보드

- 좌: 드로워 열기 방향.
- 우: 드로워 닫기 방향.
- 상/하: 현재 목록의 이전/다음 item.
- ESC: 2차가 열려 있으면 2차부터 닫고, 한 번 더 누르면 1차를 닫는다.
- 입력/콤보박스 내부 방향키는 가로채지 않는다.

## 스타일

`secondaryDrawer.module.css`가 CSS `@import`로 2차 드로워 카드/컨트롤/표/입력 스타일 조각을 묶는다. `metaFilterCandidate.module.css`는 메타/액션 grid만, `candidateSelection.module.css`는 후보군 선택 모달/리스트만 소유한다. 카드 단위 UI는 `cards/*`, hook 경계는 `hooks/*`, 계산 모델은 `model/*`에 둔다.
2차 드로워 상단 메타/액션 행은 5열 grid를 사용하며, 상품 메타 영역은 1~3열, 후보군 정보와 버튼 영역은 4~5열을 차지한다. 이너 후보 액션 버튼은 동일 폭으로 정렬하되 버튼 문구는 행바꿈하지 않는다.
2차 드로워 상품 메타 값은 행바꿈 없이 한 줄 말줄임으로 표시하며, hover 시 전체 값을 기본 툴팁으로 노출한다.
사이즈별 오더의 `비중` 라인 차트는 테이블 사이즈 컬럼의 실제 중앙 좌표를 측정해 그리며, 측정 전 fallback도 각 컬럼 중앙 좌표를 사용한다.
