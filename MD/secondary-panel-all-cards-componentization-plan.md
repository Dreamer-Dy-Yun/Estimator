# ProductSecondaryPanel 전체 카드 컴포넌트화 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `ProductSecondaryPanel.tsx` 내부의 남은 카드 블록도 동일한 규칙으로 분리하여, 패널 파일은 카드 조합/상태 오케스트레이션 중심으로 단순화한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- 신규 카드 파일:
  - `cards/ProductMetaCard.tsx`
  - `cards/ProductFilterCard.tsx`
  - `cards/SalesTrendDailyCard.tsx`
  - `cards/SizeOrderCard.tsx`
- 필요 시 타입 파일:
  - `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelTypes.ts`

## 작업 계획
1. 카드 경계 단위(메타, 필터, 판매추이, 사이즈오더)로 JSX를 추출한다.
2. 각 카드에 필요한 상태/핸들러를 `props` 객체로 전달한다.
3. `ProductSecondaryPanel`에서 해당 카드 컴포넌트만 호출하도록 교체한다.
4. 도움말 포털/툴팁 동작이 기존과 동일한지 확인한다.
5. 린트/빌드로 검증한다.

## 검증 포인트
- 카드 UI/입력/버튼 동작 불변
- 오더 확정/도움말/툴팁 동작 불변
- TypeScript 및 빌드 오류 없음
