# 오더 후보군 상세 신규 페이지 분리 계획

- 작성일자: 2026-04-21
- 변경일자: 2026-04-21
- 지시자: Yun Daeyoung (사용자)

## 목표
- 후보군 상세를 기존 `SnapshotConfirmPage` 내부 분기 방식이 아닌, 완전히 별도 페이지로 분리한다.

## 변경 범위
- `dashboard-app/src/dashboard/pages/SnapshotConfirmPage.tsx`
  - 목록 전용 페이지로 단순화
- `dashboard-app/src/dashboard/pages/SnapshotCandidateDetailPage.tsx` (신규)
  - 상세 검색/정렬/리스트/삭제 확인 UI 이관
- `dashboard-app/src/App.tsx`
  - 상세 라우트 컴포넌트 분리 연결

## 검증 항목
- 카드 클릭 시 신규 상세 페이지로 이동
- 목록/상세 페이지 파일 완전 분리 확인
- 상세 페이지 삭제 후 목록 복귀 정상 동작 확인
