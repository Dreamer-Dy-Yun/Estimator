# 서비스수준 물음표 헬프 복원 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `서비스 수준` 입력 항목에 물음표 헬프를 다시 노출한다.
- 단, `안전재고 직접입력`이 켜진 상태에서는 서비스수준 항목이 숨겨지므로 물음표도 표시하지 않는다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/cards/StockOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 수정 방식
- `StockOrderCard`의 `서비스 수준` 레이블에 `PortalHelpMark(helpId: serviceLevel)`를 조건부로 추가한다.
- `StockOrderCard` props의 `help.labelIds`에 `serviceLevel` 식별자를 추가한다.
- 상위 `ProductSecondaryPanel`에서 `serviceLevelHelpId`를 `StockOrderCard`에 전달한다.

## 검증 포인트
- 계산식 모드에서 `서비스 수준` 레이블 우측에 물음표가 보이는지
- 직접입력 모드에서 `서비스 수준`/물음표가 동시에 사라지는지
