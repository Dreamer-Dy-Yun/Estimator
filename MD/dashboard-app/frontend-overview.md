# dashboard-app Frontend Overview

Last updated: 2026-06-10

## Purpose

이 앱은 자사/경쟁사 분석, 상품드로워 기반 주문계획, 후보군 관리, 스냅샷 저장/복원을 제공합니다.

## Main flows

- 로그인 → 세션 생성 → 회사 목록 로딩
- 로그인 화면은 HTTP/mock mode 모두 자격증명 기본값을 자동 채우지 않음
- 회사 선택이 read scope를 결정
- Self/Competitor 분석 페이지에서 공통 쿼리로 목록/산점도 조회
- 분석 리스트는 체크박스, 판매 순위, 상품 썸네일, 상품 식별자, 지표 컬럼을 분리해 표시
- 분석 필터/행 선택/후보군 액션을 서로 분리
- 상품드로워에서 요약/추세/2차 상세를 on-demand로 조회
- 후보군 스냅샷 저장/복원 플로우
- 관리자 화면에서 사용자/키/Google Sheet 설정 관리

## Product drawer

- 월별 추세는 최근 24개월 + 12개월 예측 기반으로 구성
- 일일 추세는 시작월의 1일 ~ 어제 구간 + 리드타임 기반 예측 반영
- 상품드로워의 기준/비교 대상은 `base`/`comparison` subject 계약으로 조회
- 1차 bundle은 기준 자사 summary만 필요하므로 base-only로 조회
- AI 코멘트는 버튼 클릭 시에만 요청
- 초기화는 현재 계산값 기준 상태로 복귀하고 AI 코멘트 상태를 초기화
- 상세 저장은 `OrderSnapshotDocument` v3를 후보군 item의 `details`에 저장

## Candidate stash

- 후보군은 단일 회사 스코프 기반으로 동작
- 전체 스코프에서는 후보군 진입/후보군 추가 비활성화
- 이너 후보군과 추천 보기는 row summary의 `thumbnailUrl`을 `ProductThumbnailCell`로 표시하고, 썸네일 hover 미리보기를 공통 사용
- 이너 후보군은 기본 item 목록과 추천 목록을 분리해 조회하고, 총 오더 수량/금액은 row 단위 SSE로 갱신
- 추천 상태는 `applied`, `stale`, `no-op`, `empty-selection`으로 구분
- 상세 unconfirm은 `details = null` 처리

## Source layout

- `src/api`: API facade, adapter, mock, 타입 계약
- `src/auth`: 인증/권한
- `src/admin`: 관리자 화면
- `src/dashboard/pages`: 페이지 레벨 오케스트레이션
- `src/dashboard/components/candidate-stash`: 후보군 UI/훅
- `src/dashboard/components/product-drawer`: 드로워 UI/훅
- `src/dashboard/components/ProductThumbnailCell.tsx`: 분석/후보군 리스트 공용 썸네일 표시와 hover 미리보기
- `src/dashboard/components/common.module.css`: 대시보드 공용 CSS 파사드
- `src/styles`: 전역 토큰/기본 스타일
- `src/snapshot`: 스냅샷 계약·파서
- `src/utils`: 공유 유틸
