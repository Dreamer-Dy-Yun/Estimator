# Module Hardening

Last updated: 2026-06-10

## Definition

A hardened module has a clear responsibility, documented inputs/outputs, controlled side effects, and tests for important boundary behavior.

## Current hardened responsibilities

| Module | Contract |
|---|---|
| `src/api/types/company.ts` | Company scope normalization and mutation-scope guard. |
| `src/api/types/api-error.ts` | API failure kind normalization. |
| `src/snapshot/parseOrderSnapshot.ts` | Current snapshot validation. |
| `src/snapshot/orderSnapshotTypes.ts` | Snapshot type contract. |
| `useCandidateRecommendations.ts` | Recommendation load, append state, stale guard. |
| `useCandidateBulkDetailConfirm.ts` | Bulk detail confirm job/SSE state. |
| `useSecondaryStockOrderCalc.ts` | Debounced stock-order calculation and stale response guard. |
| `SecondaryDailyTrendRequestWindow.ts` | Daily trend request window calculation. |

## Required maintenance rule

- Do not modify hardened modules for incidental UI changes.
- If a hardened contract changes, update tests and the matching boundary/API document in the same change.
- Remove stale helper functions instead of wrapping them with more guards.

## Current hardening candidates and exclusions

| Module | Status | Notes |
|---|---|---|
| `src/api/mock/dashboardApi.ts` | Split, not hardened | Reduced to dashboard mock facade plus sales list/filter methods. Product comparison and secondary detail mock logic moved out. |
| `src/api/mock/mockProductComparisonApi.ts` | Candidate | Owns product comparison subject resolution, target list, monthly trend, sales insight, and secondary daily trend mock behavior. |
| `src/api/mock/mockProductSecondaryDetailApi.ts` | Candidate | Owns secondary detail and comparison size-ratio mock behavior. |
| `useSecondaryCandidateActions.ts` | Guarded orchestration | Action types, pure candidate input/snapshot-key helpers, and mounted/scope/sequence guard ownership are separated. Public refresh/mutation paths require a concrete company scope. The hook still owns picker state and candidate mutation orchestration; split `runMutation` only with focused hook tests. |
| `src/api/mock/candidateMockApi*.test.ts` | Split test contract | Candidate mock tests are separated by scope, recommendation, job, and mutation responsibilities. Keep new candidate mock tests in the matching file instead of growing a single omnibus test file. |
