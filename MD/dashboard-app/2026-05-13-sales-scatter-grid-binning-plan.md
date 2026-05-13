# 고객사/자사 분석 산점도 격자화(quantization) 계획

## 0) 원본 지시 (사용자 요청)

현재 프로젝트의 고객사/자사 분석 그래프는 한 점 한 점이 제품을 나타내며 실제 사용 시 점이 겹치거나 구분이 어려운 문제가 있다.  
조회 시 백엔드에서 격자화한 결과를 받아와 각 격자에 포함된 항목 수량, 범위, 해당 항목 리스트를 받아 시각화하고 싶다.  
그래프 hover 시에는 범위/수량을, click 시에는 해당 셀의 항목 리스트만 표시되도록 변경한다.  
이 요청을 바탕으로 **원본 지시(요구사항)를 남기고, 이를 반영한 실행 계획을 MD로 남긴다.**

## 1) 목표

1. 자사/고객사 분석 산점도에서 점 겹침으로 인한 가독성 저하 해결
2. 백엔드 격자화 API 결과를 기반으로 셀 단위 집계 렌더링 전환
3. 셀 hover: 범위(축 값 범위) + 개수 표시
4. 셀 click: 해당 셀 항목 리스트만 조회/표시(기존 상세/리스트 뷰 필터)
5. 기존 API 계약·상태 관리·snapshot/캐시 로직 유지/보강

## 2) 범위

- 적용 범위
  - `dashboard-app/src/dashboard/pages/SelfPage.tsx`
  - `dashboard-app/src/dashboard/pages/CompetitorPage.tsx`
  - `dashboard-app/src/api/types/dashboard-api.ts`
  - `dashboard-app/src/api/types/sales.ts` (요청 파라미터 보강)
  - `dashboard-app/src/api/client.ts`
  - `dashboard-app/src/api/requests/dashboardRequests.ts`
  - `dashboard-app/src/api/mock/dashboardApi.ts`
  - `MD/dashboard-app/backend-api-spec.md` (필요 시 신규 엔드포인트/응답 반영)
  - `MD/dashboard-app/source-boundary-map.md` (큰 변경 시 최신화)

- 비범위
  - 차트 라이브러리 교체
  - 전체 데이터 모델/BI 흐름의 전면 리팩토링

## 3) 원칙

- `src/api` 경계를 유지하고, 타입은 `/types/*`에서 계약 우선 정의
- 기존 mock/실 API 동작을 동기화: mock에서 API contract을 따라 동일한 응답 형태 제공
- 정렬/필터/스냅샷/언마운트 안전성(기존 Drawer 보호 로직) 훼손 금지
- “누락 데이터에 대한 무음 보정값(fallback 0/빈배열)”은 기존 규칙을 따르며, 필요한 경우 명시적 빈 상태/에러 상태로 처리
- 사용자 경험: hover가 빠르게 반응하고, click은 즉시 셀 기준 목록 필터로 이어져야 함

## 4) 제안 API 계약

### 4.1 요청

- Self(자사) 격자
  - `getSelfSalesScatterGrid(params: SelfSalesGridParams): Promise<SelfSalesScatterGridResponse>`
- Competitor(고객사) 격자
 - `getCompetitorSalesScatterGrid(params: CompetitorSalesGridParams): Promise<CompetitorSalesScatterGridResponse>`

공통 쿼리/요청 항목

- `bucketSizeX`: X축(수량/매출/기준값) 격자 간격
- `bucketSizeY`: Y축 격자 간격
- `pointRadius` 또는 `pointDisplayMode`: 렌더링용(선택), 서버 기본값 fallback 가능
- 기존 검색/기간/필터 필드 유지

### 4.2 응답 제안

- `meta`
  - 축 최소/최대(버킷 생성 기준값)
  - 사용된 bucket size
  - 총 항목 수, 총 셀 수
  - 누락값 개수 (정의 시)
- `cells: ScatterGridCell[]`

`ScatterGridCell`

- `xBinStart`, `xBinEnd`, `yBinStart`, `yBinEnd`
- `xIndex`, `yIndex`(또는 셀 좌표키)
- `count`
- `skuIds: string[]` (해당 셀 구성 항목 식별자)
- `hasMoreSkuIds?` (대량일 경우 truncated 처리)
- `representativeX`, `representativeY` (차트 표시용 좌표)

추가 필드(추천)

- `cellKey`: `"x:y"` 형태
- `displayColor`: 셀 강조색(필요 시)

## 5) 구현 단계 (우선순위)

### 1단계: 타입·계약 정비

1. `dashboard-app/src/api/types/dashboard-api.ts`
   - `SelfSalesGridParams`, `CompetitorSalesGridParams`
   - `ScatterGridCell`, `ScatterSalesGridResponse`, `SelfSalesGridResponse`, `CompetitorSalesGridResponse` 추가
   - 기존 `SalesApiContract` 인터페이스 메서드에 격자 API 추가

