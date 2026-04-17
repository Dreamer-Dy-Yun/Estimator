# 안전재고 툴팁 수식/설명 순서 변경 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `안전 재고` 툴팁에서 LaTeX 수식을 상단에, 설명 텍스트를 하단에 배치한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 수정 방식
- `safetyStockCalc` 툴팁 렌더 블록의 JSX 순서를 `BlockMath -> 설명 <p>`로 변경한다.

## 검증 포인트
- 안전재고 물음표 호버 시 수식이 먼저 보이고, 변수 설명이 아래에 보이는지
