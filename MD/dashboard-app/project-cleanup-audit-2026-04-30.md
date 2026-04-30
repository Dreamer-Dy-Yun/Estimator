# 프로젝트 구조 정리 감사 노트

## Goal

`dashboard-app` 전체에서 불필요하게 커진 파일, 중복 표현, UI와 API 경계가 흐린 부분, 기능과 이름이 어긋난 부분을 확인하고 바로 처리 가능한 항목부터 정리한다.

## Scope

- `dashboard-app/src`의 TS/TSX/CSS 모듈
- 후보군 상세 모달, 추천 보기 모달, 후보 배지, 후보 아이템 LLM 최신성 플래그
- mock API 계약과 로컬 레코드 타입

## Principles

- 화면은 `src/api` 계약만 사용하고 mock 내부 파일을 직접 import하지 않는다.
- 개발 단계이므로 예전 필드명 호환성 코드를 유지하지 않는다.
- 큰 파일을 한 번에 갈아엎지 않고, 기능 경계가 선명한 덩어리부터 분리한다.
- 명명은 “어디에 붙어 있었는가”보다 “무엇을 하는가”를 기준으로 맞춘다.

## Findings

1. `CandidateStashDetailModal.tsx` 안에 추천 보기 팝업의 테이블, 선택 상태 UI, 전체 선택 indeterminate 처리가 같이 들어가 있었다. 상세 모달의 책임과 추천 적용 UI 책임이 섞여 있었다.
2. 후보 배지 렌더러 이름이 `InnerOrderBadge`였지만 추천 보기 팝업에서도 같은 배지를 사용했다. 기능 기준으로는 “후보 인사이트 배지”에 가깝다.
3. `detailHeaderAnalysisCell`, `detailHeaderAnalysisBtn`은 실제로 LLM 분석이 아니라 `추천 보기` 버튼 위치를 뜻한다. 기능과 CSS 클래스명이 어긋나 있었다.
4. 판매량 표기 `n EA`가 `CandidateStashDetailModal` 지역 함수로 들어가 있어 추천 모달 분리 시 중복되기 쉬운 상태였다.
5. `CandidateItemRecord.isLatestLlmComment`가 선택형이고 mock API에서 `?? true`로 보정했다. 현재 개발 단계에서는 필드 누락을 조용히 보정하기보다 계약을 명시하는 편이 낫다.
6. 남은 대형 파일 후보는 `ProductSecondaryPanel.tsx`, `common.module.css`, `dashboardApi.ts`, `SnapshotConfirmPage.module.css`다. 이들은 기능 영향 범위가 넓어 별도 단계로 나누는 편이 안전하다.

## Plan

1. 추천 보기 UI를 `CandidateRecommendationModal`로 분리한다.
2. 후보 배지를 `CandidateInsightBadges`로 분리하고 추천 모달/상세 목록에서 함께 사용한다.
3. 추천 모달 CSS를 별도 CSS Module로 옮겨 `SnapshotConfirmPage.module.css`의 팝업 책임을 줄인다.
4. `detailHeaderAnalysis*` 명명을 `detailHeaderRecommendation*`으로 바꾼다.
5. `formatEaQuantity`를 공통 포맷 유틸로 추가해 EA 판매량 표기를 한 곳으로 모은다.
6. `isLatestLlmComment`를 mock 레코드/API payload에서 필수 필드로 맞추고, 필드 누락 보정 로직을 제거한다.

## Result

- 추천 보기 모달과 후보 배지 UI를 독립 파일로 분리했다.
- `CandidateStashDetailModal.tsx`의 추천 팝업 JSX와 팝업 전용 CSS를 제거했다.
- 추천 버튼 관련 CSS 이름을 기능에 맞춰 변경했다.
- EA 판매량 포맷을 공통 유틸로 올리고 테스트를 추가했다.
- `isLatestLlmComment`를 필수 계약으로 고정하고 mock seed에는 명시적으로 값을 넣었다.
- `npm run build`, `npm run test:run` 통과.

## Non-goals / Follow-up Candidates

- `ProductSecondaryPanel.tsx`: 저장/후보군 액션/LLM 상태 표시를 훅 또는 작은 컴포넌트로 추가 분리.
- `dashboardApi.ts`: 후보군 localStorage CRUD, LLM 분석 job 시뮬레이션, 상품 인사이트 계산을 mock 하위 모듈로 분리.
- `common.module.css`: 실제 공용 스타일과 특정 화면 전용 스타일을 다시 분류.
- `SnapshotConfirmPage.module.css`: 후보군 상세 모달 CSS를 추가로 모달 전용 모듈로 분리.