2. `dashboard-app/src/api/types/sales.ts`
   - 필요 시 격자 요청 파라미터 필드 타입을 더 명확히 분리

3. `dashboard-app/src/api/client.ts`, `src/api/requests/dashboardRequests.ts`, `src/api/index.ts`
   - 클라이언트 진입점에 새 메서드 노출
   - mock/실 API 라우팅 시그니처 정렬

### 2단계: 문서 반영

4. `MD/dashboard-app/backend-api-spec.md`
   - 새 endpoint 정의:
     - `GET /dashboard/self/sales/grid`
     - `GET /dashboard/competitor/sales/grid`
   - 파라미터/응답 스키마, 에러 코드, 하위 호환 정책 추가

5. `MD/dashboard-app/source-boundary-map.md`
   - API contract 경계가 바뀌는 점(요청/응답·호출 지점) 반영

### 3단계: mock 데이터/리졸버 구현

6. `dashboard-app/src/api/mock/dashboardApi.ts`
   - 기존 `getSelfSales`, `getCompetitorSales` 결과를 재사용해 bucket 집계를 수행하는 공통 헬퍼 추가
   - `skuIds` 반환 방식
     - 단일 셀 제한 시 `skuIds` 상한선(`maxIdsPerCell`) 적용
     - `hasMoreSkuIds`로 truncation 표시
   - 기존 mock 계약 유지(호환성 깨지지 않도록 기본값은 기존 포맷 유지)

### 4단계: SelfPage Scatter 적용

7. `dashboard-app/src/dashboard/pages/SelfPage.tsx`
   - 기존 포인트 데이터(`scatterData` 개별 SKU)와 별도 모드로 격자 데이터 탑재
   - `useMemo`/state로:
     - `scatterGridData`(셀 단위)
     - `activeGridCellKey`
     - `activeGridSkuIds` 상태 추가
   - 차트:
     - hover → 커스텀 tooltip에 `x/y 범위, count`
     - click → `activeGridCellKey`와 `activeGridSkuIds` 갱신
     - 기존 `Scatter` 점 사이즈/색상은 셀 count 기반으로 조정
   - 리스트/상세 영역:
     - 기존 `rows`에서 `activeGridSkuIds`가 존재하면 해당 SKU만 표시
     - `activeGridSkuIds` 빈 값이면 기존 동작 유지
     - snapshot 기반 캐시 fallback은 유지(선택 셀 변경 시 flicker 방지)

### 5단계: CompetitorPage Scatter 적용

8. `dashboard-app/src/dashboard/pages/CompetitorPage.tsx`
   - SelfPage 동일 패턴 적용
   - click 시 적용 스펙은 동일하게 SKU 리스트 필터로 연결

### 6단계: 상호작용 일관성/오류 처리

9. 요청 상태 처리
   - 기본값: 격자 응답 실패 시 기존 점 데이터 또는 빈 셀 모드로 fallback(명시적 안내 메시지 포함)
10. 동시 요청 보호
    - 필터 변경 시 이전 요청 결과 무시 로직(기존 패턴과 동일한 생명주기 가드) 유지
11. 접근성
    - tooltip 키보드 안내/포커스 상태 고려(최소한 aria-label 및 설명 텍스트 보강)

## 6) 구현 순서(권장)

1. 타입/문서(backend spec, boundary)  
2. API mock + client 진입점  
3. SelfPage/CompetitorPage 기능 스위치  
4. 리스트 필터링 검증  
5. 엣지 케이스 보강 및 UI 상태 텍스트 보정  

## 7) 완료 기준(Definition of Done)

- 고객사/자사 산점도에서 격자 셀 모드 렌더링 동작
- hover tooltip에서 `[x범위, y범위], count` 표시
- 셀 클릭 시 해당 셀의 리스트 항목만 표시
- 실서비스/Mock 모두 동작
- backend-api-spec 및 source-boundary-map 갱신
- 기존 점(원본) 모드와의 회귀가 없거나 명시적으로 제어됨

## 8) 리스크 / 논의 필요사항

- `skuIds`를 full list로 주는 경우 응답 크기 증가 가능성
  - 필요 시 page token 또는 `sampleSkuIds + totalCount` 전략 고려
- 동일 좌표 다중 SKU가 매우 많은 경우 셀 반경/시각적 표현이 과밀해질 수 있음
  - bin size 기본값 튜닝 필요 (필터별 기본값/옵션 제공 고려)
- 제품 식별자 키 불일치(예: SKU vs code) 시 리스트 매칭 실패
  - 계약에서 단일 PK 명시 필수
