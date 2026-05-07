# 프로젝트 정리 2026-05-07

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-07 |
| 상태 | 반영 완료 |

## Goal

프론트 mock이 브라우저 저장소를 DB처럼 바꾸던 흐름을 제거하고, 미사용 코드/스타일을 실제로 삭제해 코드량을 줄인다.

## Scope

- 후보군/이너 후보/관리자 유저 mock mutation의 프론트 저장 제거
- 후보군 seed와 인증 seed를 읽기 전용 기준 데이터로 정리
- 사용하지 않는 2차 패널 스타일 모듈 삭제
- API client의 과한 전달 함수 주석 삭제
- 루트의 Python 실험 스크립트, 생성 이미지, zip/pycache 산출물 제거
- 현재 기준 문서와 중복되는 오래된 계획/감사 MD 제거
- API 계약 문서와 source boundary 문서 갱신

## Principles

- 프론트 mock은 DB처럼 목록을 삽입/삭제/수정하지 않는다.
- 화면은 mutation 응답을 낙관 반영하지 않고 API 재조회 결과를 따른다.
- 후보 아이템의 실제 저장 스냅샷은 계속 `details` JSON이 단일 원천이다.
- UI 컴포넌트는 mock 파일을 직접 import하지 않고 `dashboardApi` 계약만 호출한다.

## Plan

1. 후보군 localStorage 어댑터와 관리자 유저 localStorage 저장을 제거한다.
2. mutation API를 계약 stub으로 바꾸고 화면은 재조회 흐름만 남긴다.
3. 배포 앱 경계 밖의 레거시 Python/zip/pycache 산출물, 중복된 옛 MD, mock API 호출 로그를 삭제한다.
4. 테스트를 "프론트 mutation 후 재조회 목록은 변하지 않는다"는 계약으로 바꾼다.
5. 문서, 테스트, 빌드, 배포를 함께 확인한다.

## Result

후보군/이너 후보/관리자 유저 mock mutation은 더 이상 브라우저 저장소를 변경하지 않는다. 후보군 목록은 seed 기반 재조회 결과만 표시하고, 관리자 목록도 정적 seed를 기준으로 한다. 코드 diff 기준 `dashboard-app/src`는 10% 이상 순삭제되도록 정리했다.

## Follow-Up Candidates

- 실제 백엔드 연결 시 create/update/delete 응답과 재조회 타이밍 확정
- 엑셀 업로드 API의 기간/포캐스트 입력 경로 확정
