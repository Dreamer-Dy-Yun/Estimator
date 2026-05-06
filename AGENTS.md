# Project Instructions

## Git

- Use `main` as the default branch unless the user explicitly says otherwise.
- Push completed work directly to `origin/main` when the user gives no different instruction.
- Check `git status` before staging, committing, or pushing.
- Do not revert unrelated user changes.

## General Approach

- Read the existing code and recent project notes before making non-trivial changes.
- Treat the current code as a working project history, not as a perfect style guide. Some code was produced through Cursor-assisted vibe coding.
- Prefer the user's stated intent, data flow, and backend contract direction over copying awkward existing patterns.
- Keep changes scoped. Avoid unrelated refactors unless they are needed to complete the requested work safely.

## Frontend Structure

- Keep data access behind `src/api`.
- Define API contracts in `src/api/types/*`, then wire `client.ts`, `index.ts`, and mock implementations.
- Do not import mock files directly from pages/components/hooks.
- Keep mock behavior and mock data under `src/api/mock/*`.
- Move reusable calculations out of UI components into `utils`, `model`, or API mock helpers when practical.
- Use the existing CSS Modules approach.
- Preserve the existing card/grid/panel system unless the user asks for a broader redesign.

## UI Text

- In areas that already use `KO` constants, continue using that pattern.
- This is a maintenance rule for the current codebase, not a preference to expand abstraction everywhere.
- For `product-secondary` text, prefer adding to `ko.ts` instead of introducing nearby hard-coded strings.

## Data And API Contracts

- Treat UI changes that require different request data as API contract changes.
- Do not mix monthly aggregate drawer data with daily/period/channel-sensitive aggregate data without an explicit contract.
- Prefer a separate API for heavier period/channel-sensitive product sales insight data rather than overloading `getProductDrawerBundle`.
- Do not invent silent numeric fallbacks for missing business data.
- If required data is missing, strengthen the type/API contract or show an explicit error state.
- Backend implementation may be out of scope, but frontend types and API spec notes should stay aligned when the contract changes.

## Async And State

- Guard async requests against stale responses with an `alive` guard or request sequence pattern.
- Preserve existing drawer protections against unmount/flicker, including stale cache and snapshot fallback behavior.
- For candidate stash, snapshot, and drawer flows, respect stored snapshot values.
- Do not replace snapshot values with ad hoc recalculation unless explicitly requested.

## Documentation

- For larger changes, add or update an `MD` plan/result note.
- When frontend feature behavior, source ownership, folder boundaries, API contracts, or major UI responsibilities change, update `MD/dashboard-app/source-boundary-map.md`.
- Preferred note shape:
  - Goal
  - Scope
  - Principles
  - Plan
  - Result
  - Non-goals or follow-up candidates
- Avoid heavy documentation for tiny edits.
- If backend API contracts change, update `MD/backend-api/backend-api-spec.md` or add a relevant plan note.

## Validation

- Prefer running `npm run test:run` and `npm run build` in `dashboard-app` after frontend changes.
- `npm run lint` currently has existing failures; do not treat full lint failure as new breakage without checking the touched files.
- Avoid introducing new lint problems in touched files.
- Use `py` for Python scripts in this environment; `python` may not resolve correctly.
- Read and write Korean text as UTF-8. Do not assume PowerShell's default display mojibake means the file is corrupted.
