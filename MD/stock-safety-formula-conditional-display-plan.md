# 재고·오더 안전재고 수식/도움말 조정 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `안전재고 직접입력`이 `false`(계산식 모드)일 때만 표의 안전재고 행에 수식을 노출한다.
- `true`(직접입력 모드)일 때는 해당 수식 노출을 제거한다.
- `안전재고 연산` 컬럼 헤더의 물음표(도움말 아이콘)를 제거한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- 안전재고 행의 지표 셀에 계산식 모드 조건부 수식 텍스트를 추가한다.
- 직접입력 모드에서는 수식 텍스트를 렌더링하지 않는다.
- 안전재고 연산 헤더에서 `PortalHelpMark(safetyStockCalc)`를 제거한다.

## 검증 포인트
- 계산식 모드에서만 안전재고 행에 수식이 보이는지
- 직접입력 모드에서 수식이 사라지는지
- 안전재고 연산 헤더에 물음표가 사라졌는지
