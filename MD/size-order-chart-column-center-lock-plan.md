# 사이즈별 오더 차트-컬럼 중앙 고정 정렬 계획

- 작성일자: 2026-04-16
- 변경일자: 2026-04-16
- 지시자: Yun Daeyoung

## 목적
- 표의 각 사이즈 컬럼 중심과 선그래프 점 중심을 정확히 일치시킨다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/SizeOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- 표에 `colgroup`을 추가해 `지표` 컬럼/사이즈 컬럼 폭을 명시한다.
- 차트 행 셀 패딩을 제거해 좌표 오프셋을 없앤다.
- 차트 X축 패딩/여백 0 설정을 유지해 셀 중앙과 점 좌표를 맞춘다.
