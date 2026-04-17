# LT 시작/종료 기본값 조정 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 입력의 LT 기본값을 기간 기준값이 아닌 현재 시점 기준으로 설정한다.

## 변경 사항
- LT 시작 기본값: 오늘(로컬 날짜, YYYY-MM-DD)
- LT 종료 기본값: 오늘 기준 3개월 후 동일 일자(가능한 범위)

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 검증 포인트
- 첫 렌더 시 LT 시작/종료가 요구 기본값으로 노출되는지
