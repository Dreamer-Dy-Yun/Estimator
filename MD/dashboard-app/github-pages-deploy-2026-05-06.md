# GitHub Pages Deployment

## Goal

Deploy the `dashboard-app` Vite application from the existing GitHub repository.

## Scope

- Add a GitHub Actions workflow for GitHub Pages.
- Keep the app source and local build behavior unchanged.
- Build the deployed artifact with the `/Estimator/` base path required by this repository URL.

## Principles

- Validate with the existing test suite before publishing.
- Use `npm install` in CI because the current lockfile is missing Linux optional peer entries that make `npm ci` fail on GitHub-hosted runners.
- Keep deployment config separate from UI code.

## Plan

1. Run the dashboard test suite and production build locally.
2. Add a Pages deployment workflow on `main`.
3. Enable GitHub Pages for the repository.
4. Push the workflow to `origin/main` and confirm the deployment run.

## Result

The project now has a GitHub Actions workflow that installs dependencies, tests, builds, and deploys `dashboard-app/dist` to GitHub Pages.

## Non-goals

- No UI changes.
- No backend API contract changes.
