# Dashboard deployment trigger

## Goal

Trigger the dashboard GitHub Pages deployment from the latest `main` state after GitHub workflow dispatch returned HTTP 500.

## Scope

- Documentation-only trigger under `MD/` so the existing push path filter runs the deployment workflow.
- No dashboard source, API contract, runtime behavior, or build configuration change.

## Result

A push to `main` should run `Deploy dashboard to GitHub Pages` for the new HEAD.
