import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi, type ProductSalesInsight, type SecondaryCompetitorChannel } from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import { monthToEndDate, monthToStartDate } from '../../../../../utils/date'
import { buildSalesKpiColumn } from '../../../../../utils/salesKpiColumn'

type Params = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  channel: SecondaryCompetitorChannel
  selectedStart: string
  selectedEnd: string
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export function useSecondarySalesInsight({
  primary,
  secondary,
  channel,
  selectedStart,
  selectedEnd,
  makeApiErrorInfo,
}: Params) {
  const requestSeqRef = useRef(0)
  const [salesInsight, setSalesInsight] = useState<ProductSalesInsight | null>(null)
  const [salesInsightError, setSalesInsightError] = useState<ApiUnitErrorInfo | null>(null)

  useEffect(() => {
    return () => {
      requestSeqRef.current += 1
    }
  }, [])

  useEffect(() => {
    let alive = true
    const reqSeq = requestSeqRef.current + 1
    requestSeqRef.current = reqSeq
    void (async () => {
      try {
        const result = await dashboardApi.getProductSalesInsight(primary.skuGroupKey, {
          startDate: monthToStartDate(selectedStart),
          endDate: monthToEndDate(selectedEnd),
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
              competitorChannelId: channel.id,
            })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [channel.id, makeApiErrorInfo, primary.skuGroupKey, selectedEnd, selectedStart])

  const fallbackSelfCol = useMemo(
    () => buildSalesKpiColumn('self', primary, secondary, channel),
    [primary, secondary, channel],
  )
  const fallbackCompCol = useMemo(
    () => buildSalesKpiColumn('competitor', primary, secondary, channel),
    [primary, secondary, channel],
  )

  return {
    selfCol: salesInsight?.self ?? fallbackSelfCol,
    compCol: salesInsight?.competitor ?? fallbackCompCol,
    salesInsightError,
  }
}
