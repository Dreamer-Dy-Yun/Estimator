# 재고·오더 백업 보호 및 신규 파일 생성 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 현재 재고·오더 컴포넌트를 백업 용도로 보존한다.
- 신규 작업용 파일을 별도로 생성해 기존 파일과 분리한다.
- 기존 백업 파일은 명시적 파일 지정 지시가 없는 한 삭제하지 않도록 파일 상단에 보호 주석을 추가한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCardNext.tsx` (신규)

## 작업 계획
1. 기존 `StockOrderCard.tsx`를 백업으로 유지한다.
2. 신규 작업 시작점 파일 `StockOrderCardNext.tsx`를 생성한다.
3. 기존 파일 상단에 삭제 금지 보호 주석을 추가한다.

## 검증 포인트
- 기존 컴포넌트 동작 및 import 경로 변경 없음
- 신규 파일 생성 성공
- 보호 주석이 파일 최상단에 명확히 표기됨
