# Backend API Changelog

## 2026-06-10 current API rewrite

- `getProductComparisonTargets({ base })` now has explicit empty/error semantics: `200 []` means no available target, non-2xx means API failure, and the frontend does not synthesize a default target.
- Candidate order metric SSE is not opened when the frontend has no selected comparison target; non-snapshot metric cells are marked unavailable/failed client-side instead of asking the backend to choose a default.
- Mock preview may run with `VITE_USE_MOCK_API=true` and no backend base URL; HTTP/production mode requires the backend base URL.
- Candidate order metric SSE now requires the selected comparison subject on every request:
  - `comparisonRole`, `comparisonKind`, `comparisonSourceId?`
  - Snapshot rows project `OrderSnapshotDocument.drawer2`; non-snapshot rows use secondary order calculation without daily trend rendering data.
- Archived previous backend API docs to `OLD/2026-06-10-before-current-api-rewrite/`.
- Rewrote `dashboard-api-contract-catalog.md` as current-contract-only backend implementation catalog.
- Kept implementation guidance in `backend-api-spec.md`.
- Auth/profile ownership is explicit: `PATCH /auth/me` owns `loginId`/`name`, duplicate login id must return `409 conflict`, and `PATCH /admin/users/{uuid}` owns only `note`/`role`/`isActive`.
- Comparison APIs now use the subject contract:
  - `baseRole`, `baseKind`, `baseSourceId?`
  - `comparisonRole`, `comparisonKind`, `comparisonSourceId?`
- Product drawer bundle is base-only and returns `{ summary }`.
- Product monthly trend, sales insight, secondary detail, daily trend, AI comment, and stock-order calc are separate endpoints.
- Analysis list and candidate list row summaries include `thumbnailUrl: string | null`.
- Candidate item `details` remains `OrderSnapshotDocument | null`; current snapshot schema is version `3`.
- Candidate order metric SSE uses `requestId` and emits `item`, `itemFailed`, and `completed`.

## Previous docs

- `OLD/2026-06-10-before-current-api-rewrite/backend-api-spec.md`
- `OLD/2026-06-10-before-current-api-rewrite/dashboard-api-contract-catalog.md`
