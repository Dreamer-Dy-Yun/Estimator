# Project cleanup - 2026-06-03

## Goal

Remove static-dead files and reduce unnecessary public surface found by MulAg cleanup agents.

## Scope

- `dashboard-app/src` dead component and hook cleanup.
- Mock/API internal export cleanup where no external import, route entry, test, or contract consumer exists.
- Generated local artifacts and logs.

## Principles

- Delete confirmed-unused files first.
- Do not delete API contract types, snapshot contract helpers, tests, CSS style-parts, or deployment/runtime assets unless the contract is intentionally reduced.
- Prefer unexporting internal helpers over merging unrelated responsibilities.

## Result

- Deleted unused `CopyToastBanner` component, paired CSS module, and unused copy-toast hook.
- Deleted unused mock helper functions `buildCandidateReferenceItems` and `markCandidateOrderMetricFailed`.
- Localized mock-only types and helpers that were exported without an external consumer.
- Removed local generated artifacts and logs:
  - `dashboard-app/dist`
  - `dashboard-app/playwright-report`
  - `dashboard-app/test-results`
  - `dashboard-app/.codex-vite-*.log`
  - `tsc-type-hardening.log`

## Non-goals and follow-up candidates

- Kept `MD/dashboard-app/type-hardening-inventory-2026-06-03.md` as hardening evidence.
- Kept CSS `style-parts` files because they are referenced through CSS import graphs.
- Kept API contract and snapshot contract files even where local source references are sparse.
- Future cleanup can split large files over 300 lines, especially candidate mock tests and secondary candidate action tests.
