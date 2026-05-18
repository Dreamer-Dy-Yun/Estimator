# 이너 후보군 조회·추천·오더 지표 SSE 계획

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-15 |
| 최종 수정일 | 2026-05-18 |
| 상태 | 구현 반영 문서 |
| 적용 범위 | 이너 후보군 조회, 추천 보기, 이너오더 리스트, CANDIDATE_ITEM/SKU UUID 관계, 오더 지표 SSE |

## 목적

이너 후보군 최초 로딩과 조회 버튼 실행 시, 백엔드가 조회 데이터 기간 기준으로 계산한 가벼운 상품 후보 목록을 먼저 내려주고, 계산량이 큰 `총 오더 수량`과 `총 오더 금액`은 이후 SSE로 항목별 비동기 갱신한다.

이 구조의 목표는 다음과 같다.

- 추천 보기와 이너오더 리스트가 같은 조회 기준 데이터를 공유한다.
- 상세확정 상태는 후보 아이템에 저장된 스냅샷 존재 여부로만 판단한다.
- 오더 수량·금액 계산은 초기 응답을 막지 않고, 항목별 로딩 상태로 표시한다.
- 추천 보기와 이너오더 리스트가 각각 수백 건 이상이어도 중복 필터링과 화면 갱신이 과도하게 느려지지 않게 한다.

## 전제

사용자가 예시로 든 응답 키는 프론트 기존 키와 맞춘다. 화면에 보이는 한글 필드는 다음 프론트 키로 받는다.

| 의미 | 프론트 키 |
|------|-----------|
| UUID | `uuid` |
| 브랜드 | `brand` |
| 품번 | `code` |
| 상품명 | `productName` |
| 색상 | `colorCode` |
| 자사 기간 총 판매량 | `insight.selfQty` |
| 크림 기간 총 판매량 | `insight.competitorQty` |
| 배지 | `insight.badges` |

각 DB 테이블은 고유한 `uuid` 컬럼을 갖는다. 따라서 프론트 계약에서도 `uuid`는 해당 응답 객체가 대표하는 테이블 레코드의 UUID로만 사용한다.

- `CandidateReferenceItemSummary.uuid`: 추천·조회 기준 상품 단위 UUID. 현재 DB 설계 기준으로는 `SKU.uuid`.
- `CandidateStashItemSummary.uuid`: 후보군에 담긴 후보 아이템 레코드 UUID.
- `CandidateStashItemSummary.skuUuid`: `CANDIDATE_ITEM.sku_uuid`이며, 후보 아이템이 가리키는 `SKU.uuid`.

추천 보기에서 이미 이너오더에 담긴 항목을 제외할 때는 후보 아이템 레코드 UUID가 아니라 `skuUuid`와 reference item의 `uuid`를 비교한다.

DB 테이블 기준 핵심 관계는 다음과 같다.

```text
CANDIDATE_ITEM.uuid       = 후보 아이템 레코드 UUID
CANDIDATE_ITEM.stash_uuid = CANDIDATE_STASH.uuid
CANDIDATE_ITEM.sku_uuid   = SKU.uuid
SKU.uuid                  = 추천/조회 기준 상품 UUID
```

## 현재 문제

현재 `CandidateItemSummary`는 다음 책임을 한 타입에 함께 들고 있다.

- 조회 기간 기준의 가벼운 표시 데이터
- 후보군에 담긴 후보 아이템의 상태
- 상세 스냅샷 확정 여부
- 총 오더 수량·총 오더 금액 같은 무거운 계산 결과
- 엑셀 다운로드용 오더 데이터

이 구조에서는 총 오더 계산이 늦어질 때 전체 리스트 응답도 늦어지고, 전체 SKU 분포가 필요한 배지/추천 계산 때문에 모달 첫 조회가 무거워질 수 있다.

## 목표 계약

### 1. 이너 후보군 조회 응답

조회 버튼과 최초 로딩은 같은 계약을 사용한다.

```ts
interface CandidateStashQueryParams {
  stashUuid: string;
  ownerUserUuid: string;
  dataReferencePeriodStart: string;
  dataReferencePeriodEnd: string;
}

interface CandidateStashItemSummary {
  uuid: string;
  skuUuid: string;
  hasSnapshot: boolean;
  snapshotUpdatedAt?: string;
}

interface CandidateItemListResult {
  candidateItems: CandidateStashItemSummary[];
  items: CandidateItemSummary[];
}
```

