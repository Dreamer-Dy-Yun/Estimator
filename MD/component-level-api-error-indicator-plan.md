# 컴포넌트 단위 API 에러 표시 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- API 요청 실패 또는 필수 데이터 부재 시 페이지 전체를 깨뜨리지 않고, 해당 컴포넌트에 `ERROR` 표기를 노출한다.
- `ERROR` 호버 시 상세 정보를 볼 수 있고, 클릭 시 상세 정보가 클립보드로 복사되도록 한다.

## 요구 상세
- 표기 정보:
  - 에러 확인 시간
  - 페이지
  - 호출 내용
  - 에러 내용
- 설계:
  - 상위(`ProductSecondaryPanel`)에서 페이지명을 매개변수로 받아 하위 에러 정보에 주입
  - 공통 에러 배지 컴포넌트로 재사용

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelTypes.ts`
- `dashboard-app/src/dashboard/components/product-secondary/cards/*Card.tsx` 일부
- 신규:
  - `dashboard-app/src/dashboard/components/product-secondary/cards/ApiUnitErrorBadge.tsx`

## 검증 포인트
- API 실패 시 해당 카드에만 `ERROR` 배지 표시
- hover(tooltip/title) 상세 노출
- click 시 상세 문자열 클립보드 복사
- 린트/빌드 오류 없음
