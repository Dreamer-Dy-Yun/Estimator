# 일평균 입력 시작 위치 정렬 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `일평균` 입력란의 시작 위치를 `LT 시작` 입력란 시작 위치와 시각적으로 맞춘다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. `일평균` input에 전용 클래스(`dailyMeanInput`)를 부여한다.
2. 전용 클래스 폭을 축소해 `LT 시작` 입력란과 시작 위치가 맞도록 조정한다.

## 검증 포인트
- `일평균` 입력 시작점과 `LT 시작` 입력 시작점 정렬 여부
- 다른 입력란 폭/정렬에는 영향 없음
