# 요청 경계 정리 전략 (프론트 인터페이스 중심)

## 상태
- 완료 (요청 경계 정리 반영됨)

## 목적
- 백엔드 구현을 여기서 하지 않는다.
- 화면에서 데이터 접근 경계를 `api` 인터페이스로 통일한다.
- 컴포넌트는 데이터 소스를 직접 알지 않고 `dashboardApi`만 사용한다.

## 원칙
- 모든 데이터 읽기/쓰기/생성은 `src/api` 경유
- 컴포넌트/페이지에서 `mock*` 파일 직접 호출 금지
- 화면은 요청 상태(`loading/error/success`)와 렌더링만 담당
- mock은 `src/api/mock.ts` 내부 구현으로만 유지

## 조치 결과
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
  - 데이터 접근이 `dashboardApi` 경유로 통일됨
- `dashboard-app/src/dashboard/components/product-secondary/mockSecondaryData.ts`
  - 삭제 완료 (데이터 소스 책임 제거)
- `dashboard-app/src/dashboard/components/product-secondary/secondaryPanelCalc.ts`
  - 순수 계산 유틸 분리 완료

## 목표 구조
- 타입 경계: `src/api/types.ts`
- 호출 경계: `src/api/client.ts` + `src/api/index.ts`
- mock 구현: `src/api/mock.ts`
- 화면: `dashboardApi.*` 호출만 수행

## 실행 계획

### Phase 1: 인터페이스 단일화 (핵심)
1. `src/api/types.ts`에 2차 드로워에 필요한 요청/응답 타입만 정의
2. `src/api/client.ts`에 대응 함수 시그니처 추가
3. `src/api/index.ts` export 정리
4. `ProductSecondaryPanel.tsx`에서 데이터 접근을 `dashboardApi` 호출로만 변경

완료 기준:
- `ProductSecondaryPanel.tsx`에서 `mockSecondaryData` 직접 import 없음
- 데이터 변경은 API 응답 반영으로만 갱신

### Phase 2: 컴포넌트 하위 mock 정리
1. `product-secondary/mockSecondaryData.ts`에서 데이터 소스/저장 책임 제거
2. 남기는 건 순수 계산 유틸(UI 계산 보조)만
3. 필요 시 파일 분리/이름 변경으로 역할 명확화

완료 기준:
- 데이터 소스 역할이 `src/api` 외부에 존재하지 않음

### Phase 3: 전역 일관성 점검
1. pages/hooks/components에서 `dashboardApi/get*` 우회 경로 전수 점검
2. 우회 경로 발견 시 동일 패턴으로 `src/api` 경계로 이동

완료 기준:
- 화면 레이어에서 데이터 직접 생성/저장/목업 호출 없음

## 체크리스트
- [x] `src/api/types.ts` 타입 경계 정리
- [x] `src/api/client.ts` 함수 경계 정리
- [x] `src/api/index.ts` export 정리
- [x] `ProductSecondaryPanel.tsx`의 direct mock 참조 제거
- [x] `product-secondary/mockSecondaryData.ts` 역할 축소/제거
- [x] 빌드/린트 통과

## 비범위 (이번 전략에서 하지 않음)
- 실제 백엔드 서버 구현
- 엔드포인트 상세 설계/운영 정책
- 인증/권한/배포 파이프라인 작업
