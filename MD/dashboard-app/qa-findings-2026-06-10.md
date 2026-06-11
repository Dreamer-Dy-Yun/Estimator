# 2026-06-10 / Dashboard App QA Findings

> Historical snapshot: this document records QA evidence for `HEAD=980f3a1` on 2026-06-10.
> It must not be reused as the current verdict after later code/API/doc changes without a fresh current-basis QA pass.

## QA scope and basis

- Project: `D:\DEV\HAN.A`
- App scope: `dashboard-app`
- Git basis: `HEAD=980f3a1`, branch `main`, working tree clean after deploy
- QA mode: MulAg-assisted passes across API/runtime, auth UI, async stale safety, tests/docs, and hardening
- Validation evidence:
  - `npm run check:encoding`: passed
  - `npm run test:run`: 63 test files / 323 tests passed
  - `npm run build`: passed
  - GitHub Pages workflow: `Deploy dashboard to GitHub Pages` run `27261704435` passed

## Score table

| Category | Score | Basis |
|---|---:|---|
| User-visible correctness | 92 | Runtime mode no longer silently defaults to mock, login no longer exposes mock credentials, and candidate refresh blocks missing company scope. |
| Async/stale/scope safety | 93 | Secondary candidate action guard owns mounted, list request sequence, action sequence, scope, target identity, and snapshot-key checks. |
| API boundary/contract | 93 | HTTP/mock boundary is explicit; read scope, mutation scope, product subject query, SSE, FormData, and env mode contracts are tested. |
| UI/accessibility | 94 | Login form has labels, required fields, autocomplete, alert live region, and form-level error description. |
| Tests/docs alignment | 92 | HTTP client serialization, env failure, request endpoint mapping, product subject, SSE, upload, and candidate mock contracts are covered and docs updated. |
| Maintainability/hardening | 91 | Large candidate and HTTP request tests were split by responsibility; secondary candidate action guard/model/types are separated and critical touched files are under 300 lines. |

## Resolved findings

- Runtime mock default risk resolved: mock mode requires `VITE_USE_MOCK_API=true`; omitted/blank/false selects HTTP.
- Production HTTP base URL risk resolved in code and deploy workflow: production HTTP mode requires `VITE_API_BASE_URL`; Pages HTTP deploy requires `DASHBOARD_API_BASE_URL`.
- Mock preview deploy is explicitly allowed when no backend URL exists; this is not treated as production HTTP readiness.
- Login mock credential exposure resolved: login values and placeholders no longer contain `mock-admin/admin`.
- Login error accessibility resolved: visible error text is connected to the form and exposed as an ARIA live alert.
- HTTP request contract strengthened: query serialization, JSON body/header, FormData preservation, and credentials behavior are covered.
- Dashboard HTTP request contract strengthened: read scope, mutation endpoint mapping, product subject query, upload FormData, and SSE query contracts are covered.
- Candidate mock test overgrowth resolved: candidate mock tests are split by scope, recommendation, job, and mutation.
- Secondary candidate action overgrowth reduced: action types, pure model helpers, and stale/scope guard ownership are split from the UI orchestration hook.

## Remaining risks

- `DASHBOARD_API_BASE_URL` must exist as a GitHub repository variable or manual input for HTTP production deploy.
- `useSecondaryCandidateActions.ts` still owns picker state and mutation orchestration; deeper `runMutation` splitting should wait for focused hook tests.
- Backend implementation parity is not proven by frontend tests; this QA covers frontend contracts and deployment configuration.

## Verdict at HEAD=980f3a1 on 2026-06-10

- Usable: yes.
- Each QA category: 90+ based on current source and validation evidence.
- Hardening-complete: not globally; the touched high-risk seams are above the 90-point threshold, but not all modules are frozen contracts.
- Deployable: yes for mock preview deploy. HTTP production deploy remains blocked until `DASHBOARD_API_BASE_URL` is configured.
