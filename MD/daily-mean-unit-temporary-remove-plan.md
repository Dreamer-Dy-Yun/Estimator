# 일평균 단위 텍스트 임시 제거 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `EA/일` 단위 텍스트 길이가 입력박스 폭에 미치는 영향을 확인하기 위해 임시 제거한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`

## 작업 계획
1. 일평균 입력 오른쪽의 `EA/일` 단위 표시를 제거한다.
2. 다른 입력 셀/단위는 유지한다.

## 검증 포인트
- 일평균 입력박스 폭/정렬 정상화 여부
