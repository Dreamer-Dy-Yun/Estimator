# 재고·오더 모드 토글 및 라벨 정리 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 카드의 용어를 요청 기준으로 정리하고, 직접 입력 토글 기반 입력 UX로 전환한다.

## 변경 사항
- 표 라벨
  - `발주 제안` → `안전 재고`
  - `추천 발주량 (합계)` → `발주량 제안`
- `재고 및 오더` 제목 우측에 `직접 입력` 토글 추가
- 토글 ON(직접 입력):
  - `안전재고(직접입력)` + 입력란 + `EA`
  - 헬프 아이콘 없음
- 토글 OFF(안전재고 도출):
  - `안전재고 도출` + 헬프 아이콘
  - `서비스 수준` + 입력란(80~99.9) + `%`

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 검증 포인트
- 토글 상태에 따라 입력 필드/헬프가 정확히 전환되는지
- 서비스 수준 입력 범위(80~99.9) 유지
- 표 라벨 변경 반영
