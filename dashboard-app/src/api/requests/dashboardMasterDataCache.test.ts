import { describe, expect, it, vi , type Mock} from 'vitest';
import type { DashboardApi, SecondaryCompetitorChannel } from '../types'
import { withDashboardMasterDataCache } from './dashboardMasterDataCache'

const channels: SecondaryCompetitorChannel[] = [
  { id: 'kream', label: '크림' },
  { id: 'musinsa', label: '무신사' },
]

function createAdapter(
  getSecondaryCompetitorChannels: DashboardApi['getSecondaryCompetitorChannels'],
): DashboardApi {
  return { getSecondaryCompetitorChannels } as DashboardApi
}

describe('withDashboardMasterDataCache', () : void => {
  it('shares one competitor channel request across multiple callers', async () : Promise<void> => {
    const request: Mock<() => Promise<SecondaryCompetitorChannel[]>> = vi.fn(async () : Promise<SecondaryCompetitorChannel[]> => channels)
    const api: DashboardApi = withDashboardMasterDataCache(createAdapter(request))

    const [first, second]: [SecondaryCompetitorChannel[], SecondaryCompetitorChannel[]] = await Promise.all([
      api.getSecondaryCompetitorChannels(),
      api.getSecondaryCompetitorChannels(),
    ])

    expect(first).toEqual(channels)
    expect(second).toEqual(channels)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not cache failed competitor channel requests', async () : Promise<void> => {
    const request: Mock<() => Promise<SecondaryCompetitorChannel[]>> = vi
      .fn<DashboardApi['getSecondaryCompetitorChannels']>()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(channels)
    const api: DashboardApi = withDashboardMasterDataCache(createAdapter(request))

    await expect(api.getSecondaryCompetitorChannels()).rejects.toThrow('temporary failure')
    await expect(api.getSecondaryCompetitorChannels()).resolves.toEqual(channels)
    expect(request).toHaveBeenCalledTimes(2)
  })
})
