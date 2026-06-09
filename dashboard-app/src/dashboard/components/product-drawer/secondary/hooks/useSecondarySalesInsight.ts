import type { ProductSalesInsightColumn } from '../../../../../api/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  dashboardApi,
  type ProductComparisonBaseSubjectRef,
  type ProductComparisonTarget,
  type ProductSalesInsight,
} from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'

export type Params = {
  primary: ProductPrimarySummary
  comparisonTarget: ProductComparisonTarget | null
  periodStart: string
  periodEnd: string
  baseSubject: ProductComparisonBaseSubjectRef
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export type SalesInsightState = {
  requestKey: string
  result: ProductSalesInsight
}

export function useSecondarySalesInsight({
  primary,
  comparisonTarget,
  periodStart,
  periodEnd,
  baseSubject,
  makeApiErrorInfo,
}: Params) : { selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } {
  const requestSeqRef: React.RefObject<number> = useRef(0)
  const requestKey: string = useMemo(() : string => JSON.stringify({
    skuGroupKey: primary.skuGroupKey,
    base: baseSubject,
    periodStart,
    periodEnd,
    comparison: comparisonTarget == null ? null : {
      role: 'comparison',
      kind: comparisonTarget.kind,
      sourceId: comparisonTarget.sourceId,
    },
  }), [baseSubject, comparisonTarget, periodEnd, periodStart, primary.skuGroupKey])
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
      if (comparisonTarget == null) {
        setSalesInsightState(null)
        setSalesInsightError(makeApiErrorInfo(
          'getProductSalesInsight(comparisonTarget)',
          new Error('Product comparison target is required for sales insight.'),
        ))
        setSalesInsightLoading(false)
        return
      }
      try {
        const result: ProductSalesInsight = await dashboardApi.getProductSalesInsight(primary.skuGroupKey, {
          startDate: periodStart,
          endDate: periodEnd,
          base: baseSubject,
          comparison: {
            role: 'comparison',
            kind: comparisonTarget.kind,
            sourceId: comparisonTarget.sourceId,
          },
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
              base: baseSubject,
              comparison: {
                role: 'comparison',
                kind: comparisonTarget.kind,
                sourceId: comparisonTarget.sourceId,
              },
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
  }, [baseSubject, comparisonTarget, makeApiErrorInfo, periodEnd, periodStart, primary.skuGroupKey, requestKey])

  return {
    selfCol: salesInsight?.baseMetrics ?? null,
    compCol: salesInsight?.comparisonMetrics ?? null,
    salesInsightError,
    salesInsightLoading,
  }
}
