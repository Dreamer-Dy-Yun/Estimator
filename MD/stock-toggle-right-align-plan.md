# 재고·오더 직접입력 토글 우측 배치 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `직접입력` 컨트롤을 제목 하단이 아닌 `재고 및 오더` 제목 행의 우측에 배치한다.
- 체크박스 형태를 토글 스위치 형태로 변경한다.
- 레이블 문구를 `안전재고 직접입력`으로 변경한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`

## 검증 포인트
- 토글이 제목 행 우측에 위치하는지
- 토글 스위치 동작이 기존과 동일한지
- 레이블이 `안전재고 직접입력`으로 노출되는지
