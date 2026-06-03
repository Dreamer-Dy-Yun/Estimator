import type { ProductSalesInsightColumn } from '../../../../../api/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  dashboardApi,
  type ProductSalesInsight,
  type SecondaryCompetitorChannel,
} from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'

export type Params = {
  primary: ProductPrimarySummary
  channel: SecondaryCompetitorChannel
  periodStart: string
  periodEnd: string
  companyUuid?: string
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export type SalesInsightState = {
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
}: Params) : { selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } {
  const requestSeqRef: React.RefObject<number> = useRef(0)
  const requestKey: string = useMemo(() : string => JSON.stringify({
    skuGroupKey: primary.skuGroupKey,
    companyUuid: companyUuid ?? '',
    periodStart,
    periodEnd,
    competitorChannelId: channel.id,
  }), [channel.id, companyUuid, periodEnd, periodStart, primary.skuGroupKey])
  const [salesInsightState, setSalesInsightState]: [SalesInsightState | null, React.Dispatch<React.SetStateAction<SalesInsightState | null>>] = useState<SalesInsightState | null>(null)
  const [salesInsightError, setSalesInsightError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const [salesInsightLoading, setSalesInsightLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const salesInsight: ProductSalesInsight | null = salesInsightState?.requestKey === requestKey ? salesInsightState.result : null

  useEffect(() : () => void => {
    return () : void => {
      requestSeqRef.current += 1
    }
  }, [])

  useEffect(() : () => void => {
    let alive: boolean = true
    const reqSeq: number = requestSeqRef.current + 1
    requestSeqRef.current = reqSeq
    queueMicrotask(() : void => {
      if (alive && requestSeqRef.current === reqSeq) setSalesInsightLoading(true)
    })
    void (async () : Promise<void> => {
      try {
        const result: ProductSalesInsight = await dashboardApi.getProductSalesInsight(primary.skuGroupKey, {
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
    return () : void => {
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
