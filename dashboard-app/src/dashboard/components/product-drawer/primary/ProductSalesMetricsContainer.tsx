import { useEffect, useRef, useState } from 'react'
import { dashboardApi, type ProductSalesInsight, type SecondaryCompetitorChannel } from '../../../../api'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../../components/LoadingSpinner'
import type { ApiUnitErrorInfo } from '../../../../types'
import styles from '../../common.module.css'
import { makeApiErrorInfo } from '../apiErrorInfo'
import { SalesMetricsCard } from './cards/SalesMetricsCard'

type Props = {
  skuGroupKey: string
  startDate: string
  endDate: string
  channelId: string
  competitorChannels: SecondaryCompetitorChannel[]
  channelsError: ApiUnitErrorInfo | null
  onChannelChange: (next: string) => void
  pageName: string
}

type SalesInsightState = {
  key: string
  data: ProductSalesInsight | null
  error: ApiUnitErrorInfo | null
}

export function ProductSalesMetricsContainer({
  skuGroupKey,
  startDate,
  endDate,
  channelId,
  competitorChannels,
  channelsError,
  onChannelChange,
  pageName,
}: Props) {
  const reqSeqRef = useRef(0)
  const [salesInsightState, setSalesInsightState] = useState<SalesInsightState | null>(null)
  const salesInsightRequestKey = JSON.stringify({
    skuGroupKey,
    startDate,
    endDate,
    competitorChannelId: channelId,
  })
  const salesInsight =
    channelId && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.data : null
  const salesInsightError =
    channelId && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.error : null

  useEffect(() => {
    if (!channelId) return
    let alive = true
    const reqSeq = ++reqSeqRef.current
    void (async () => {
      try {
        const data = await dashboardApi.getProductSalesInsight(skuGroupKey, {
          startDate,
          endDate,
          competitorChannelId: channelId,
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
            `getProductSalesInsight(${JSON.stringify({ skuGroupKey, startDate, endDate, competitorChannelId: channelId })})`,
            err,
          ),
        })
      }
    })()
    return () => {
      alive = false
    }
  }, [channelId, endDate, pageName, salesInsightRequestKey, skuGroupKey, startDate])

  const salesMetricsError = salesInsightError ?? channelsError

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

  if (salesInsight == null) {
    return (
      <div className={`${styles.card} ${styles.drawerSalesMetricsCard}`}>
        <div className={styles.cardTitle}>판매 정보</div>
        <LoadingSpinner label="판매 정보를 불러오는 중" />
      </div>
    )
  }

  return (
    <SalesMetricsCard
      targetPeriodDays={salesInsight.targetPeriodDays}
      sales={{
        channelLabel: salesInsight.competitorChannelLabel,
        self: salesInsight.self,
        competitor: salesInsight.competitor,
      }}
      channelFilter={{
        channelId,
        competitorChannels,
        error: channelsError,
        onChannelChange,
      }}
    />
  )
}
