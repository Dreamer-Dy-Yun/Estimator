# 재고·오더 서비스수준/리드타임 표시 제거 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 입력 UI에서 불필요한 `서비스 수준` 및 `리드타임` 표시를 제거한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 작업 계획
1. `StockOrderCard`에서 서비스수준 입력 행 제거
2. `StockOrderCard`에서 리드타임(일) 표시 행 제거
3. 상위 패널에서 관련 props 전달 제거
4. 린트/빌드 검증

## 검증 포인트
- 2x2 입력 그리드 유지
- 컴파일/린트 오류 없음
