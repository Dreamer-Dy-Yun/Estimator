# Snapshot 후보군 상세 리스트 필터/정렬 개선 계획

- 작성일자: 2026-04-21
- 변경일자: 2026-04-21
- 지시자: Yun Daeyoung (사용자)

## 요청 사항
- 상세 팝업 상품 리스트를 2열이 아닌 1열 카드 리스트로 변경
- 검색창을 분리하여 브랜드/상품코드/상품명 각각 입력 검색 지원
- 정렬 옵션 추가
  - 수량: 내림차순/오름차순
  - 예상 매출: 내림차순/오름차순

## 영향 범위
- `dashboard-app/src/api/types/secondary.ts`
  - 후보군 아이템 요약 타입 확장(수량, 예상매출)
- `dashboard-app/src/api/mock.ts`
  - 후보군 아이템 조회 시 snapshot 기반 수량/예상매출 계산값 제공
- `dashboard-app/src/dashboard/pages/SnapshotConfirmPage.tsx`
  - 개별 검색 상태 및 정렬 상태 추가
  - 필터/정렬 파이프라인 적용
  - 카드 항목 표시 정보 확장
- `dashboard-app/src/dashboard/pages/SnapshotConfirmPage.module.css`
  - 1열 리스트 레이아웃, 검색/정렬 컨트롤 스타일 보강

## 검증 계획
- 브랜드/상품코드/상품명 필드 각각 독립 검색 동작 확인
- 정렬 옵션 4개 선택 시 결과 순서 즉시 변경 확인
- 수량/예상매출이 카드에 노출되고 정렬 기준과 일치하는지 확인
