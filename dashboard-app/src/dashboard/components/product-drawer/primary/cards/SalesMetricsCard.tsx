import type { ProductComparisonTarget } from '../../../../../api'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { formatCompactKoreanNumber, formatPercent, type CompactKoreanNumberDisplay } from '../../../../../utils/format'
import type { SalesKpiColumn } from '../../../../../utils/salesKpiColumn'
import { KO } from '../../ko'
import styles from './SalesMetricsCard.module.css'

export type Props = {
  targetPeriodDays: { start: string; end: string }
  sales: {
    baseLabel: string
    comparisonLabel: string
    base: SalesKpiColumn
    comparison: SalesKpiColumn
  } | null
  loading?: boolean
  error?: ApiUnitErrorInfo | null
  unavailableMessage?: string
  comparisonFilter?: {
    selfComparisonEnabled: boolean
    targetId: string
    targets: ProductComparisonTarget[]
    error: ApiUnitErrorInfo | null
    onSelfComparisonToggle: (checked: boolean) => void
    onTargetChange: (next: string) => void
  }
}

export type MetricRow = { key: string; label: string; self: React.ReactNode; comparison: React.ReactNode; comparisonUnavailable?: boolean }

const SALES_METRIC_MONEY_COMPACT_AT = 10_000_000 as const
const SALES_METRIC_QTY_COMPACT_AT = 100_000 as const

const primaryValue: (value: CompactKoreanNumberDisplay) => React.JSX.Element = (value: CompactKoreanNumberDisplay) : React.JSX.Element => (
  <span
    className={styles.salesMetricPrimaryValue}
    title={value.compacted ? value.fullText : undefined}
    aria-label={value.compacted ? value.fullText : undefined}
  >
    {value.text}
  </span>
)
const primaryTextValue: (value: string) => React.JSX.Element = (value: string) : React.JSX.Element => <span className={styles.salesMetricPrimaryValue}>{value}</span>
const compactMoney: (value: number | null) => CompactKoreanNumberDisplay = (value: number | null) : CompactKoreanNumberDisplay => formatCompactKoreanNumber(value, { compactAt: SALES_METRIC_MONEY_COMPACT_AT })
const compactQty: (value: number | null) => CompactKoreanNumberDisplay = (value: number | null) : CompactKoreanNumberDisplay => formatCompactKoreanNumber(value, { compactAt: SALES_METRIC_QTY_COMPACT_AT })
const formatRank: (rank: number | null, total: number) => string = (rank: number | null, total: number) : string => (rank === null ? '-' : `${rank}/${total}${KO.rankSuffix}`)
const rankMetric: (value: CompactKoreanNumberDisplay, rank: number, total: number) => React.JSX.Element = (value: CompactKoreanNumberDisplay, rank: number, total: number) : React.JSX.Element => <>{primaryValue(value)} ({formatRank(rank, total)})</>
const costMetric: (avgCost: number | null, costRatioPct: number | null) => React.JSX.Element | '-' = (avgCost: number | null, costRatioPct: number | null) : React.JSX.Element | '-' => (
  avgCost === null || costRatioPct === null ? '-' : <>{primaryValue(compactMoney(avgCost))} ({formatPercent(costRatioPct)})</>
)
const rateRank: (ratePct: number | null, rank: number | null, total: number) => React.JSX.Element | '-' = (ratePct: number | null, rank: number | null, total: number) : React.JSX.Element | '-' => (
  ratePct === null || rank === null ? '-' : <>{primaryTextValue(formatPercent(ratePct))} ({formatRank(rank, total)})</>
)

function ComparisonTargetSelect({ comparisonFilter }: { comparisonFilter: NonNullable<Props['comparisonFilter']> }) : React.JSX.Element {
  return (
    <span className={styles.salesMetricsChannelHeaderControl}>
      <select
        aria-label={comparisonFilter.selfComparisonEnabled ? '\uC790\uC0AC \uBE44\uAD50 \uB300\uC0C1' : KO.labelCompetitorChannel}
        value={comparisonFilter.targetId}
        onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void => comparisonFilter.onTargetChange(event.target.value)}
      >
        {comparisonFilter.targetId === '' && <option value="" disabled>{'\uBE44\uAD50 \uB300\uC0C1 \uC120\uD0DD'}</option>}
        {comparisonFilter.targets.map((target: ProductComparisonTarget) : React.JSX.Element => <option key={target.id} value={target.id}>{target.label}</option>)}
      </select>
      <ApiUnitErrorBadge error={comparisonFilter.error} />
    </span>
  )
}

