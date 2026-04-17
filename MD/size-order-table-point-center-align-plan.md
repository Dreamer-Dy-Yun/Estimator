# 사이즈별 오더 표 선그래프 점-컬럼 중앙 정렬 계획

- 작성일자: 2026-04-16
- 변경일자: 2026-04-16
- 지시자: Yun Daeyoung

## 목적
- 동적 사이즈 컬럼 개수에서도 선그래프 점이 각 컬럼 중앙에 정확히 매핑되도록 정렬한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/SizeOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- 사이즈 데이터 컬럼 폭을 고정(균등)해 셀 중심 기준을 명확히 한다.
- 그래프 행 셀의 좌우 패딩을 제거해 차트 좌표와 컬럼 경계를 일치시킨다.
- X축 내부 패딩 및 차트 좌우 마진을 제거한다.
