# 컴포넌트 렌더링 에러 경계 추가 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- API 실패 처리 외에 렌더링/동기 예외도 상위로 전파되지 않도록 컴포넌트 단위 에러 경계를 추가한다.

## 영향 범위
- 신규 공통 컴포넌트:
  - `dashboard-app/src/components/ComponentErrorBoundary.tsx`
- 적용 대상:
  - `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`

## 작업 계획
1. 공통 `ComponentErrorBoundary`를 생성한다.
2. 에러 발생 시 `ERROR` 표시 및 상세(시간/페이지/호출/에러) 정보를 제공한다.
3. `ProductSecondaryPanel`의 카드/섹션 호출부를 boundary로 감싼다.
4. 빌드/린트로 검증한다.

## 검증 포인트
- 특정 카드 렌더링 예외가 전체 페이지를 죽이지 않음
- 에러 상세 hover 및 click 복사 가능
- TypeScript/빌드 오류 없음
