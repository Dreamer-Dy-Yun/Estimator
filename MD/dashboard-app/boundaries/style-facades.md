# Style Facades Boundary

Last updated: 2026-06-02

## Responsibility

CSS facade files are public import entries for TS/TSX. `style-parts` files are internal implementation details and should not be imported directly from components unless a component owns that part explicitly.

## Public facades

| Facade | Owner | Responsibility |
|---|---|---|
| `src/dashboard/components/common.module.css` | dashboard shared UI | Analysis layout, table shell, drawer shell, filter/period controls, shared modal/action patterns. |
| `src/admin/AdminPage.module.css` | admin UI | Admin page shell, admin tables, forms, dialogs, and responsive rules. Admin must not import dashboard `common.module.css`. |
| `src/dashboard/components/product-drawer/secondary/secondaryDrawer.module.css` | product secondary drawer | Secondary drawer layout, secondary cards, stock-order inputs, size-order tables, and AI comment card styling. |
| `src/dashboard/components/product-drawer/primary/cards/SalesMetricsCard.module.css` | product primary sales metrics card | Primary sales metrics card/table styling. It must not import or depend on secondary drawer CSS. |
| `src/dashboard/pages/SnapshotConfirmPage.module.css` | candidate stash page | Snapshot-confirm page layout, upload card, stash cards, edit modal, and responsive rules. |
| Co-located component CSS modules | component owner | A component may import its own adjacent `*.module.css` when the style is not a shared facade concern, for example `ApiUnitErrorBadge.module.css` or `ComponentErrorBoundary.module.css`. |

## Internal style parts

| Internal path | Rule |
|---|---|
| `src/dashboard/components/common-style-parts/**` | Imported by `common.module.css` only. |
| `src/admin/style-parts/**` | Imported by `AdminPage.module.css` only. |
| `src/dashboard/components/product-drawer/secondary/style-parts/**` | Imported by `secondaryDrawer.module.css` only. |
| `src/dashboard/pages/snapshot-confirm-style-parts/**` | Imported by `SnapshotConfirmPage.module.css` only. |

## Inline style policy

- Keep inline style when the value is calculated at runtime: DOM coordinates, measured width, chart range position, column width, alignment, or data-driven color.
- Move inline style to CSS Modules when the value is static visual styling: padding, border, background, text color, cursor, typography, or fallback box styling.

## Tailwind decision rule

Tailwind must not be introduced to bypass ownership problems. If introduced later, it needs an explicit rule for which components may use utilities and how that rule coexists with the CSS facade list above.
