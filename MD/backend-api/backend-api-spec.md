# Backend API Spec

Last updated: 2026-06-09

Purpose: implementation notes that are not obvious from the API catalog. Current endpoint and DTO contract is `dashboard-api-contract-catalog.md`.

## Runtime

- Frontend talks to `/api/v1` through `src/api/client.ts`.
- `VITE_USE_MOCK_API=false` switches frontend to HTTP requests.
- Screens and hooks must not import mock implementations directly.
- Backend should prefer session ownership from the authenticated server session over user identifiers from request bodies.

## Company scope

- `GET /companies` returns `uuid`, `name`.
- All-company reads omit `companyUuid`.
- Single-company reads send `companyUuid`.
- Candidate mutations, imports, jobs, and job SSE require `companyUuid`.
- Product drawer read-like requests use base/comparison subject refs instead of top-level `companyUuid`.

## Auth and admin

- Login uses `loginId`, not `email`.
- Session response is `AuthSession { user, expiresAt }`; 401 session read maps to `null` on the frontend.
- Password reset returns a one-time `temporaryPassword` only in the reset response.
- GPT key responses expose `maskedKey`, never the raw key.
- Google Sheet config responses expose `maskedServiceAccountKey`, `serviceAccountEmail`, `spreadsheetUrl`, `spreadsheetId`.

## Sales and drawer aggregation

- Sales analysis rows and scatter cells must be generated from the same filter params.
- Competitor channel omitted means aggregate competitor channel scope.
- Product drawer bundle returns only `summary`; monthly trend, sales insight, secondary detail, and stock-order calculation are separate endpoints.
- Product drawer bundle is base-only: it receives `baseRole/baseKind/baseSourceId?` and does not receive a comparison subject.
- Product drawer monthly trend, sales insight, secondary detail, daily trend, and AI comment receive both `base` and `comparison` subject refs.
- Monthly trend request uses the last 24 completed months ending at previous month and 12 forecast months.
- Daily trend request uses selected start month first day through yesterday plus lead-time `forecastDays`.
- Actual/forecast split comes from API `isForecast`.

## Candidate stash

- Candidate item list, recommendation, order metric SSE, detail confirm, detail unconfirm, delete, upload, and jobs are single-company workflows.
- Bulk append response returns newly created `CandidateStashItemSummary[]` only.
- If a SKU is already in the stash, backend may skip it. The frontend treats zero newly created rows as `no-op`.
- Recommendation append response items must include `uuid`, `stashUuid`, `skuUuid`, `skuGroupKey` so the frontend can match them to recommendation source rows.
- Singular append stores one `OrderSnapshotDocument` v3 in `details` and sends `isLatestLlmComment` explicitly.
- Update item sends `details: OrderSnapshotDocument | null` and `isLatestLlmComment`.

## AI comment

- AI comment is requested when the user clicks the AI comment card request button.
- The request can include `snapshotForAiComment` built from current drawer state.
- The request does not persist candidate item state by itself.
- Response is `{ prompt, answer, generatedAt }`.
- The answer is stored only when the user saves or updates the candidate item snapshot.

## Failure mapping

- 401 -> `auth`.
- 403 -> `permission`.
- 408 or 504 -> `timeout`.
- 404 -> `not-found`.
- 409 -> `conflict`.
- 422 -> `validation`.
- Other 4xx -> `client`.
- 5xx except 504 -> `server`.

## SSE

- Frontend listens to the default EventSource `message` event.
- Send JSON in `data:` lines.
- Job subscribe must validate job visibility and company scope.
