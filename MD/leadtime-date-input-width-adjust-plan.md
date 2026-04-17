# 리드타임 날짜 입력 폭 80% 조정 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더의 LT 시작/종료 날짜 입력란 가로 폭을 현재 대비 80%로 축소해 레이아웃 밀도를 개선한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. 날짜 input 전용 width 값을 기존 대비 80%로 축소한다.
2. 다른 number/text input 폭에는 영향이 없도록 date selector 범위만 수정한다.

## 검증 포인트
- LT 시작/종료 날짜 입력란만 폭 축소되는지
