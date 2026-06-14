# Backend API Implementation Notes

Last updated: 2026-06-11

Purpose: backend implementation notes for the current frontend API contract.

Source of truth:

- Current endpoint and DTO catalog: `dashboard-api-contract-catalog.md`
- Frontend TypeScript contract: `dashboard-app/src/api/types/*`
- HTTP adapter mapping: `dashboard-app/src/api/requests/*Requests.ts`
- Historical contract docs: `OLD/2026-06-10-before-current-api-rewrite/`

## Runtime

- Base path is `/api/v1`.
- Frontend sends `credentials: include`; backend should use session/cookie auth.
- Frontend uses mock only when `VITE_USE_MOCK_API=true`.
- `VITE_USE_MOCK_API=false`, omitted, or empty values select HTTP mode.
- Production HTTP mode requires `VITE_API_BASE_URL`; deployment workflow must fail before build if HTTP mode is selected without the backend base URL.
- Mock preview deployment may set `VITE_USE_MOCK_API=true` and does not require a backend base URL.
- Request and response JSON field names must match the TypeScript DTO names.
- Do not return frontend-only sentinel values such as `ALL_COMPANY_UUID`.
- Successful empty mutation responses may use HTTP 204.

## Scope and ownership

- Read-like company scope uses optional `companyUuid`.
- Omitted `companyUuid` means all-company read where the endpoint explicitly allows it.
- Company-owned mutation, import, candidate job start, and candidate job/SSE subscribe require one concrete `companyUuid`.
- Candidate stash and candidate item ownership must be enforced from authenticated session plus company scope.
- Product drawer read-like APIs use `base` and `comparison` subject query fields instead of top-level `companyUuid`.

## Auth and admin profile ownership

- `PATCH /auth/me` owns the authenticated user's own `loginId` and `name`.
- Backend must normalize `loginId` for uniqueness checks and return `409 conflict` when another user already owns the requested login id.
- `PATCH /admin/users/{uuid}` owns only admin-control fields: `note`, `role`, and `isActive`.
- Admin user update must not change `loginId` or `name`; those fields are profile-owned.
- Self-disable, last-admin removal, and role demotion guard rules must be enforced server-side rather than hidden as frontend-only UI constraints.

## Product comparison subject contract

Subject query fields:

```txt
baseRole=base
baseKind=self-company
baseSourceId?={COMPANY.uuid}
comparisonRole=comparison
comparisonKind=competitor-channel | self-company
comparisonSourceId?={COMPETITOR_CHANNEL.id | COMPANY.uuid}
```

Rules:

- `baseRole` must be `base`.
- `comparisonRole` must be `comparison`.
- Current frontend supports `baseKind=self-company`.
- `competitor-channel` comparison requires `comparisonSourceId`.
- `self-company` with omitted `sourceId` means all-company read.
- Missing or unauthorized subjects must fail explicitly, not fall back to first available target.
- Invalid role/kind shape should return validation failure, preferably 422.
- `GET /products/comparison-targets` returns `200 []` when the requested base subject has no available comparison target.
- Non-2xx responses from `getProductComparisonTargets` are API failures, not empty states.
- The frontend treats both an empty target list and target lookup failure as comparison unavailable and does not synthesize a default target.

## Sales and scatter aggregation

- Sales list rows and scatter cells must use the same filter params.
- Apply filters before KPI/rank/scatter calculations.
- Competitor sales with omitted `competitorChannelId` means one aggregate row per `skuGroupKey`, not duplicated rows per channel.
- Current frontend can derive scatter cells from loaded list rows for small data. HTTP scatter-grid endpoints remain the backend adapter contract for larger data or server-side binning.
- Scatter cells return occupied cells only.
- `ScatterGridCell.skuIds` contains `skuGroupKey` values despite the legacy field name.
- Point click filters the already loaded frontend list; it must not require another backend request.
- Frontend renders point radius; backend only owns data binning.

## Product drawer aggregation

- `getProductDrawerBundle` returns `{ summary }` only and is base-only.
- Monthly trend, sales insight, secondary detail, daily trend, AI comment, and stock-order calc are separate APIs.
- Monthly trend request should cover existing max 24 completed months plus `forecastMonths` future months.
- Current initial frontend value for `forecastMonths` is 12.
- Daily trend actual/forecast split uses `forecastStartDate`; backend must not send per-row `isForecast`.
- Do not synthesize missing cost, fee, margin, rank, stock, or order business values in frontend-compatible responses.

## Candidate stash and jobs

- Candidate stash mutations are single-company workflows.
- Bulk append may skip existing duplicate `skuGroupKey` rows and return only newly created `CandidateStashItemSummary[]`.
- Singular append stores `details: OrderSnapshotDocument`.
- Update may store `details: OrderSnapshotDocument` or clear it with `details: null`.
- `updateCandidateItem` response is the authoritative post-commit `CandidateItemDetail`; frontend protects it from stale follow-up reads.
- Detail bulk confirm job should calculate and persist secondary drawer state before emitting `updatedItem`.
- LLM comment job updates item snapshots/comments only through backend-owned job logic.

