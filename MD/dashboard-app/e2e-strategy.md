# dashboard-app E2E strategy

## Goal

Keep browser QA useful without making every deployment wait for full Playwright coverage.

## Suites

| Suite | Command | Scope |
|---|---|---|
| smoke | `npm run test:e2e` or `npm run test:e2e:smoke` | Login, core navigation, self drawer, candidate stash detail, inventory toast |
| full | `npm run test:e2e:full` | All Playwright specs |
| admin | `npm run test:e2e:admin` | Admin GPT key and Google Sheets dialogs |
| candidate | `npm run test:e2e:candidate` | Candidate stash and analysis candidate flows |

## Local rule

- Run `npm run test:e2e` when a fast browser smoke is enough.
- Run `npm run test:e2e:full` before declaring broad browser-flow hardening complete.
- If browsers are not installed locally, install Chromium with `npx playwright install chromium`.

## CI rule

- GitHub Pages deployment keeps `lint`, `check:encoding`, `test:run`, and `build` as mandatory gates.
- Playwright runs in the separate `Dashboard E2E` workflow so browser installation cost does not block every deploy.
- The manual workflow accepts `smoke`, `full`, `admin`, or `candidate`.

## Configuration

- `playwright.config.ts` uses `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_WEB_SERVER_COMMAND` when provided.
- Local default server is Vite dev server on `127.0.0.1:4175`.
- CI E2E builds once and serves the preview bundle.

## Tag ownership

- `@smoke`: fast deployment confidence flow.
- `@admin`: admin-only browser flow.
- `@candidate`: candidate-stash or candidate-add flow.
- `@keyboard`: keyboard interaction flow.
