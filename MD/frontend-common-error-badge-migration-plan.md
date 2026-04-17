# 프론트 공통 ERROR 배지 전환 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- `product-secondary` 전용으로 만든 API 에러 배지를 프론트 공통 컴포넌트로 승격해 재사용한다.

## 영향 범위
- 신규 공통 컴포넌트
  - `dashboard-app/src/components/ApiUnitErrorBadge.tsx`
- 공통 타입 승격
  - `dashboard-app/src/types.ts`
- 기존 참조 교체
  - `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
  - `dashboard-app/src/dashboard/components/product-secondary/cards/*.tsx`
- 기존 전용 파일 정리
  - `dashboard-app/src/dashboard/components/product-secondary/cards/ApiUnitErrorBadge.tsx`
  - `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelTypes.ts`

## 작업 계획
1. 에러 정보 타입을 `src/types.ts`로 이동한다.
2. 공통 경로에 `ApiUnitErrorBadge`를 생성한다.
3. 기존 카드/패널 import를 공통 경로로 교체한다.
4. 전용 배지 파일과 중복 타입 선언을 제거한다.
5. 린트/빌드로 검증한다.

## 검증 포인트
- 기존 ERROR 동작(표시/호버/클립보드 복사) 유지
- product-secondary 외 영역에서도 재사용 가능한 import 경로 확보
- TypeScript/빌드 오류 없음
