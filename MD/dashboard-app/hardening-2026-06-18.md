# Dashboard app hardening - 2026-06-18

## Goal

Stabilize the product secondary drawer and candidate snapshot flow around the current order coverage contract.

## Scope

- Inbound split date validation.
- Candidate detail snapshot consistency.
- Order snapshot v5 restore contract.
- Mock stock-order calculation parity with the current API request.
- Documentation alignment for frontend and backend contracts.

## Principles

- Do not keep legacy names when their meaning no longer matches the behavior.
- Do not silently accept inconsistent API state at the frontend boundary.
- Do not mark restore-critical snapshot fields optional in code or documentation.
- Treat `currentOrderInboundDueDate <= date < nextOrderInboundDueDate` as the split/order coverage boundary.

## Result

- Split round dates are validated against the current inbound date and next inbound exclusive boundary.
- The first split round can use the current inbound date; later rounds must increase.
- `stockOrderResult` and `unitEconomics` are required in `OrderSnapshotDocument` v5.
- v4 snapshot inputs with `dailyTrendLeadTimeDays` and `leadTimeDays` are migrated into the v5 coverage field names during parse.
- Candidate detail responses now fail fast when `hasConfirmedOrderSnapshot` disagrees with `confirmedOrderSnapshot`.
- Mock stock-order calculation now reads `orderCoverageDays` instead of ignoring the request field.

## Follow-up candidates

- Replace the remaining UI-coupled snapshot type aliases with pure snapshot-local DTOs if backend persistence starts versioned migrations independently.
- Add backend-side validation for the same candidate snapshot flag consistency rule.
