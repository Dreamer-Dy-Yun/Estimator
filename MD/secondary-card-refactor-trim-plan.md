# Secondary 카드 정리 리팩터링 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 그리드 카드 분리 후 증가한 보일러플레이트를 줄이고 타입 중복을 제거한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelTypes.ts`
- `dashboard-app/src/dashboard/components/product-secondary/cards/SalesMetricsCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/cards/AiMockCard.tsx`

## 작업 계획
1. 카드 간 공통 타입(`SalesKpiColumn`, Stock calc/입력/파생값, 도움말 ID)을 `secondaryPanelTypes.ts`로 통합한다.
2. `StockOrderCard`의 로컬 중복 타입을 제거하고 공통 타입을 import 한다.
3. 카드 `props`를 개별 필드 나열 방식에서 객체 묶음 방식으로 축소한다.
4. `ProductSecondaryPanel`의 카드 호출부를 새 `props` 구조에 맞게 정리한다.
5. 타입/린트/빌드 확인으로 동작 불변을 검증한다.

## 검증 포인트
- 기존 UI/동작(입력, 도움말, 계산값 표기, AI 버튼) 동일
- TypeScript/Lint 오류 미발생