export function SalesMetricsCard({ targetPeriodDays, sales, loading = false, error = null, unavailableMessage, comparisonFilter }: Props) : React.JSX.Element {
  const header: React.JSX.Element = (
    <div className={styles.salesMetricsHeader}>
      <div className={styles.salesMetricsTitleLine}>
        <h3 className={styles.sectionTitle}>{KO.sectionSales}<ApiUnitErrorBadge error={error} /></h3>
        {comparisonFilter && (
          <button
            type="button"
            role="switch"
            aria-checked={comparisonFilter.selfComparisonEnabled}
            className={`${styles.selfComparisonSwitch} ${comparisonFilter.selfComparisonEnabled ? styles.selfComparisonSwitchOn : ''}`}
            onClick={() : void => comparisonFilter.onSelfComparisonToggle(!comparisonFilter.selfComparisonEnabled)}
          >
            <span className={styles.selfComparisonSwitchTrack} aria-hidden="true">
              <span className={styles.selfComparisonSwitchThumb} />
            </span>
            <span>{'\uC790\uC0AC\uAC04 \uBE44\uAD50'}</span>
          </button>
        )}
      </div>
      <p className={styles.salesMetricsPeriodLine}>{KO.salesMetricsTargetPeriod}: {targetPeriodDays.start} ~ {targetPeriodDays.end}</p>
    </div>
  )

  if (sales == null) {
    return (
      <div className={`${styles.card} ${styles.gridColumnCard} ${styles.salesMetricsStableCard}`} aria-busy={loading}>
        {header}
        {comparisonFilter && comparisonFilter.targets.length > 0 && <ComparisonTargetSelect comparisonFilter={comparisonFilter} />}
        <p className={styles.salesMetricsUnavailableNotice}>{unavailableMessage ?? '-'}</p>
        {loading && (
          <div className={styles.salesMetricsLoadingOverlay}>
            <LoadingSpinner label="판매 정보를 불러오는 중" />
          </div>
        )}
      </div>
    )
  }

  const { baseLabel, comparisonLabel, base, comparison }: { baseLabel: string; comparisonLabel: string; base: SalesKpiColumn; comparison: SalesKpiColumn; } = sales
  const rows: MetricRow[] = [
    { key: 'avgPrice', label: KO.rowAvgPrice, self: primaryValue(compactMoney(base.avgPrice)), comparison: primaryValue(compactMoney(comparison.avgPrice)) },
    { key: 'qtyRank', label: KO.rowQtyRank, self: rankMetric(compactQty(base.qty), base.qtyRank, base.rankTotal), comparison: rankMetric(compactQty(comparison.qty), comparison.qtyRank, comparison.rankTotal) },
    { key: 'amountRank', label: KO.rowAmountRank, self: rankMetric(compactMoney(base.amount), base.amountRank, base.rankTotal), comparison: rankMetric(compactMoney(comparison.amount), comparison.amountRank, comparison.rankTotal) },
    { key: 'avgCost', label: KO.rowAvgCost, self: costMetric(base.avgCost, base.costRatioPct), comparison: costMetric(comparison.avgCost, comparison.costRatioPct), comparisonUnavailable: comparison.avgCost === null },
    { key: 'fee', label: KO.rowFee, self: rateRank(base.feeRatePct, base.feeRank, base.rankTotal), comparison: rateRank(comparison.feeRatePct, comparison.feeRank, comparison.rankTotal), comparisonUnavailable: comparison.feeRatePct === null || comparison.feeRank === null },
    { key: 'opMargin', label: KO.rowOpMargin, self: rateRank(base.opMarginRatePct, base.opMarginRank, base.rankTotal), comparison: rateRank(comparison.opMarginRatePct, comparison.opMarginRank, comparison.rankTotal), comparisonUnavailable: comparison.opMarginRatePct === null || comparison.opMarginRank === null },
  ]
  return (
    <div className={`${styles.card} ${styles.gridColumnCard} ${styles.salesMetricsStableCard}`} aria-busy={loading}>
      {header}
      <div className={styles.cardTableScroll}>
        <table className={`${styles.table} ${styles.salesMetricsTightTable}`}>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={`${styles.num} ${styles.salesMetricsSelfHeader}`}>{baseLabel}</th>
              <th className={`${styles.num} ${styles.salesMetricsCompetitorHeader}`}>
                {comparisonFilter ? (
                  <ComparisonTargetSelect comparisonFilter={comparisonFilter} />
                ) : comparisonLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: MetricRow) : React.JSX.Element => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className={styles.num}>{row.self}</td>
                <td className={`${styles.num} ${row.comparisonUnavailable ? styles.salesMetricUnavailable : ''}`}>{row.comparison}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className={styles.salesMetricsLoadingOverlay}>
          <LoadingSpinner label="판매 정보를 불러오는 중" />
        </div>
      )}
    </div>
  )
}
