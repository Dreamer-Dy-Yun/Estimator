# API HTTP switch and backend contract

- Status: DONE
- Date: 2026-05-15
- Owner: Codex

## TODO

- Backend: implement `/api/v1` endpoints from `MD/backend-api/backend-api-spec.md`.
- Backend: keep `EXTERNAL_MONTHLY_SUMMARY.site` and use monthly-summary plus raw correction for period sales totals.
- Frontend: when real backend is ready, set `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL`.

## DONE

- Added `dashboard-app/src/api/requests/httpClient.ts` as the shared HTTP/SSE helper.
- Kept mock data paths intact; the default runtime path is mock unless `VITE_USE_MOCK_API=false`.
- Added HTTP implementations behind existing request adapters without changing page/hook call sites.
- Added backend-facing endpoint contracts for auth, admin users, GPT keys, Google Sheets settings, sales, product drawer, candidate stashes, order metric SSE, candidate analysis SSE, Excel template/upload, and secondary stock-order calc.
- Split GPT key metadata update from key rotation for HTTP mode.
- Added candidate stash analysis start/progress SSE types and mock implementation.
- Documented candidate period sales totals as a backend calculation: full confirmed months from monthly summary tables, partial/unconfirmed months from raw sales tables.

## Notes

- Frontend code must not calculate period sales totals from DB tables. It displays `CandidateItemSummary.insight.selfSalesQty` and `competitorSalesQty`.
- `candidateItemUuids` in order metric SSE is sent as repeated query params.
- Mock mode remains useful for deployed frontend review while backend endpoints are incomplete.
