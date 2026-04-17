# 재고·오더 입력란 가용폭 채움 적용 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 1x2 셀에서 입력란이 각 셀의 입력 컬럼 가용 너비를 최대한 채우도록 조정한다.
- 단위 라벨(`EA/일`, `EA`, `%`)은 계속 표시한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 작업 계획
1. 입력 래퍼를 full-width로 유지하고 내부에서 input이 남는 폭을 차지하도록 수정
2. 단위 라벨은 고정폭 없이 우측 유지
3. number/date 입력 공통 폭 고정값 제거 및 width:100% 기반으로 변경

## 검증 포인트
- 각 셀 입력란이 가용폭 내에서 확장되는지
- 단위 라벨이 사라지지 않고 우측에 표시되는지
