# 대시보드 코드 정리 계획

- 작성일: 2026-04-22
- 변경일: 2026-04-22
- 지시자: Yun Daeyoung

## 목표
- 불필요한 코드/문구 키를 제거해 유지보수 비용을 낮춘다.
- 기능 대비 이름이 어색한 지점을 정리 기준으로 분류한다.
- 동작 변경 없이 구조적 정리만 우선 적용한다.

## 범위
- `dashboard-app/src/dashboard/components/product-secondary/*`
- `dashboard-app/src/dashboard/pages/SnapshotConfirmPage*`
- 관련 공통 스타일/문구 파일

## 정리 기준
1. **확실히 미사용인 항목만 즉시 삭제**
2. **동작 영향이 있는 리네이밍은 2차로 분리**
3. **문구 체계(KO 키)와 하드코딩 혼재는 키로 통일**

## 실행 계획
1. `ko.ts` 미사용 키 제거(참조 0건 검증 후 삭제)
2. 하드코딩 문구를 `KO` 키로 치환(기능 동일)
3. 타입/린트 검증
4. 2차 후보(파일명 정리) 목록화만 수행

## 실행 결과
- 완료: `ko.ts` 미사용 키 정리
  - 제거: `sectionProductFilter`, `btnCreateCandidate`, `msgCandidateCreated`, `msgCandidateSelected`, `msgCandidateAppendDone`, `msgCandidateSelectRequired`, `msgCandidateCreateFailed`
- 완료: 하드코딩 문구를 `KO` 키로 치환
  - 추가: `btnDelete`, `msgNoNote`
  - 적용: `candidateActionCards.tsx`, `ProductSecondaryPanel.tsx`
- 완료: 린트 확인(오류 없음)

## 추가 통합(중복 기능)
- 완료: 이너 후보 삭제 버튼 중복 구현 제거
  - 기존: `candidateActionCards.tsx` 내 SVG/색상 커스텀 삭제 버튼 직접 구현
  - 변경: 공통 `DeleteButton` 컴포넌트로 통일
  - 정리: `productSecondaryPanel.module.css`의 `btnCandidateItemDelete*` 스타일 블록 삭제
- 완료: 후보군 날짜 포맷 중복 함수 제거
  - 기존: `formatCandidateDateLabel()` 별도 구현(`toLocaleString`)
  - 변경: 공통 `formatDateTimeMinute()` 사용으로 통일

## API 호출 규칙 정리 계획 (추가 지시 반영)
- 변경일: 2026-04-22
- 지시자: Yun Daeyoung

### 목표
- 화면/훅은 API를 "호출만" 하고, 목업 반환/호출 흔적(assert/로그)은 API 레이어에서 처리
- API(mock) 레이어가 UI 컴포넌트를 import하지 않도록 계층 분리
- 비동기 경쟁 상태로 인한 오래된 응답 덮어쓰기 방지

### 실행 항목
1. `api/mock.ts`의 UI 의존 import 제거 (`buildSalesKpiColumn`, `secondaryPanelTypes` 타입 의존 제거)
2. `api/client.ts`의 브라우저 `alert` 제거, API 레이어 로그(assert 성격)로 변경
3. `SelfPage`/`CompetitorPage` fetch 경쟁 상태 방지(request seq + cancel guard)
4. `useProductDrawerBundle` 에러 경로 추가(실패 시 무한 null 정체/미처리 promise 방지)

### 실행 결과
- 완료: `api/mock.ts` UI 계층 의존 제거
  - 제거: `../dashboard/components/...` import
  - 추가: API 레이어 내부 전용 KPI/forecast 타입 + `buildMockSalesKpiColumn()`
- 완료: `api/client.ts` 호출 흔적 처리 정리
  - 변경: `window.alert` 제거, API 레이어 `console.info([API CALLED] ...)`로 통일
- 완료: `SelfPage`/`CompetitorPage` 비동기 경쟁 상태 방지
  - 적용: request sequence ref + alive guard
- 완료: `useProductDrawerBundle` 실패 경로 처리
  - 적용: `catch` 추가 + 현재 선택 품번 캐시 정리
- 완료: 변경 파일 린트 확인(오류 없음)

### 추가 실행 결과 (중복 제거)
- 완료: `SelfPage`/`CompetitorPage` 기간 필터 중복 로직 공통 훅화
  - 추가: `src/dashboard/hooks/usePeriodRangeFilter.ts`
  - 제거: 각 페이지 내부 `periodStartIdx/periodEndIdx`, preset/whole-range/date-change/range-change 중복 코드
- 완료: 빈 `PageHeader` 전달 제거
  - `title=""`, `badge=""` 사용 제거 (`SelfPage`, `CompetitorPage`)

## 다음 라운드 반영 (지시: Yun Daeyoung)
- 변경일: 2026-04-22

### 목표
- API 호출부(`client.ts`)는 위임만 수행하고 호출 로그 정책은 API(mock) 레이어로 완전 이동
- `SnapshotConfirmPage` / `CandidateStashDetailModal`의 삭제 확인 모달 중복 JSX 제거

### 실행 결과
- 완료: API 호출 로그 책임 이동
  - 제거: `client.ts`의 `notifyApiCalled()` 및 개별 API 함수 후처리 로그 호출
  - 추가: `mock.ts`의 `logApiCalled()` 단일 함수 + 관련 API 메서드 내부 로그 호출
- 완료: 공통 `ConfirmModal` 컴포넌트 도입
  - 추가: `src/dashboard/components/ConfirmModal.tsx`
  - 치환: `SnapshotConfirmPage.tsx` 삭제 확인 모달
  - 치환: `CandidateStashDetailModal.tsx` 후보군 삭제/상품 삭제 모달
  - 정리: `SnapshotConfirmPage.module.css`의 미사용 `confirmModalTrashIcon*` 스타일 삭제

## 폴백/임의 계산 제거 계획 (지시: Yun Daeyoung)
- 작성일: 2026-04-22
- 변경일: 2026-04-22
- 지시자: Yun Daeyoung

### 목표
- 임의 계산/보정 폴백 제거
- 스냅샷 원천값 우선이 아닌 경로 제거
- 데이터 누락 시 조용한 대체값 대신 명시적 오류 처리

### 적용 범위(1차)
- `api/mock.ts`의 `getCandidateItemsByStash` (이너 오더 리스트 데이터 매핑)
- `CandidateStashDetailModal.tsx`의 이너 오더 로드/표시 오류 경로

### 실행 원칙
1. 수치 필드(`orderAmount`, `expectedSalesAmount`, `expectedOpProfit`)는 스냅샷 값만 사용
2. `fallbackPrimary`, 임의 단가/원가/수수료 보정 계산 제거
3. 필수 스냅샷 필드 누락 시 예외 발생
4. UI는 오류 메시지를 사용자에게 명시적으로 표시

## 2차 후보(이번 턴 미적용)
- `SnapshotConfirmPage.module.css` 명칭이 실제 용도(모달 공용)와 완전 일치하지 않음
  - 파일명 변경 시 import 경로 파급이 커서 별도 작업으로 분리

