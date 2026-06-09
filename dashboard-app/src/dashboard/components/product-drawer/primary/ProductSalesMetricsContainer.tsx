import { useEffect, useRef, useState } from 'react'
import {
  dashboardApi,
  type ProductComparisonBaseSubjectRef,
  type ProductComparisonTarget,
  type ProductComparisonTargetKind,
  type ProductSalesInsight,
} from '../../../../api'
import type { ApiUnitErrorInfo } from '../../../../types'
import { makeApiErrorInfo } from '../apiErrorInfo'
import { SalesMetricsCard } from './cards/SalesMetricsCard'

export type Props = {
  skuGroupKey: string
  startDate: string
  endDate: string
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonTarget: ProductComparisonTarget | null
  comparisonTargets: ProductComparisonTarget[]
  comparisonMode: ProductComparisonTargetKind
  targetsLoading: boolean
  targetsError: ApiUnitErrorInfo | null
  onComparisonModeChange: React.Dispatch<React.SetStateAction<ProductComparisonTargetKind>>
  onComparisonTargetChange: (next: string) => void
  pageName: string
}

export type SalesInsightState = {
  key: string
  data: ProductSalesInsight | null
  error: ApiUnitErrorInfo | null
}

const NO_COMPARISON_TARGET_MESSAGE_BY_KIND: Record<ProductComparisonTargetKind, string> = {
  'competitor-channel': '\uBE44\uAD50 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  'self-company': '\uC790\uC0AC\uAC04 \uBE44\uAD50 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
}
const SELECTED_COMPARISON_TARGET_MISSING_MESSAGE = '\uC120\uD0DD\uD55C \uBE44\uAD50 \uB300\uC0C1\uC774 \uD604\uC7AC \uBAA9\uB85D\uC5D0 \uC5C6\uC2B5\uB2C8\uB2E4.'
const SALES_METRICS_LOADING_MESSAGE = '판매 정보를 불러오는 중'
const SALES_METRICS_ERROR_MESSAGE = '판매 정보를 불러오지 못했습니다.'

