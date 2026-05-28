import { useEffect, useRef, useState } from 'react'
import {
  dashboardApi,
  type ProductSalesInsight,
  type SecondaryCompetitorChannel,
} from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'
import { monthToEndDate, monthToStartDate } from '../../../../../utils/date'

type Params = {
  primary: ProductPrimarySummary
  channel: SecondaryCompetitorChannel
  selectedStart: string
  selectedEnd: string
  companyUuid?: string
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export function useSecondarySalesInsight({
  primary,
  channel,
  selectedStart,
  selectedEnd,
  companyUuid,
  makeApiErrorInfo,
}: Params) {
  const requestSeqRef = useRef(0)
  const [salesInsight, setSalesInsight] = useState<ProductSalesInsight | null>(null)
  const [salesInsightError, setSalesInsightError] = useState<ApiUnitErrorInfo | null>(null)
  const [salesInsightLoading, setSalesInsightLoading] = useState(true)

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
          startDate: monthToStartDate(selectedStart),
          endDate: monthToEndDate(selectedEnd),
          companyUuid,
          competitorChannelId: channel.id,
        })
        if (!alive || requestSeqRef.current !== reqSeq) return
        setSalesInsight(result)
        setSalesInsightError(null)
      } catch (err) {
        if (!alive || requestSeqRef.current !== reqSeq) return
        setSalesInsight(null)
        setSalesInsightError(
          makeApiErrorInfo(
            `getProductSalesInsight(${JSON.stringify({
              skuGroupKey: primary.skuGroupKey,
              startDate: monthToStartDate(selectedStart),
              endDate: monthToEndDate(selectedEnd),
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
  }, [channel.id, companyUuid, makeApiErrorInfo, primary.skuGroupKey, selectedEnd, selectedStart])

  return {
    selfCol: salesInsight?.self ?? null,
    compCol: salesInsight?.competitor ?? null,
    salesInsightError,
    salesInsightLoading,
  }
}
