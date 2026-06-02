# Analysis Pages Boundary

Last updated: 2026-06-02

## Scope

Self and competitor analysis pages own the analysis list, scatter chart, period query state, current-result facet filters, product drawer entry, and candidate bulk-add entry.

## Source ownership

| Source | Responsibility |
|---|---|
| `src/dashboard/pages/SelfPage.tsx` | Self analysis page composition and self-sales request wiring. |
| `src/dashboard/pages/CompetitorPage.tsx` | Competitor analysis page composition, competitor-channel query condition, and competitor-sales request wiring. |
| `src/dashboard/components/AnalysisPageLayout.tsx` | Shared analysis page frame: query controls, list filters, chart column, list frame, and action card slots. |
| `src/dashboard/components/AnalysisListRequestFrame.tsx` | Initial list loading and non-blocking refresh status. |
| `src/dashboard/components/AnalysisPeriodTools.tsx` | Period presets and period-bar controls inside query controls. |
| `src/dashboard/components/FilterBar.tsx` | Shared filter field renderer. `FilterFieldGrid` renders fields without owning a card. |
| `src/dashboard/components/FilterListCombo.tsx` | Free-text filter input with option suggestions. |
| `src/dashboard/model/analysisFacetFilter.ts` | Current-result facet option calculation and row filtering engine. |
| `src/dashboard/hooks/useAnalysisSalesFilters.ts` | Draft/applied period state and list facet filter state. It does not filter rows directly. |
| `src/dashboard/hooks/useAnalysisSalesDataGate.ts` | Shared loading state for list and scatter-grid requests. |
| `src/dashboard/hooks/useAnalysisPageSelection.ts` | Row selection, bulk selection, focused row, scatter-cell filtering, and drawer navigation state. |

## Query, filter, and action boundary

- `조회 조건` controls API request scope and is rendered as its own card.
- `조회 조건` includes start date, end date, recent-period presets, period bar open/close, period-bar range handles, competitor channel, request status, and the `조회` button.
- Period inputs are draft values. API requests use the applied period only after the user clicks `조회`.
- Competitor channel is an API request condition. It is not a list-only filter.
- `목록 필터` controls only the already-loaded analysis rows and is rendered as its own card.
- `목록 필터` includes brand, category, product code, product name, color, and competitor-page `자사기준보기`.
- Brand, category, product code, product name, and color are frontend facet filters over the current API result rows. They must not be sent as analysis-list API request params.
- Facet options are recalculated from loaded rows after applying all other facet filters. The target field's own selected value is kept available so the user can clear or edit it.
- `필터 초기화` resets only list filters. It must not change applied period, draft period, period bar state, company scope, or competitor channel.
- `목록 액션` is a separate sibling card beside the query card. It shows `후보군으로`.

## Text filter contract

- Text filters use `FilterListCombo`.
- The internal all-filter value is `전체`.
- The all option is displayed as plain `전체` and emphasized in the dropdown with bold styling.
- Selecting `전체` means no filter condition for that field.
- If the user types while `전체` is selected, the existing `전체` label is replaced by the new query text instead of being appended to it.
- Even when the query exactly matches an option, the dropdown keeps the `전체` option available.
- If no non-all option matches the query, the dropdown keeps `전체` and shows `검색 결과가 없습니다.`.

## Loading and refresh contract

- Initial list load may replace the list area with a centered loading state.
- Refresh after period, company scope, or competitor channel changes must keep the current list visible.
- Local facet filter changes must not trigger API refresh or blocking overlays.
- Refresh state is shown inside the list frame as a small inline status, not as a full overlay or popup.
- Refresh state must not block filter input, list clicks, or keyboard operation.

## Company scope

- Header company selection is passed to analysis APIs as optional `companyUuid`.
- All-company selection omits company scope for read APIs.
- Candidate bulk-add requires a single company scope and is disabled in all-company scope.

## Candidate bulk-add boundary

`AnalysisCandidateBulkAddModal.tsx` owns adding selected analysis rows to an existing candidate stash or creating a new stash before append.

- It sends `stashUuid + skuGroupKeys + companyUuid` for append.
- It does not fabricate candidate detail snapshots.
- It must not mutate candidate stash files outside the candidate API boundary.

## Non-goals

- Analysis pages do not own candidate item detail confirmation.
- Analysis pages do not own product drawer secondary order calculation.
- Analysis pages do not convert backend rows into snapshot documents.
