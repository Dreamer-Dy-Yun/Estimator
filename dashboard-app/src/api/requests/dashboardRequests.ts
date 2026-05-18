import type { DashboardApi } from '../types'
import { USE_MOCK_API } from './httpClient'
import { httpDashboardRequests } from './httpDashboardRequests'
import { mockDashboardRequests } from './mockDashboardRequests'

/**
 * Dashboard request adapter selector.
 *
 * Keep pages, hooks, and components importing from `src/api` only. This file is
 * the environment switch point; the domain-specific adapter bodies live in
 * `mockDashboardRequests.ts` and `httpDashboardRequests.ts`.
 *
 * Backend contract notes remain in `MD/backend-api/backend-api-spec.md`.
 * When a request payload/response changes, update `src/api/types/*`, the
 * matching adapter file, and the backend API spec together.
 */
export const dashboardRequests: DashboardApi = USE_MOCK_API ? mockDashboardRequests : httpDashboardRequests
