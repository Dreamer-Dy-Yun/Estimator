# 재고·오더 2x2 입력 그리드 재구성 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 재고·오더 표 상단 입력 영역을 요청하신 2x2 고정 배치로 정리한다.

## 요구 반영
- 좌상: 평균 일 판매량 + 텍스트 입력
- 우상: 안전재고 + 텍스트 입력 + 작은 기어 버튼(계산식/직접입력 선택)
- 좌하: 리드타임 시작일(짧은 명칭)
- 우하: 리드타임 종료일(짧은 명칭)
- 계산식 모드 선택 시 서비스수준 입력 노출 유지

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- `dashboard-app/src/dashboard/components/product-secondary/productSecondaryPanel.module.css`

## 검증 포인트
- 2x2 배치가 깨지지 않는지
- 수치 입력/날짜 입력이 기대대로 반영되는지
- 계산식/직접입력 전환 및 서비스수준 노출 조건 유지
