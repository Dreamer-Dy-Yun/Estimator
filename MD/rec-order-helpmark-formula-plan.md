# 발주량 제안 물음표/수식 안내 추가 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `발주량 제안` 행에 물음표(`?`) 헬프를 추가한다.
- 물음표 호버 문구를 `안전재고 + μ × L`로 노출한다.
- 수식 표기는 특수문자(`μ`, `×`)를 사용한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelTypes.ts`
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`

## 검증 포인트
- `발주량 제안` 우측에 `?`가 표시되는지
- 호버 시 `안전재고 + μ × L` 문구가 뜨는지