`getCandidateItemsByStash`는 후보군에 담긴 아이템만 빠르게 내려준다. 전체 SKU 분포 기반 배지와 추천 후보는 이 응답에 포함하지 않는다.

`candidateItems`는 해당 후보군에 실제로 담긴 후보 아이템 목록이다. 이 값은 후보군 소유, 상세확정 상태, 스냅샷 존재 여부를 나타낸다. `uuid`는 후보 아이템 레코드 UUID이고, `skuUuid`는 그 후보 아이템이 가리키는 `SKU.uuid`이다.

프론트는 다음처럼 표시한다.

- 이너오더 리스트: `items`를 먼저 표시한다.
- 배지 컬럼: `insightStatus === 'loading'`이면 `로딩중...`을 표시한다.
- 상태 컬럼: `hasSnapshot === true`이면 `상세확정`, 아니면 `상세미확정`.

### 2. 배지·추천 조회

추천 버튼 또는 백그라운드 prefetch는 별도 계약을 사용한다.

```ts
interface CandidateRecommendationParams {
  stashUuid: string;
  dataReferencePeriodStart: string;
  dataReferencePeriodEnd: string;
  limit?: number;
  cursor?: string;
}

interface CandidateRecommendationResult {
  recommendations: CandidateReferenceItemSummary[];
  nextCursor?: string | null;
}
```

백엔드는 조회 기간 전체 SKU 분포를 집계해 배지가 있는 SKU 목록만 계산한다. 전체 reference 목록을 프론트로 내려주지 않고 배지 있는 `recommendations` page만 반환한다. 이 목록에는 이미 후보군에 담긴 SKU가 포함될 수 있다. 프론트는 `CandidateItemSummary.skuUuid === recommendation.uuid`인 row를 기존 행 배지로 병합하고, 추천 UI에서는 해당 row를 숨긴다. 백엔드는 배지가 있는 현재 후보군 SKU를 응답에 포함하되, `limit/cursor`는 추천 UI에 노출될 신규 후보 기준으로 적용하는 구현을 권장한다.

### 3. 오더 지표 SSE

초기 조회 응답에는 `총 오더 수량`과 `총 오더 금액`을 포함하지 않는다. 초기 응답 이후 후보 아이템별로 SSE를 구독해 순차 갱신한다.

```ts
interface CandidateOrderMetricStreamParams {
  requestId: string;
  stashUuid: string;
  ownerUserUuid: string;
  dataReferencePeriodStart: string;
  dataReferencePeriodEnd: string;
  candidateItemUuids: string[];
}

type CandidateOrderMetricEvent =
  | {
      type: 'item';
      requestId: string;
      itemUuid: string;
      skuUuid: string;
      totalOrderQty: number;
      totalOrderAmount: number;
    }
  | {
      type: 'itemFailed';
      requestId: string;
      itemUuid: string;
      skuUuid: string;
      message: string;
    }
  | {
      type: 'completed';
      requestId: string;
      processedCount: number;
      failedCount: number;
    };
```

프론트는 `requestId`와 조회 기간을 비교해 stale SSE 이벤트를 버린다. 사용자가 조회 기간을 바꿔 다시 조회하면 이전 SSE 구독은 닫는다.

## 성능 원칙

추천 보기와 이너오더 리스트가 각각 수백 건 이상일 수 있으므로 다음 원칙을 적용한다.

- 중복 제거는 `Set<string>`으로 처리한다. 배열 중첩 비교를 피한다.
- 추천 응답 병합은 `skuUuid -> insight` `Map`으로 처리한다.
- SSE 이벤트는 전체 리스트를 다시 만들지 않고, `itemUuid` 기준 metric map만 갱신한다.
- 리스트 렌더는 정렬·필터 결과와 metric map을 분리해, 오더 지표 이벤트 하나가 들어올 때마다 추천 리스트까지 재계산하지 않는다.
- 행별 오더 지표 로딩 상태를 둔다. 값이 없으면 `계산 중` 또는 스피너를 표시하고, 실패 시 해당 행에만 실패 상태를 표시한다.
- 수백 건 이상의 SSE 이벤트가 짧은 시간에 몰리면, 프론트는 `requestAnimationFrame` 또는 짧은 배치 큐로 화면 갱신을 묶는 방식을 고려한다.

## 백엔드 구현 제안

백엔드는 Python 기준으로 다음 순서가 좋다.

