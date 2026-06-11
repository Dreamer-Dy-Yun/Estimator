# Candidate Stash Boundary

Last updated: 2026-06-11

## Responsibility

Candidate stash owns order candidate lists, item detail drawer entry, recommendation rows, order metric SSE, detail confirmation, item/stash mutation, and Excel upload/download.

## Current list and thumbnail contract

- 이너 후보군 리스트의 표시 순서는 체크박스, 화면 순서 숫자, 이미지, 상품 식별자, 상태, 기간 판매량, 오더 지표 순서다.
- 화면 순서 숫자는 현재 필터/정렬 결과의 표시 순서이며, 별도 비즈니스 rank가 아니다.
- 이너 후보군 기본 row는 `CandidateItemSummary.thumbnailUrl`, 추천 보기 row는 `CandidateReferenceItemSummary.thumbnailUrl`을 표시한다.
- `CandidateStashItemSummary`는 stash item 상태/식별자용 slim DTO이므로 썸네일을 갖지 않는다.
- 썸네일 표시는 `ProductThumbnailCell` 공통 컴포넌트가 소유한다. 이너 후보군과 추천 보기는 같은 hover preview 동작을 공유하고, 화면은 URL fallback이나 운영용 placeholder URL을 만들지 않는다.

## Scope

- Candidate stash workflows require one selected company.
- All-company header state disables candidate stash workflows.
- Candidate mutations, jobs, and SSE must not fall back to a default company.

## Main files

| File | Responsibility |
|---|---|
| `SnapshotConfirmPage.tsx` | Candidate stash page composition |
| `useCandidateStashDetailModal.ts` | Detail modal orchestration |
| `candidateStashDetailModalModel.ts` | Detail modal public hook args/model contract |
| `useCandidateItemsLoader.ts` | Item list load |
| `useCandidateOrderMetricCoordinator.ts` | Comparison target availability, comparison-change reload, and appended-item metric subscription coordination |
| `useCandidateRecommendations.ts` | Recommendation load and append state |
| `useCandidateOrderMetricStream.ts` | Order metric SSE |
| `useCandidateBulkDetailConfirm.ts` | Bulk detail confirm job/SSE |
| `useCandidateStashItemActions.ts` | Delete/unconfirm item actions |
| `CandidateStashProductDrawer.tsx` | Product drawer bridge for candidate item |

## Recommendation append states

| State | Meaning |
|---|---|
| `applied` | Response item matched current stash/company/period/membership and was inserted locally. |
| `stale` | Scope, period, stash, or membership changed after request start. |
| `no-op` | Request succeeded but no new row was reflected. |
| `empty-selection` | User submitted no recommendation rows. |

## Data rules

- Recommendation response items must match selected recommendation source rows.
- Existing row data remains visible on refresh failure.
- SSE failure marks target rows/cells failed; it does not clear the list.
- Detail snapshot save/update uses `OrderSnapshotDocument` v3 in `details`.
- Detail unconfirm sends `details: null`.
- Inner order metrics are snapshot-first. If `details` exists, list `qty`, order amount, sales amount, profit, inbound date, and size quantities project `OrderSnapshotDocument.drawer2`.
- If `details` is null, order metrics request the selected size comparison subject through `subscribeCandidateOrderMetrics(params.comparison)`.
- Candidate stash does not own a global comparison target. The detail header fetches comparison targets through `getProductComparisonTargets({ base })`, and every metric SSE request receives the selected target as a parameter.
- While comparison targets are loading, order metric SSE may wait. If target loading completes with no available selected target, candidate stash does not call SSE with a fake default and marks non-snapshot order metric cells failed.
- If target lookup fails, returns an empty list, or the saved selected target is no longer available, snapshot rows keep stored values and only non-snapshot metric cells become failed/unavailable.
- Daily trend data is not part of the inner order metric request; only the secondary order calculation basis is reused.
