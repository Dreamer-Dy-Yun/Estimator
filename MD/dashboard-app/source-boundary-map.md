# dashboard-app Source Boundary Map

Last updated: 2026-05-29

## Index

| Area | Document | Source |
|---|---|---|
| API facade, HTTP/mock, failure kind, company scope | `boundaries/api-contracts.md` | `dashboard-app/src/api` |
| Analysis pages | `boundaries/analysis-pages.md` | `dashboard-app/src/dashboard/pages` |
| Candidate stash | `boundaries/candidate-stash.md` | `dashboard-app/src/dashboard/components/candidate-stash` |
| Product drawer and snapshot | `boundaries/product-drawer.md` | `dashboard-app/src/dashboard/components/product-drawer`, `dashboard-app/src/snapshot` |
| Shared UI/hooks/utils | `boundaries/shared-modules.md` | `dashboard-app/src/components`, `dashboard-app/src/dashboard/hooks`, `dashboard-app/src/utils` |
| Runtime, build, deploy, e2e | `boundaries/repository-runtime.md` | `.github`, `dashboard-app/e2e`, `dashboard-app/vite.config.ts` |
| Backend API | `../backend-api/dashboard-api-contract-catalog.md` | `dashboard-app/src/api/types` |

## Update rule

- API/type changes update backend API docs.
- Product drawer or snapshot changes update product drawer boundary and snapshot docs.
- Candidate stash changes update candidate stash boundary.
- UI state/failure changes update QA/failure docs only if they define a reusable policy.
- Do not keep dated work logs in boundary documents.
