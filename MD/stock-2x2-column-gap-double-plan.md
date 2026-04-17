# 재고·오더 2x2 컬럼 간격 2배 조정 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 2x2 입력 그리드의 컬럼 간 시각적 여백을 확대한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. `stockInputList`의 가로 gap 값을 현재 대비 2배로 조정한다.
2. 세로 gap은 유지한다.

## 검증 포인트
- 2x2 그리드의 좌/우 컬럼 사이 간격만 2배로 증가하는지