## Thumbnail contract

- List rows include `thumbnailUrl: string | null`.
- This URL is a small stored product thumbnail URL.
- `null` means no stored thumbnail.
- Field omission is contract mismatch.
- Frontend displays the URL only and must not synthesize an operational image URL from product text.

## SSE

- Use `text/event-stream`.
- Frontend listens to default `message` events only.
- Send one JSON object per `data:` message.
- SSE endpoints must validate the same company scope and resource ownership as the job start/read endpoint.
- Order metric streams include `requestId`; stale events with old request ids are ignored by frontend.
- Completed events should be sent when all requested items are settled.
- Candidate order metric SSE requires the selected comparison subject on every request: `comparisonRole`, `comparisonKind`, and `comparisonSourceId` when required by the subject kind.
- The backend must validate the supplied comparison subject and must not use a server-global, session-global, or first-available default comparison basis.
- If no selected comparison target exists after `getProductComparisonTargets({ base })`, the frontend does not open the order metric SSE.
- Snapshot rows project `CANDIDATE_ITEM.details.drawer2`; non-snapshot rows calculate from the current secondary order metric basis for the supplied base/comparison subject without daily trend rendering data.

## Secondary daily trend source

Endpoint:

```http
GET /api/v1/products/{skuGroupKey}/secondary/daily-trend
```

Query:

- `startDate`: inclusive start date, `YYYY-MM-DD`.
- `endDate`: inclusive actual-data end date, `YYYY-MM-DD`.
- `forecastDays`: number of forecast days appended after `endDate`.
- `baseRole`, `baseKind`, optional `baseSourceId`.
- `comparisonRole`, `comparisonKind`, optional `comparisonSourceId`.

Response:

```ts
interface SecondaryDailyTrendSubjectFlow {
  sale: number
  inbound: number | null
}

interface SecondaryDailyTrendFlowCell {
  base: SecondaryDailyTrendSubjectFlow
  comparison: SecondaryDailyTrendSubjectFlow
}

interface SecondaryDailyTrendSource {
  productId: string
  dateStart: string
  dateEnd: string
  forecastStartDate: string
  baseStockAtStart: number | null
  comparisonStockAtStart: number | null
  flowByDate: Record<string, SecondaryDailyTrendFlowCell>
}
```

Rules:

- `flowByDate` is aggregate daily flow. Do not send size-level rows for this endpoint.
- `dateEnd` is the final date included in `flowByDate`, including forecast days when `forecastDays > 0`.
- `forecastStartDate` is normally `endDate + 1 day` from the actual-data query boundary.
- Backend sends explicit numeric `0` for known zero sale/inbound. `null` means the subject's inbound is unavailable or not meaningful.
- Backend must not send chart-only fields such as `idx`, `month`, `isForecast`, `stockBar`, or `inboundAccumBar`.
- The frontend derives chart points from this source.

## Secondary inbound split source

Endpoint:

```http
GET /api/v1/products/{skuGroupKey}/secondary/inbound-split-source
```

Query:

- `dateStart`: inclusive current inbound date, `YYYY-MM-DD`.
- `dateEnd`: exclusive next inbound date, `YYYY-MM-DD`.
- `baseRole=base`.
- `baseKind=self-company`.
- `baseSourceId`: optional concrete self-company source id. Omit for all-company read semantics when the frontend subject allows it.

Response:

```ts
interface SecondaryInboundSplitExpectationCell {
  sale: number
  inbound: number
}

interface SecondaryInboundSplitSource {
  productId: string
  dateStart: string
  dateEnd: string
  stockBySize: Record<string, number>
  expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>>
}
```

Rules:

- This endpoint returns source data, not split result rows.
- Backend must not require `splitCount`, `splitInboundDates`, or `totalOrderQtyBySize`.
- `stockBySize` is stock at `dateStart`.
- `expectationByDate` covers `dateStart <= date < dateEnd`.
- `inbound` is known inbound unrelated to the current popup draft.
- The frontend combines this response with current confirmed order quantity by size and screen-owned split dates.

## Failure mapping

Standard error body:

```ts
interface ApiErrorResponse {
  message: string
  code?: string
  details?: unknown
}
```

Status mapping expected by frontend:

| HTTP/status source | Frontend kind |
|---|---|
| 401 | `auth` |
| 403 | `permission` |
| 408, 504 | `timeout` |
| 404 | `not-found` |
| 409 | `conflict` |
| 422 | `validation` |
| Other 4xx | `client` |
| 5xx except 504 | `server` |

Do not hide backend failures as empty arrays or fake success states.

## Backend implementation checklist

- Match `dashboard-app/src/api/types/*` DTO names exactly.
- Keep mock and HTTP contracts equivalent.
- Validate role/kind/sourceId combinations at API boundary.
- Validate concrete company scope for company-owned mutation/candidate job/SSE endpoints.
- Validate candidate item ownership and stash membership before mutation.
- Return explicit `null` for unavailable nullable business fields.
- Return explicit failure for missing required business data.
- Keep previous contract shapes only in `OLD/` or `CHANGELOG.md`, not in current catalog.
