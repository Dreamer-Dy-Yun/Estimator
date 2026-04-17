# 사이즈별 오더 표: 가중 비중 제거 및 비중 선그래프 행 추가

- 작성일자: 2026-04-16
- 변경일자: 2026-04-16
- 지시자: Yun Daeyoung

## 목적

- 표에서 `가중 비중 %` 행을 제거한다.
- `자사 비중 %` 행 위에, 사이즈 축으로 자사·경쟁사 비중을 나타내는 선그래프(2선) 행을 추가한다.

## 영향 범위

- `dashboard-app/src/dashboard/components/product-secondary/cards/SizeOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 검증 포인트

- 표에 선그래프 행이 `자사 비중` 바로 위에 보이는지
- 두 선(자사/경쟁사)이 사이즈별로 표시되는지
- 추천·확정 수량 로직은 기존과 동일한지(가중 비중은 패널에서만 계산)
