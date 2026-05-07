import { useEffect, useRef, useState } from 'react'
import { dashboardApi, type ProductSalesInsight, type SecondaryCompetitorChannel } from '../../../api'
import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../types'
import { SalesMetricsCard } from '../product-secondary/cards/SalesMetricsCard'
import styles from '../common.module.css'
import { makeApiErrorInfo } from './apiErrorInfo'

type Props = {
  productId: string
  startDate: string
  endDate: string
  channelId: string
  competitorChannels: SecondaryCompetitorChannel[]
  channelsError: ApiUnitErrorInfo | null
  onChannelChange: (next: string) => void
  pageName: string
}

export function ProductSalesMetricsContainer({
  productId,
  startDate,
  endDate,
  channelId,
  competitorChannels,
  channelsError,
  onChannelChange,
  pageName,
}: Props) {
  const reqSeqRef = useRef(0)
  const [salesInsight, setSalesInsight] = useState<ProductSalesInsight | null>(null)
  const [salesInsightError, setSalesInsightError] = useState<ApiUnitErrorInfo | null>(null)

  useEffect(() => {
    if (!channelId) {
      setSalesInsight(null)
      return
    }
    let alive = true
    const reqSeq = ++reqSeqRef.current
    void (async () => {
      try {
        const data = await dashboardApi.getProductSalesInsight(productId, {
          startDate,
          endDate,
          competitorChannelId: channelId,
        })
        if (!alive || reqSeq !== reqSeqRef.current) return
        setSalesInsight(data)
        setSalesInsightError(null)
      } catch (err) {
        if (!alive || reqSeq !== reqSeqRef.current) return
        setSalesInsight(null)
        setSalesInsightError(
          makeApiErrorInfo(
            pageName,
            `getProductSalesInsight(${JSON.stringify({ productId, startDate, endDate, competitorChannelId: channelId })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [channelId, endDate, pageName, productId, startDate])

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
        <p className={styles.drawerLoadingText}>판매 정보를 불러오는 중...</p>
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
