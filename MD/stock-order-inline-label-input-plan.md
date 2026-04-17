# 재고·오더 레이블/입력 동일행 정렬 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 2x2 입력 셀에서 레이블과 입력란을 세로 배치가 아닌 동일 행 배치로 정렬한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. `stockInputCell`을 행 단위 레이아웃으로 변경한다.
2. 레이블은 좌측, 입력 컨트롤은 우측 정렬되도록 조정한다.
3. 기존 2x2 전체 레이아웃은 유지한다.

## 검증 포인트
- 각 셀에서 레이블/입력 동일행 유지
- 작은 화면에서도 레이아웃 붕괴 최소화
