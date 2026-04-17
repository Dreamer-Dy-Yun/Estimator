# 재고·오더 1x2 셀 내부 간격 축소 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `재고 및 오더` 2x2 영역 내부의 각 1x2 셀(레이블/입력) 가로 간격을 현재 대비 절반으로 줄인다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- `.stockInputCell`의 `column-gap` 값을 `10px`에서 `5px`로 조정한다.
- 그리드 구조 및 입력 폭/정렬 로직은 유지한다.

## 검증 포인트
- 각 셀에서 레이블-입력 간격이 기존 대비 절반으로 줄어드는지
- 텍스트/입력/단위 표기가 겹치거나 잘리지 않는지
