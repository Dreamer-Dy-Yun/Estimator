# QA Current Behavior

Last updated: 2026-06-10

## General

- API access goes through `src/api`.
- Failures are visible and are not converted to empty success states.
- Refresh failure preserves existing stable data and shows a failure surface.
- Async stale responses must not overwrite current scope/period/item state.
- Auth actions are sequenced so older session responses do not overwrite newer login, logout, refresh, or profile update actions.
- Public mock request adapters normalize raw mock failures into `ApiClientError` before screen hooks receive them.
- No silent numeric fallback for missing business data.

## Company scope

- Read APIs may omit `companyUuid` for all-company reads.
- Candidate stash mutation/job/SSE requires concrete `companyUuid`.
- All-company state disables candidate stash workflows.

## Product drawer

- Monthly trend request: last 24 completed months + 12 forecast months.
- Daily trend request: selected start month first day through yesterday + lead-time forecast days.
- AI comment request is manual.
- Snapshot save uses current drawer state and `OrderSnapshotDocument` v3.
- If a selected SKU drawer-bundle refresh fails, the UI may keep same-SKU stable data, but it must not show another SKU's cached bundle as the current selection.

## Candidate stash

- Item list, recommendations, and order metrics are separate contracts.
- Recommendation append result states: `applied`, `stale`, `no-op`, `empty-selection`.
- Only `applied` inserts local rows.
- SSE transport failure marks affected order metric cells failed.
- Detail confirm/unconfirm response is authoritative for the affected item.

## Admin

- Login uses `loginId`.
- Password reset exposes temporary password only once.
- GPT and Google Sheet secrets are masked in responses.
