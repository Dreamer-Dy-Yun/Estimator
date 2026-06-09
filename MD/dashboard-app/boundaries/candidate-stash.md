# Candidate Stash Boundary

Last updated: 2026-06-09

## Responsibility

Candidate stash owns order candidate lists, item detail drawer entry, recommendation rows, order metric SSE, detail confirmation, item/stash mutation, and Excel upload/download.

## Scope

- Candidate stash workflows require one selected company.
- All-company header state disables candidate stash workflows.
- Candidate mutations, jobs, and SSE must not fall back to a default company.

## Main files

| File | Responsibility |
|---|---|
| `SnapshotConfirmPage.tsx` | Candidate stash page composition |
| `useCandidateStashDetailModal.ts` | Detail modal orchestration |
| `useCandidateItemsLoader.ts` | Item list load |
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
