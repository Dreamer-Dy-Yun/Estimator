# Project Cleanup 2026-06-10

## Goal

Clean the current project state after the mock/HTTP deploy-mode change and recent thumbnail/API-contract work.

## Scope

- Align deployment and API boundary documentation with the current GitHub Pages workflow.
- Remove small stale code/documentation fragments found by MulAg read-only passes.
- Keep larger hook, snapshot, and CSS facade refactors as follow-up candidates because they cross hardened or high-risk boundaries.

## Principles

- Current code is the source of truth.
- Mock preview deploy is allowed while no production backend URL exists.
- HTTP production deploy still requires a backend base URL.
- Do not synthesize missing business values in UI code.
- Do not move old MulAg lifecycle documents without both completed TODO steps and matching review evidence.

## Result

- Deployment docs now distinguish mock preview deploy from HTTP production deploy.
- README deploy validation now reflects `verify:deploy` and keeps Playwright E2E as a separate workflow.
- `dailyTrendAsOf.ts` no longer points to the old `mock.ts` owner.
- `ProductThumbnailCell` no longer opens a hover preview for missing thumbnails, and the unused preview placeholder CSS was removed.
- Mock EA/Won text formatting moved into `src/api/mock/mockNumberFormat.ts`.
- API boundary docs include the mock number formatter owner.

## MulAg Findings Deferred

- Large analysis page orchestration should be split only in a dedicated UI refactor.
- `useSecondaryCandidateActions` and related secondary drawer hooks remain split candidates but were not changed in this cleanup pass.
- Snapshot parser/type public-surface cleanup touches hardened files and needs explicit approval before editing.
- Root API type relocation and common CSS facade split remain follow-up hardening candidates.

## Validation

- Pending in this cleanup pass: encoding, unit tests, build.
