# 오더 후보군 화면 스타일/검색/정렬 반영 계획

- 작성일자: 2026-04-21
- 변경일자: 2026-04-21
- 지시자: Yun Daeyoung (사용자)

## 목표
- 오더 후보군 화면의 시각 톤을 자사분석/경쟁사분석 화면과 유사한 카드+필터 구조로 정리
- 후보군 검색을 이름/비고 기준으로 지원
- 후보군 정렬을 생성일/변경일 기준으로 지원

## 영향 범위
- `dashboard-app/src/dashboard/pages/SnapshotConfirmPage.tsx`
  - 후보군 목록 상단 필터(이름, 비고, 정렬) UI 추가
  - 이름/비고 필터 + 생성일/변경일 정렬 파이프라인 적용
  - 상세 팝업 헤더에 변경일 표시
- `dashboard-app/src/dashboard/pages/SnapshotConfirmPage.module.css`
  - 후보군 목록 및 상단 필터 스타일 추가
- `dashboard-app/src/api/types/secondary.ts`
  - `CandidateStashSummary`에 `dbUpdatedAt` 필드 추가
- `dashboard-app/src/api/mock.ts`
  - 후보군 생성/아이템 추가 시 변경일 추적
  - 후보군 목록 조회 시 변경일 계산/반환

## 검증 체크
- 이름 검색/비고 검색이 각각 독립적으로 동작하는지 확인
- 생성일/변경일 정렬이 즉시 반영되는지 확인
- 후보군 상세 팝업의 변경일 표시 확인
- 후보군 추가 후 변경일이 갱신되는지 확인
