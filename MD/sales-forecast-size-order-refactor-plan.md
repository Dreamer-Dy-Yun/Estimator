# 판매 예측/사이즈별 발주 리팩터 계획

- 작성일: 2026-04-17
- 변경일: 2026-04-17
- 지시자: 사용자(윤대영)

## 배경
- `StockOrderCard`의 현재 기능이 "전체 발주 설정"보다 "판매 예측(사이즈 통합)"에 가까워졌음.
- `ProductSecondaryPanel` 및 타입 명칭이 여전히 `stock*` 중심으로 남아 있어 코드 의미와 어긋남.
- `SizeOrderCard` 상단 입력(여유재고/입고일)과 추천 수량 산식의 정합성 점검 필요.

## 목표
1. 파일명/컴포넌트명/주요 변수명을 현재 기능(판매 예측) 기준으로 정렬.
2. 사용되지 않는 레거시 props/상태/도움말 id 제거.
3. 중복 기능 및 산식 불일치 구간 점검 후 통일.

## 작업 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/cards/SalesForecastCard.tsx` (신규)
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelTypes.ts`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`

## 실행 계획
1. `StockOrderCard`를 `SalesForecastCard`로 파일/컴포넌트명 변경.
2. `ProductSecondaryPanel`에서 `stock*` 명칭을 `forecast*` 중심으로 정리.
3. 판매 예측 카드 props를 실제 사용 필드만 남기도록 축소.
4. KO 키는 의미형 신규 키를 추가하고, 카드에서 신규 키 우선 사용.
5. `SizeOrderCard` 추천 수량 산식에 여유재고 입력값 반영 여부 점검 및 적용.
6. 타입체크/린트 점검으로 리팩터 안정성 확인.

## 검증 항목
- 빌드 타입 검사 통과 (`npx tsc --noEmit`)
- 판매 예측 카드 정상 렌더
- 사이즈별 발주 상단 입력(여유재고/입고일) 동작
- 추천 수량 계산 로직이 의도대로 반영
