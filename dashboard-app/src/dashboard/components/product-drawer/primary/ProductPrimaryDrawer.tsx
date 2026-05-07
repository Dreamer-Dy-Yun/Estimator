import { useMemo } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { ComponentErrorBoundary } from '../../../../components/ComponentErrorBoundary'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../types'
import styles from '../../common.module.css'
import { ProductMonthlyTrendContainer } from './ProductMonthlyTrendContainer'
import { ProductSalesMetricsContainer } from './ProductSalesMetricsContainer'

type Props = {
  summary: ProductPrimarySummary
  periodStart: string
  periodEnd: string
  selectedStart: string
  selectedEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  expandPaneOpen: boolean
  onToggleSecondary: () => void
  onClose: () => void
  channelState: {
    channelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    channelsError: ApiUnitErrorInfo | null
    onChannelChange: (next: string) => void
  }
  pageName: string
}

export function ProductPrimaryDrawer({
  summary,
  periodStart,
  periodEnd,
  selectedStart,
  selectedEnd,
  forecastMonths,
  onForecastMonthsChange,
  expandPaneOpen,
  onToggleSecondary,
  onClose,
  channelState,
  pageName,
}: Props) {
  const competitorChannelLabel = useMemo(
    () => channelState.competitorChannels.find((ch) => ch.id === channelState.channelId)?.label ?? '',
    [channelState.channelId, channelState.competitorChannels],
  )
  const imageUrl = `https://placehold.co/640x360?text=${encodeURIComponent(summary.name)}`

  return (
    <div className={styles.drawerColumn}>
      <button
        type="button"
        className={styles.drawerExpandToggle}
        onClick={onToggleSecondary}
        aria-expanded={expandPaneOpen}
        aria-label={expandPaneOpen ? '추가 영역 닫기' : '추가 영역 열기'}
      >
        <svg
          className={styles.drawerExpandToggleIcon}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          {expandPaneOpen ? (
            <path
              d="M8 5.5L17 12L8 18.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M16 5.5L7 12L16 18.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </button>
      <div className={styles.drawerHead}>
        <div className={styles.drawerHeadTitle}>
          <strong>상품 인사이트</strong>
          <span className={styles.periodMeta}>기간: {selectedStart} ~ {selectedEnd}</span>
        </div>
        <button
          type="button"
          className={`${styles.iconCloseButton} ${styles.drawerClose}`}
          onClick={onClose}
          aria-label="드로어 닫기"
        />
      </div>
      <div className={styles.drawerBody}>
        <ComponentErrorBoundary page={pageName} unit="PrimaryProductSummaryCard">
          <div className={`${styles.card} ${styles.productSummaryCard} ${expandPaneOpen ? styles.productSummaryCardMetaCollapsed : ''}`}>
            <div className={`${styles.metaChips} ${expandPaneOpen ? styles.metaChipsCollapsed : ''}`}>
              <span className={styles.metaChip}>{summary.brand}</span>
              <span className={styles.metaChip}>{summary.category}</span>
              <span className={styles.metaChip}>{summary.productCode}</span>
              <span className={styles.metaChip}>{summary.name}</span>
            </div>
            <div className={styles.productImageWrap}>
              <img className={styles.productImage} src={imageUrl} alt={summary.name} />
            </div>
          </div>
        </ComponentErrorBoundary>

        <ComponentErrorBoundary page={pageName} unit="PrimarySalesMetricsCard">
          <ProductSalesMetricsContainer
            productId={summary.id}
            startDate={periodStart}
            endDate={periodEnd}
            channelId={channelState.channelId}
            competitorChannels={channelState.competitorChannels}
            channelsError={channelState.channelsError}
            onChannelChange={channelState.onChannelChange}
            pageName={pageName}
          />
        </ComponentErrorBoundary>

        <ComponentErrorBoundary page={pageName} unit="PrimarySalesTrendCard">
          <ProductMonthlyTrendContainer
            productId={summary.id}
            fallbackTrend={summary.monthlySalesTrend}
            periodStart={periodStart}
            periodEnd={periodEnd}
            forecastMonths={forecastMonths}
            onForecastMonthsChange={onForecastMonthsChange}
            channelId={channelState.channelId}
            fallbackChannelLabel={competitorChannelLabel}
            pageName={pageName}
          />
        </ComponentErrorBoundary>
      </div>
    </div>
  )
}
