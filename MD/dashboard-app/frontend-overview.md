# dashboard-app Frontend Overview

Last updated: 2026-05-29

## Purpose

The app analyzes self and competitor sales, opens product drawers for order planning, stores selected order candidates, and saves detail snapshots for candidate items.

## Main flows

- Login loads session and company list.
- Header company selector controls read scope.
- Self analysis and competitor analysis pages request rows and scatter data from the same query key.
- Product drawer loads primary summary, monthly trend, sales insight, secondary detail, daily trend, stock-order calculation, and AI comment on demand.
- Candidate stash page manages candidate lists, recommendations, order metric SSE, detail confirmation, and Excel export.
- Admin pages manage users, GPT keys, and Google Sheet configs.

## Product drawer

- Monthly trend request uses last 24 completed months and 12 forecast months.
- Daily trend request uses selected start month first day through yesterday and lead-time forecast days.
- AI comment is generated only when the user clicks the comment request button.
- Reset returns the drawer to live calculated state and clears AI comment state.
- Detail save stores `OrderSnapshotDocumentV2` in candidate item `details`.

## Candidate stash

- Candidate stash requires single-company scope.
- All-company selection disables candidate stash entry and add-to-candidate actions.
- Recommendation append uses `applied`, `stale`, `no-op`, `empty-selection` states.
- Detail unconfirm clears `details` with `null`.

## Source layout

- `src/api`: API facade, HTTP adapters, mock implementations, API types.
- `src/dashboard/pages`: page orchestration.
- `src/dashboard/components/candidate-stash`: candidate stash UI/hooks.
- `src/dashboard/components/product-drawer`: product drawer UI/hooks.
- `src/snapshot`: snapshot types, builder, parser, tests.
- `src/utils`: shared pure utilities.
