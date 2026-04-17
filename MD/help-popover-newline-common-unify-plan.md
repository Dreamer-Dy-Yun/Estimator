# 물음표 툴팁 줄바꿈 공통화 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 물음표 툴팁의 `\n` 줄바꿈 동작을 전 항목에서 동일하게 적용한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/common.module.css`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 수정 방식
- 공통 툴팁 문단 스타일(`.helpPopoverPortal p`)에 `white-space: pre-line`을 적용한다.
- 특정 항목(`safetyStockCalc`)에만 적용하던 인라인 스타일을 제거한다.

## 검증 포인트
- `\n`이 포함된 툴팁에서 줄바꿈이 일관되게 동작하는지
- 기존 툴팁 표시/호버 동작에 회귀가 없는지
