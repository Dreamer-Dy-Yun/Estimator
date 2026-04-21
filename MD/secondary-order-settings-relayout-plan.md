# 2차 드로워 오더 설정 재배치 계획

- 작성일: 2026-04-20
- 변경일: 2026-04-20
- 지시자: Yun Daeyoung

## 목표

- `판매예측(사이즈 통합)` 카드를 `사이즈 통합 오더 설정`으로 변경한다.
- `사이즈별 오더` 카드에 있던 아래 필드를 `사이즈 통합 오더 설정`으로 이동한다.
  - 여유재고 설정
  - 금번 오더 입고일
  - 차기 오더 입고일
- `원가`, `판매가`, `기대 수수료` 입력을 추가하고 기본값을 각각 평균원가/평균판매가/평균수수료로 초기화한다.
- 표 컬럼을 재구성한다.
  - 기존 `기간 산술평균` 제거
  - 해당 위치에 `예측 수량연산` 배치
  - 기존 `예측 수량연산` 위치에 `확정 수량` 배치
  - 확정 수량 기반 기대 판매금액/기대 영업이익 표시

## 영향 범위

- `dashboard-app/src/dashboard/components/product-secondary/cards/SalesForecastCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/cards/SizeOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- 필요 시 `secondaryPanelTypes.ts` / 계산 보조 로직

## 검증

- `npx tsc --noEmit`
- 2차 드로워 UI 수동 확인
  - 필드 이동/표시 확인
  - 기본값 초기화 확인
  - 확정 수량 변경 시 기대 금액 즉시 반영 확인
