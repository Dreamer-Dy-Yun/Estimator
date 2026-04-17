# 재고·오더 2x2 그리드 컬럼 간격 축소 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `재고 및 오더` 카드의 2x2 입력 그리드에서 컬럼 간 가로 간격을 현재 대비 절반으로 줄인다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- `stockInputList`의 컬럼 gap 값(`8px 32px`) 중 가로 간격을 `16px`으로 조정한다.
- 행 간격(세로 gap)과 모바일 단일열 규칙은 유지한다.

## 검증 포인트
- 데스크톱 2열 레이아웃에서 좌/우 컬럼 간격이 기존 대비 절반으로 줄어드는지
- 960px 이하 단일열 레이아웃 동작이 그대로인지
