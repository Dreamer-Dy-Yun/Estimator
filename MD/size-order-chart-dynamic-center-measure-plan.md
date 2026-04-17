# 사이즈별 오더 차트 중앙 정렬 동적 측정 계획

- 작성일자: 2026-04-16
- 변경일자: 2026-04-16
- 지시자: Yun Daeyoung

## 목적
- 하드코딩된 컬럼 폭 없이, 표 헤더 셀의 실제 중앙 좌표를 기준으로 차트 점을 정렬한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/SizeOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- `thead` 사이즈 컬럼들의 실제 위치를 측정해 x좌표 배열을 만든다.
- `LineChart`를 숫자 X축(`type="number"`)으로 전환하고 측정된 x좌표를 데이터에 매핑한다.
- 컬럼 폭 고정용 CSS/colgroup 하드코딩을 제거한다.
