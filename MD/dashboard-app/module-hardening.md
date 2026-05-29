# Module Hardening

Last updated: 2026-05-29

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
