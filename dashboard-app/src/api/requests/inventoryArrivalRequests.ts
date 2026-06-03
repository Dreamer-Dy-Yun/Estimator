import type { InventoryArrivalCollectionResult } from '..'
import type { CompanyMutationScopeParams } from '../types'
import { mockInventoryArrivalApi } from '../mock'
import type { InventoryArrivalApi, InventoryArrivalCollectionParams } from '../types'
import { normalizeCompanyMutationScopeParams } from '../types/company'
import { apiRequest, USE_MOCK_API } from './httpClient'

/**
 * Backend contract switch point for spreadsheet-driven inbound date collection.
 *
 * Python backend direction:
 * - This endpoint is available to every authenticated user, not only admins.
 * - The frontend passes one concrete companyUuid. The backend chooses that
 *   company's active Google Sheets configuration for inbound date collection.
 *   The frontend does not pass a sheet key or raw service account key.
 * - The backend reads the configured spreadsheet, validates rows, and upserts
 *   inbound arrival dates in its own transaction boundary.
 * - The response must be a summary only: collected count, failed count, status,
 *   and a user-facing message. Do not return the collected row list to this UI.
 * - If sheet access, parsing, or persistence fails before any row can be
 *   accepted, return an HTTP error with `{ message }`. Partial row failures can
 *   return `status: "partial"` with `failedCount > 0`.
 */
function buildInventoryArrivalCollectionBody(params: InventoryArrivalCollectionParams) : { companyUuid: string; } {
  const normalizedParams: CompanyMutationScopeParams = normalizeCompanyMutationScopeParams(params)
  return {
    companyUuid: normalizedParams.companyUuid,
  }
}

const httpInventoryArrivalRequests: InventoryArrivalApi = {
  collectInventoryArrivalDates: (params: CompanyMutationScopeParams) : Promise<InventoryArrivalCollectionResult> =>
    apiRequest('/inventory-arrival-dates/collect-from-sheet', {
      method: 'POST',
      body: JSON.stringify(buildInventoryArrivalCollectionBody(params)),
    }),
}

const mockInventoryArrivalRequests: InventoryArrivalApi = {
  collectInventoryArrivalDates: (params: CompanyMutationScopeParams) : Promise<InventoryArrivalCollectionResult> => mockInventoryArrivalApi.collectInventoryArrivalDates(params),
}

export const inventoryArrivalRequests: InventoryArrivalApi = USE_MOCK_API
  ? mockInventoryArrivalRequests
  : httpInventoryArrivalRequests
