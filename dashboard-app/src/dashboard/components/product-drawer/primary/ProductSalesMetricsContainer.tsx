import { useEffect, useRef, useState } from 'react'
import { dashboardApi, type ProductSalesInsight, type SecondaryCompetitorChannel } from '../../../../api'
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
  companyUuid?: string
  channelId: string
  competitorChannels: SecondaryCompetitorChannel[]
  channelsError: ApiUnitErrorInfo | null
  onChannelChange: (next: string) => void
  selfCompanyLabel: string
  pageName: string
}

export type SalesInsightState = {
  key: string
  data: ProductSalesInsight | null
  error: ApiUnitErrorInfo | null
}

export function ProductSalesMetricsContainer({
  skuGroupKey,
  startDate,
  endDate,
  companyUuid,
  channelId,
  competitorChannels,
  channelsError,
  onChannelChange,
  selfCompanyLabel,
  pageName,
}: Props) : React.JSX.Element {
  const reqSeqRef: React.RefObject<number> = useRef(0)
  const [salesInsightState, setSalesInsightState]: [SalesInsightState | null, React.Dispatch<React.SetStateAction<SalesInsightState | null>>] = useState<SalesInsightState | null>(null)
  const salesInsightRequestKey: string = JSON.stringify({
    skuGroupKey,
    startDate,
    endDate,
    companyUuid,
    competitorChannelId: channelId,
  })
  const salesInsight: ProductSalesInsight | null =
    channelId && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.data : null
  const salesInsightError: ApiUnitErrorInfo | null =
    channelId && salesInsightState?.key === salesInsightRequestKey ? salesInsightState.error : null

  useEffect(() : (() => void) | undefined => {
    if (!channelId) return
    let alive: boolean = true
    const reqSeq: number = ++reqSeqRef.current
    void (async () : Promise<void> => {
      try {
        const data: ProductSalesInsight = await dashboardApi.getProductSalesInsight(skuGroupKey, {
          startDate,
          endDate,
          companyUuid,
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
            `getProductSalesInsight(${JSON.stringify({ skuGroupKey, startDate, endDate, companyUuid, competitorChannelId: channelId })})`,
            err,
          ),
        })
      }
    })()
    return () : void => {
      alive = false
    }
  }, [channelId, companyUuid, endDate, pageName, salesInsightRequestKey, skuGroupKey, startDate])

  const salesMetricsError: ApiUnitErrorInfo | null = salesInsightError ?? channelsError

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
      selfCompanyLabel={selfCompanyLabel}
      channelFilter={{
        channelId,
        competitorChannels,
        error: channelsError,
        onChannelChange,
      }}
    />
  )
}