export function ProductSalesMetricsContainer({
  skuGroupKey,
  startDate,
  endDate,
  baseSubject,
  comparisonTarget,
  comparisonTargets,
  comparisonMode,
  targetsLoading,
  targetsError,
  onComparisonModeChange,
  onComparisonTargetChange,
  pageName,
}: Props) : React.JSX.Element {
  const reqSeqRef: React.RefObject<number> = useRef(0)
  const [salesInsightState, setSalesInsightState]: [SalesInsightState | null, React.Dispatch<React.SetStateAction<SalesInsightState | null>>] = useState<SalesInsightState | null>(null)
  const salesInsightRequestKey: string = JSON.stringify({
    skuGroupKey,
    startDate,
    endDate,
    base: baseSubject,
    comparison: comparisonTarget,
  })
  const salesInsight: ProductSalesInsight | null =
    comparisonTarget != null && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.data : null
  const salesInsightError: ApiUnitErrorInfo | null =
    comparisonTarget != null && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.error : null
  const visibleSalesInsight: ProductSalesInsight | null = salesInsight ?? salesInsightState?.data ?? null
  const salesInsightPending: boolean =
    comparisonTarget != null &&
    targetsError == null &&
    salesInsightState?.key !== salesInsightRequestKey
  const activeComparisonTargets: ProductComparisonTarget[] = comparisonTargets.filter(
    (target: ProductComparisonTarget) : boolean => target.kind === comparisonMode,
  )
  const visibleComparisonMode: ProductComparisonTargetKind = visibleSalesInsight?.comparison.kind ?? comparisonMode
  const visibleComparisonTargets: ProductComparisonTarget[] = comparisonTargets.filter(
    (target: ProductComparisonTarget) : boolean => target.kind === visibleComparisonMode,
  )
  const visibleComparisonTargetId: string = visibleSalesInsight == null
    ? comparisonTarget?.id ?? ''
    : visibleComparisonTargets.find(
      (target: ProductComparisonTarget) : boolean =>
        target.kind === visibleSalesInsight.comparison.kind &&
        target.sourceId === visibleSalesInsight.comparison.sourceId,
    )?.id ?? ''
  const comparisonFilter: {
    selfComparisonEnabled: boolean
    targetId: string
    targets: ProductComparisonTarget[]
    error: ApiUnitErrorInfo | null
    onSelfComparisonToggle: (checked: boolean) => void
    onTargetChange: (next: string) => void
  } = {
    selfComparisonEnabled: comparisonMode === 'self-company',
    targetId: comparisonTarget?.id ?? '',
    targets: activeComparisonTargets,
    error: targetsError,
    onSelfComparisonToggle: (checked: boolean) : void => onComparisonModeChange(checked ? 'self-company' : 'competitor-channel'),
    onTargetChange: onComparisonTargetChange,
  }
  const visibleComparisonFilter: typeof comparisonFilter = {
    ...comparisonFilter,
    selfComparisonEnabled: visibleComparisonMode === 'self-company',
    targetId: visibleComparisonTargetId,
    targets: visibleComparisonTargets,
  }

  useEffect(() : (() => void) | undefined => {
    if (comparisonTarget == null) return
    let alive: boolean = true
    const reqSeq: number = ++reqSeqRef.current
    void (async () : Promise<void> => {
      try {
        const data: ProductSalesInsight = await dashboardApi.getProductSalesInsight(skuGroupKey, {
          startDate,
          endDate,
          base: baseSubject,
          comparison: comparisonTarget,
        })
        if (!alive || reqSeq !== reqSeqRef.current) return
        setSalesInsightState({ key: salesInsightRequestKey, data, error: null })
      } catch (err) {
        if (!alive || reqSeq !== reqSeqRef.current) return
        setSalesInsightState({
          key: salesInsightRequestKey,
          data: null,
          error: makeApiErrorInfo(
            pageName,
            `getProductSalesInsight(${JSON.stringify({
              skuGroupKey,
              startDate,
              endDate,
              base: baseSubject,
              comparison: comparisonTarget,
            })})`,
            err,
          ),
        })
      }
    })()
    return () : void => {
      alive = false
    }
  }, [baseSubject, comparisonTarget, endDate, pageName, salesInsightRequestKey, skuGroupKey, startDate])

  const salesMetricsError: ApiUnitErrorInfo | null = salesInsightError ?? targetsError

  if (targetsLoading && comparisonTargets.length === 0) {
    return (
      <SalesMetricsCard
        targetPeriodDays={{ start: startDate, end: endDate }}
        sales={null}
        loading
        unavailableMessage={SALES_METRICS_LOADING_MESSAGE}
        comparisonFilter={comparisonFilter}
      />
    )
  }

  if (comparisonTarget == null) {
    const unavailableMessage: string = activeComparisonTargets.length === 0
      ? NO_COMPARISON_TARGET_MESSAGE_BY_KIND[comparisonMode]
      : SELECTED_COMPARISON_TARGET_MISSING_MESSAGE
    return (
      <SalesMetricsCard
        targetPeriodDays={{ start: startDate, end: endDate }}
        sales={null}
        unavailableMessage={unavailableMessage}
        error={salesMetricsError}
        comparisonFilter={comparisonFilter}
      />
    )
  }

  if (visibleSalesInsight == null) {
    return (
      <SalesMetricsCard
        targetPeriodDays={{ start: startDate, end: endDate }}
        sales={null}
        loading={salesMetricsError == null}
        unavailableMessage={salesMetricsError == null ? SALES_METRICS_LOADING_MESSAGE : SALES_METRICS_ERROR_MESSAGE}
        error={salesMetricsError}
        comparisonFilter={comparisonFilter}
      />
    )
  }

  return (
    <SalesMetricsCard
      targetPeriodDays={visibleSalesInsight.targetPeriodDays}
      sales={{
        baseLabel: visibleSalesInsight.base.label,
        comparisonLabel: visibleSalesInsight.comparison.label,
        base: visibleSalesInsight.baseMetrics,
        comparison: visibleSalesInsight.comparisonMetrics,
      }}
      loading={salesInsightPending}
      error={salesMetricsError}
      comparisonFilter={visibleComparisonFilter}
    />
  )
}
