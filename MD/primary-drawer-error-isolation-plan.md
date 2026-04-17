# 1차 드로워 에러 격리 적용 계획

- 작성일자: 2026-04-15
- 변경일자: 2026-04-15
- 지시자: Yun Daeyoung

## 목적
- 1차 드로워에서도 API 실패와 렌더링 예외가 전체 화면에 전파되지 않도록 컴포넌트 단위로 격리한다.

## 영향 범위
- `dashboard-app/src/dashboard/components/ProductSummaryDrawer.tsx`

## 작업 계획
1. 2차 상세 데이터 API(`getProductSecondaryDetail`)에 에러 상태를 추가한다.
2. 에러 정보는 공통 타입(`ApiUnitErrorInfo`)으로 구성하고 `ERROR` 배지로 노출한다.
3. 1차 드로워 주요 카드 블록을 `ComponentErrorBoundary`로 감싼다.
4. 2차 패널 로딩 영역에 API 에러 fallback을 추가한다.

## 검증 포인트
- 2차 상세 API 실패 시 전체 드로워가 아닌 확장 패널 영역에만 에러 표시
- 카드 렌더링 예외가 전체 페이지로 전파되지 않음
- 린트/빌드 오류 없음
