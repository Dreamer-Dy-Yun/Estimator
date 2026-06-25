import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../api'
import { ComponentErrorBoundary } from '../../../../components/ComponentErrorBoundary'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../types'
import styles from '../../common.module.css'
import type { ProductMonthlyTrendChartPoint } from './monthlyTrendChartModel'
import { ProductMonthlyTrendContainer } from './ProductMonthlyTrendContainer'
import { ProductSalesMetricsContainer } from './ProductSalesMetricsContainer'

export type Props = {
  summary: ProductPrimarySummary
  periodStart: string
  periodEnd: string
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonTarget: ProductComparisonTarget | null
  selectedStart: string
  selectedEnd: string
  forecastMonths: number
  selfCompanyLabel: string
  onForecastMonthsChange: (months: number) => void
  onMonthlyTrendChange: (monthlyTrend: ProductMonthlyTrendChartPoint[] | null) => void
  expandPaneOpen: boolean
  secondaryEnabled?: boolean
  onToggleSecondary: () => void
  onClose: () => void
  comparisonState: {
    comparisonTargets: ProductComparisonTarget[]
    comparisonMode: ProductComparisonTarget['kind']
    comparisonTarget: ProductComparisonTarget | null
    targetsLoading: boolean
    targetsError: ApiUnitErrorInfo | null
    onComparisonModeChange: React.Dispatch<React.SetStateAction<ProductComparisonTarget['kind']>>
    onComparisonTargetChange: (next: string) => void
  }
  pageName: string
}

export function ProductPrimaryDrawer({
  summary,
  periodStart,
  periodEnd,
  baseSubject,
  comparisonTarget,
  selectedStart,
  selectedEnd,
  forecastMonths,
  selfCompanyLabel,
  onForecastMonthsChange,
  onMonthlyTrendChange,
  expandPaneOpen,
  secondaryEnabled = true,
  onToggleSecondary,
  onClose,
  comparisonState,
  pageName,
}: Props) : React.JSX.Element {
  return (
    <div className={styles.drawerColumn}>
      {secondaryEnabled && (
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
      )}
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
              <span className={styles.metaChip}>{summary.code}</span>
              <span className={styles.metaChip}>{summary.colorCode}</span>
              <span className={styles.metaChip}>{summary.productName}</span>
            </div>
            <div className={styles.productImageWrap}>
              {summary.imageUrl
                ? <img className={styles.productImage} src={summary.imageUrl} alt={summary.productName} />
                : <span className={styles.productImagePlaceholder} role="img" aria-label="이미지 없음" />}
            </div>
          </div>
        </ComponentErrorBoundary>

        <ComponentErrorBoundary page={pageName} unit="PrimarySalesMetricsCard">
          <ProductSalesMetricsContainer
            skuGroupKey={summary.skuGroupKey}
            startDate={periodStart}
            endDate={periodEnd}
            baseSubject={baseSubject}
            comparisonTarget={comparisonState.comparisonTarget}
            comparisonTargets={comparisonState.comparisonTargets}
            comparisonMode={comparisonState.comparisonMode}
            targetsLoading={comparisonState.targetsLoading}
            targetsError={comparisonState.targetsError}
            onComparisonModeChange={comparisonState.onComparisonModeChange}
            onComparisonTargetChange={comparisonState.onComparisonTargetChange}
            pageName={pageName}
          />
        </ComponentErrorBoundary>

        <ComponentErrorBoundary page={pageName} unit="PrimarySalesTrendCard">
          <ProductMonthlyTrendContainer
            skuGroupKey={summary.skuGroupKey}
            baseSubject={baseSubject}
            comparisonTarget={comparisonTarget}
            periodStart={periodStart}
            periodEnd={periodEnd}
            forecastMonths={forecastMonths}
            selfCompanyLabel={selfCompanyLabel}
            onForecastMonthsChange={onForecastMonthsChange}
            onMonthlyTrendChange={onMonthlyTrendChange}
            fallbackTrend={summary.monthlySalesTrend ?? []}
            pageName={pageName}
          />
        </ComponentErrorBoundary>
      </div>
    </div>
  )
}
