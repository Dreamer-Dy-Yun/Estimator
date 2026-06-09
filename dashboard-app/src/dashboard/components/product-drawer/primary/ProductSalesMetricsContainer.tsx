import { useEffect, useRef, useState } from 'react'
import {
  dashboardApi,
  type ProductComparisonBaseSubjectRef,
  type ProductComparisonTarget,
  type ProductComparisonTargetKind,
  type ProductSalesInsight,
} from '../../../../api'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../../components/LoadingSpinner'
import type { ApiUnitErrorInfo } from '../../../../types'
import styles from '../../common.module.css'
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
    comparison: comparisonTarget == null ? null : {
      role: 'comparison',
      kind: comparisonTarget.kind,
      sourceId: comparisonTarget.sourceId,
    },
  })
  const salesInsight: ProductSalesInsight | null =
    comparisonTarget != null && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.data : null
  const salesInsightError: ApiUnitErrorInfo | null =
    comparisonTarget != null && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.error : null
  const activeComparisonTargets: ProductComparisonTarget[] = comparisonTargets.filter(
    (target: ProductComparisonTarget) : boolean => target.kind === comparisonMode,
  )
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
          comparison: {
            role: 'comparison',
            kind: comparisonTarget.kind,
            sourceId: comparisonTarget.sourceId,
          },
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
              comparison: {
                role: 'comparison',
                kind: comparisonTarget.kind,
                sourceId: comparisonTarget.sourceId,
              },
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

  if (salesMetricsError != null) {
    return (
      <div className={`${styles.card} ${styles.drawerSalesMetricsCard}`}>
        <div className={styles.cardTitle}>
          판매 정보
          <ApiUnitErrorBadge error={salesMetricsError} />
        </div>
        <p className={styles.drawerErrorText}>판매 정보를 불러오지 못했습니다.</p>
      </div>
    )
  }

  if (targetsLoading && comparisonTargets.length === 0) {
    return (
      <div className={`${styles.card} ${styles.drawerSalesMetricsCard}`}>
        <div className={styles.cardTitle}>{'\uD310\uB9E4 \uC815\uBCF4'}</div>
        <LoadingSpinner label={'\uD310\uB9E4 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911'} />
      </div>
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
        comparisonFilter={comparisonFilter}
      />
    )
  }

  if (salesInsight == null) {
    return (
      <div className={`${styles.card} ${styles.drawerSalesMetricsCard}`}>
        <div className={styles.cardTitle}>{'\uD310\uB9E4 \uC815\uBCF4'}</div>
        <LoadingSpinner label={'\uD310\uB9E4 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911'} />
      </div>
    )
  }

  return (
    <SalesMetricsCard
      targetPeriodDays={salesInsight.targetPeriodDays}
      sales={{
        baseLabel: salesInsight.base.label,
        comparisonLabel: salesInsight.comparison.label,
        base: salesInsight.baseMetrics,
        comparison: salesInsight.comparisonMetrics,
      }}
      comparisonFilter={comparisonFilter}
    />
  )
}
