import { useEffect, useState } from 'react'
import { dashboardApi, type SecondaryCompetitorChannel } from '../../../api'
import type { ApiUnitErrorInfo } from '../../../types'
import { makeApiErrorInfo } from './apiErrorInfo'

export function useCompetitorChannels(pageName: string) {
  const [competitorChannels, setCompetitorChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [channelId, setChannelId] = useState('')
  const [channelsError, setChannelsError] = useState<ApiUnitErrorInfo | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const rows = await dashboardApi.getSecondaryCompetitorChannels()
        if (!alive) return
        if (!rows.length) throw new Error('경쟁사 채널 데이터가 비어 있습니다.')
        setCompetitorChannels(rows)
        setChannelId((prev) => prev || rows[0]?.id || '')
        setChannelsError(null)
      } catch (err) {
        if (!alive) return
        setCompetitorChannels([])
        setChannelId('')
        setChannelsError(makeApiErrorInfo(pageName, 'getSecondaryCompetitorChannels()', err))
      }
    })()
    return () => {
      alive = false
    }
  }, [pageName])

  return {
    competitorChannels,
    channelId,
    setChannelId,
    channelsError,
  }
}
