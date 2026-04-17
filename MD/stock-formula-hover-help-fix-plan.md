# 안전재고 수식 표기/노출 방식 수정 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 안전재고 수식을 상시 노출하지 않고 물음표(`?`) 호버 시에만 보이도록 변경한다.
- 수식 내용을 `Z × σ × √L`로 정정한다.
- 수식 표기에서 ASCII 대체어(`x`, `sigma`, `sqrt`) 대신 특수문자(`×`, `σ`, `√`)를 사용한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- `안전 재고` 행의 상시 수식 텍스트를 제거한다.
- 계산식 모드에서만 `PortalHelpMark(helpId: safetyStockCalc)`를 행 라벨 우측에 표시한다.
- `KO.helpSafetyStockCalc`를 `Z × σ × √L` 기준으로 갱신한다.
- 미사용 스타일(`stockFormulaText`)을 정리한다.

## 검증 포인트
- 계산식 모드에서 `안전 재고` 옆 `?` 호버 시 수식이 보이는지
- 직접입력 모드에서 해당 `?`가 보이지 않는지
- 화면에 ASCII 수식 문자열이 더 이상 노출되지 않는지
