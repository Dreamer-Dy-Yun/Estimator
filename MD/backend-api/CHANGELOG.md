# Backend API Changelog

## 2026-06-10 current API rewrite

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
