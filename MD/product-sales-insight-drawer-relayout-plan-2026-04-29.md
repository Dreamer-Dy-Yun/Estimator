# 상품 인사이트 드로어 판매 정보 재배치 계획

- 작성일: 2026-04-29
- 변경일: 2026-04-29
- 지시자: Yun Daeyoung

## 목표

- 1차 상품 드로어를 상품 이미지·판매 정보·월간 판매추이 중심으로 재구성한다.
- 2차 확장 영역은 후보군 저장/수정, 사이즈 통합 오더 설정, AI 결과, 일간 추이, 사이즈별 오더에 집중한다.
- 기간·경쟁 채널 조건이 필요한 판매 정보는 기존 월간 번들과 분리된 API 계약으로 요청한다.

## 범위

- `dashboard-app/src/api/types/*`
- `dashboard-app/src/api/client.ts`
- `dashboard-app/src/api/mock/dashboardApi.ts`
- `dashboard-app/src/dashboard/components/ProductSummaryDrawer.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/*`
- `MD/backend-api/backend-api-spec.md`
- `MD/dashboard-app/frontend-overview.md`

## 원칙

1. `getProductDrawerBundle`은 월간 추이·재고·기본 요약용으로 유지한다.
2. 판매 정보는 `getProductSalesInsight(productId, { startDate, endDate, competitorChannelId })`로 분리한다.
3. 경쟁 채널 선택 상태는 드로어가 소유하고, 왼쪽 판매 정보와 오른쪽 사이즈 오더가 같은 값을 공유한다.
4. 시즌성 카드는 이번 변경에서 제거한다.
5. 화면 레이어는 mock 파일을 직접 import하지 않고 `dashboardApi`만 호출한다.

## 실행 결과

- 추가: `ProductSalesInsightParams`, `ProductSalesInsightColumn`, `ProductSalesInsight` 타입.
- 추가: `DashboardApi.getProductSalesInsight`와 mock 구현.
- 변경: `ProductSummaryDrawer`에서 판매 정보 API를 호출하고, 판매 정보 카드를 왼쪽 드로어로 이동.
- 변경: 경쟁 채널 선택을 왼쪽 판매 정보 카드에 배치하고, `ProductSecondaryPanel`에 channel state를 전달.
- 변경: 2차 패널 상단에서 경쟁 채널 단독 카드와 판매 정보 카드를 제거.
- 변경: AI 카드는 확장 영역에서 답변 표시 중심(`answerOnly`)으로 표시.
- 변경: 드로어 폭 변수와 이너 모달 보정 값을 새 폭에 맞게 조정.
- 제거: 1차 드로어 KPI 카드와 시즌성 카드.
- 문서: 백엔드 API 스펙과 프론트 개요 갱신.

## 검증

- `npm run test:run` 통과.
- `npm run build` 통과.
- 로컬 브라우저에서 오더 후보군 상세 → 이너 후보 → 상품 드로어 진입 확인.

## 비범위

- 실제 백엔드 집계 테이블 구현.
- 시즌성의 대체 UI.
- AI 프롬프트 입력 UX 재설계.
