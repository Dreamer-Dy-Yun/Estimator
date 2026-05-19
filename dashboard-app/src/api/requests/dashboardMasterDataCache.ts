import type { DashboardApi } from '../types'

/**
 * Caches dashboard master-data requests that are shared by pages and drawers.
 *
 * This keeps common components such as ProductDrawer independent: they still
 * call the same API boundary, while duplicate page/drawer reads coalesce here.
 * Failed requests are not cached so the next caller can retry.
 */
export function withDashboardMasterDataCache(adapter: DashboardApi): DashboardApi {
  let competitorChannelsRequest: ReturnType<DashboardApi['getSecondaryCompetitorChannels']> | null = null

  return {
    ...adapter,
    getSecondaryCompetitorChannels: () => {
      competitorChannelsRequest ??= adapter.getSecondaryCompetitorChannels().catch((err: unknown) => {
        competitorChannelsRequest = null
        throw err
      })
      return competitorChannelsRequest
    },
  }
}
