# 재고·오더 타이틀 본문 간격 조정 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `재고 및 오더` 카드의 타이틀과 내용 사이 간격을 `판매정보` 카드와 체감상 동일한 수준으로 맞춘다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 수정 방식
- `stockTitleRow` 하단에 여백을 추가하여 본문과의 간격을 확보한다.
- 기존 토글/타이틀 정렬 구조는 유지한다.

## 검증 포인트
- `재고 및 오더` 타이틀 아래 본문 시작 위치가 너무 붙어 보이지 않는지
- `판매정보` 카드의 타이틀-본문 간격과 유사한지
