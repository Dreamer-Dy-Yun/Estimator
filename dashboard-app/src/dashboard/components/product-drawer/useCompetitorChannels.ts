import { useEffect, useState } from 'react'
import { dashboardApi, type SecondaryCompetitorChannel } from '../../../api'
import type { ApiUnitErrorInfo } from '../../../types'
import { makeApiErrorInfo } from './apiErrorInfo'

export function useCompetitorChannels(pageName: string) : { competitorChannels: SecondaryCompetitorChannel[]; channelId: string; setChannelId: React.Dispatch<React.SetStateAction<string>>; channelsError: ApiUnitErrorInfo | null; } {
  const [competitorChannels, setCompetitorChannels]: [SecondaryCompetitorChannel[], React.Dispatch<React.SetStateAction<SecondaryCompetitorChannel[]>>] = useState<SecondaryCompetitorChannel[]>([])
  const [channelId, setChannelId]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [channelsError, setChannelsError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)

  useEffect(() : () => void => {
    let alive: boolean = true
    void (async () : Promise<void> => {
      try {
        const rows: SecondaryCompetitorChannel[] = await dashboardApi.getSecondaryCompetitorChannels()
        if (!alive) return
        if (!rows.length) throw new Error('경쟁사 채널 데이터가 비어 있습니다.')
        setCompetitorChannels(rows)
        setChannelId((prev: string) : string => prev || rows[0]!.id)
        setChannelsError(null)
      } catch (err) {
        if (!alive) return
        setCompetitorChannels([])
        setChannelId('')
        setChannelsError(makeApiErrorInfo(pageName, 'getSecondaryCompetitorChannels()', err))
      }
    })()
    return () : void => {
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
