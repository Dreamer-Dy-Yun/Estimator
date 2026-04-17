# 재고·오더 셀 1x2 컬럼 레이아웃 적용 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 2x2 영역의 각 셀을 `1x2`(레이블 컬럼 + 입력 컬럼) 구조로 명확히 분리한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. 셀 컨테이너(`stockInputCell`)를 1x2 grid로 고정한다.
2. 레이블과 입력 래퍼 클래스를 분리해 폭 충돌을 제거한다.
3. 타입별 입력 폭(number/date) 규칙을 분리한다.
4. 기존 공통 폭 강제 규칙의 영향 범위를 축소한다.

## 검증 포인트
- 각 셀이 레이블/입력 2컬럼으로 정렬되는지
- 일평균/안전재고/날짜 입력 폭이 독립 제어되는지