1. 조회 기간과 사용자 UUID로 접근 가능한 후보군을 확인한다.
2. 조회 기간 내 판매 원천 데이터를 집계한다.
3. `getCandidateItemsByStash`는 후보군에 담긴 기본 아이템만 반환한다.
4. `getCandidateRecommendations`는 전체 후보 상품에 대해 배지 조건을 계산한다.
5. 배지가 있는 추천 후보 page를 반환한다.
6. 초기 응답이 끝난 뒤, 프론트가 SSE를 열면 후보 아이템별 총 오더 수량·총 오더 금액을 계산해 `item` 이벤트로 보낸다.

오더 지표 계산이 무거우면 백엔드는 다음 중 하나를 선택한다.

- 요청 시 즉시 계산하되 항목별로 이벤트를 흘린다.
- 조회 기간과 후보군 UUID 기준 캐시 키를 만들고, 같은 기간 재조회 시 캐시를 먼저 반환한다.
- 큐 기반 작업으로 계산하고 SSE는 작업 진행 상태를 전달한다.

캐시는 사용자가 조회 데이터 기간을 바꾸면 무효화되어야 한다. 후보 아이템 추가·삭제, 상세확정 일괄해제, 스냅샷 수정도 관련 캐시를 무효화한다.

## 프론트 변경 계획

현재 프론트 mock/API 대체 구현은 아래 계획을 기준으로 반영되어 있다. `getCandidateItemsByStash`는 후보군에 담긴 기본 행을 먼저 반환하고, `getCandidateRecommendations`는 배지 있는 추천 SKU page를 별도 반환한다. 총 오더 수량·금액은 `subscribeCandidateOrderMetrics` SSE로 행별 갱신한다.

1. API 타입 분리
   - `CandidateReferenceItemSummary`
   - `CandidateStashItemSummary`
   - `CandidateStashQueryResult`
   - `CandidateOrderMetricEvent`
2. API 호출부 분리
   - 기존 `getCandidateItemsByStash`를 조회 응답 계약에 맞춘다.
   - `getCandidateRecommendations`는 배지 패치와 추천 후보 page를 담당한다.
   - SSE 구독 함수는 `src/api` 뒤에 둔다.
3. 이너후보군 모델 정리
   - `recommendationInsightsBySkuUuid`
   - `candidateItemRows`
   - `recommendationRows`
   - `orderMetricsByItemUuid`
4. 추천 보기 필터링
   - 백엔드가 `candidateItems.skuUuid` 제외를 수행한다.
   - 프론트는 중복 row가 들어오면 방어적으로 숨긴다.
5. 이너오더 리스트 표시
   - 기본 정보는 조인된 reference item에서 표시한다.
   - 상세확정 상태는 candidate item의 `hasSnapshot`만 본다.
   - 총 오더 수량·총 오더 금액은 SSE metric map에서 표시한다.
6. SSE 상태 처리
   - 조회 시작 시 기존 SSE 구독 종료
   - 새 `requestId` 생성
   - 항목별 로딩 상태 초기화
   - `item`, `itemFailed`, `completed` 처리
7. 문서 갱신
   - `MD/backend-api/backend-api-spec.md`
   - `MD/dashboard-app/source-boundary-map.md`
   - 필요 시 테스트 전략 문서
8. 테스트
   - 추천 보기 중복 제외
   - 상세확정/상세미확정 상태
   - SSE item 이벤트 반영
   - stale SSE 무시
   - 수백 건 목록에서 Set 기반 파생 결과 확인

## UI 계획

- 초기 조회 직후 총 오더 수량·총 오더 금액은 각 행에서 로딩 상태로 표시한다.
- SSE로 값이 도착한 행만 숫자로 바뀐다.
- 실패한 행은 해당 셀에만 오류 상태를 둔다.
- 추천 보기에는 총 오더 수량·총 오더 금액을 표시하지 않는다.
- 상세확정 상태는 `상세확정` 또는 `상세미확정`으로 표시한다.

## 비목표

- 이 문서 단계에서는 실제 DB 스키마를 만들지 않는다.
- 이 문서 단계에서는 SSE 서버 구현을 만들지 않는다.
- 이 문서 단계에서는 스냅샷 저장 범위 자체를 줄이지 않는다.

## 후속 후보

- `skuGroupKey`를 백엔드 정식 UUID(`productUuid` 또는 `skuGroupUuid`)로 대체
- SSE 대신 WebSocket 또는 polling fallback 추가
- 계산량이 큰 오더 지표를 기간·후보군 기준으로 캐싱
- 수천 건 이상을 대비한 리스트 virtualization
- SSE item 이벤트 대량 수신 시 프론트 rendering batching 도입
