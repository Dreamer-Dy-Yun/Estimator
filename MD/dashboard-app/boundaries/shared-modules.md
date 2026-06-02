# Shared Modules Boundary

Last updated: 2026-06-02

## Scope

Shared modules provide reusable UI shells, hooks, pure models, snapshot helpers, and utility functions. They must not invent business values or hide API contract failures.

## Shared UI

| Source | Responsibility |
|---|---|
| `src/components/AppToast.tsx` | Global toast surface for success, warning, and error messages. |
| `src/components/LoadingSpinner.tsx` | Loading indicator for page, inline, drawer, modal, and button states. |
| `src/dashboard/components/FilterBar.tsx` | Shared filter card wrapper and `FilterFieldGrid` field renderer. Feature pages decide query/filter/action boundaries. |
| `src/dashboard/components/FilterListCombo.tsx` | Free-text filter input with suggestion dropdown. Keeps `전체` available and bold in the dropdown. |
| `src/dashboard/components/PaginatedTable.tsx` | Sortable paginated table shell. Supports sort reset from request keys. |
| `src/dashboard/components/DashboardRequestStatus.tsx` | Compact request status for stale, refreshing, and failed data. |
| `src/dashboard/components/ConfirmModal.tsx` | Confirmation modal shell with focus management. |
| `src/dashboard/components/useModalFocusTrap.ts` | Modal focus trap, Escape close, and focus restore helper. |

## Shared hooks

| Source | Responsibility |
|---|---|
| `src/dashboard/hooks/useDashboardRequest.ts` | Request lifecycle, stale response guard, refresh state, and error state. |
| `src/dashboard/hooks/useProductDrawerBundle.ts` | Product drawer bundle loading and stale-while-revalidate behavior. |
| `src/dashboard/hooks/useAnalysisSalesFilters.ts` | Analysis period draft/applied state and list facet filter state. |
| `src/dashboard/model/analysisFacetFilter.ts` | Facet option and row filtering engine for current analysis result rows. |
| `src/dashboard/hooks/useScopedCandidateStashAction.ts` | Candidate stash mutation wrapper with scoped failure handling. |

## Interaction and model helpers

| Source | Responsibility |
|---|---|
| `src/dashboard/model/*` | View-model and UI/API bridge logic. |
| `src/dashboard/interaction/interactionTarget.ts` | Keyboard shortcut exclusion targets. |
| `src/dashboard/drawer/drawerDom.ts` | Drawer keep-open and inner-drawer DOM attributes. |
| `src/utils/*` | Pure reusable utilities that do not depend on React or API implementations. |

## Snapshot helpers

| Source | Responsibility |
|---|---|
| `src/snapshot/orderSnapshotTypes.ts` | Saved order snapshot type contract. |
| `src/snapshot/parseOrderSnapshot.ts` | Runtime parser for stored/API snapshot JSON. |
| `src/snapshot/*test*` | Parser and builder contract tests. |

## Rules

- Shared modules may generalize UI mechanics, not business assumptions.
- Missing required backend values must become explicit errors or typed contract failures.
- Refresh indicators must not block user interaction unless the underlying action is destructive or modal-scoped.
- Do not move feature-specific calculation into `src/utils`; keep it near the feature model or API contract.
- If a shared module behavior changes, update the owning boundary document and focused tests.
