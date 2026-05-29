import { useEffect, useMemo, useRef, useState } from 'react'
import {
  dashboardApi,
  type ProductSalesInsight,
  type SecondaryCompetitorChannel,
} from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'

type Params = {
  primary: ProductPrimarySummary
  channel: SecondaryCompetitorChannel
  periodStart: string
  periodEnd: string
  companyUuid?: string
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

type SalesInsightState = {
  requestKey: string
  result: ProductSalesInsight
}

export function useSecondarySalesInsight({
  primary,
  channel,
  periodStart,
  periodEnd,
  companyUuid,
  makeApiErrorInfo,
}: Params) {
  const requestSeqRef = useRef(0)
  const requestKey = useMemo(() => JSON.stringify({
    skuGroupKey: primary.skuGroupKey,
    companyUuid: companyUuid ?? '',
    periodStart,
    periodEnd,
    competitorChannelId: channel.id,
  }), [channel.id, companyUuid, periodEnd, periodStart, primary.skuGroupKey])
  const [salesInsightState, setSalesInsightState] = useState<SalesInsightState | null>(null)
  const [salesInsightError, setSalesInsightError] = useState<ApiUnitErrorInfo | null>(null)
  const [salesInsightLoading, setSalesInsightLoading] = useState(true)
  const salesInsight = salesInsightState?.requestKey === requestKey ? salesInsightState.result : null

  useEffect(() => {
    return () => {
      requestSeqRef.current += 1
    }
  }, [])

  useEffect(() => {
    let alive = true
    const reqSeq = requestSeqRef.current + 1
    requestSeqRef.current = reqSeq
    queueMicrotask(() => {
      if (alive && requestSeqRef.current === reqSeq) setSalesInsightLoading(true)
    })
    void (async () => {
      try {
        const result = await dashboardApi.getProductSalesInsight(primary.skuGroupKey, {
          startDate: periodStart,
          endDate: periodEnd,
          companyUuid,
          competitorChannelId: channel.id,
        })
        if (!alive || requestSeqRef.current !== reqSeq) return
        setSalesInsightState({ requestKey, result })
        setSalesInsightError(null)
      } catch (err) {
        if (!alive || requestSeqRef.current !== reqSeq) return
        setSalesInsightState(null)
        setSalesInsightError(
          makeApiErrorInfo(
            `getProductSalesInsight(${JSON.stringify({
              skuGroupKey: primary.skuGroupKey,
              startDate: periodStart,
              endDate: periodEnd,
              companyUuid,
              competitorChannelId: channel.id,
            })})`,
            err,
          ),
        )
      } finally {
        if (alive && requestSeqRef.current === reqSeq) setSalesInsightLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [channel.id, companyUuid, makeApiErrorInfo, periodEnd, periodStart, primary.skuGroupKey, requestKey])

  return {
    selfCol: salesInsight?.self ?? null,
    compCol: salesInsight?.competitor ?? null,
    salesInsightError,
    salesInsightLoading,
  }
}
