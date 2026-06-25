import type { SecondaryExistingOrderInboundSupplyBySize, SecondaryInboundSplitSource, SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { ExistingOrderInboundBalanceBreakdownKey, ExistingOrderInboundBalanceBreakdownRow, SizeOrderColumnTotals } from './sizeOrderCardModel'
import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react'
import { USE_MOCK_API } from '../../../../../api'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import type { SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId, SecondaryHelpIds } from '../secondaryDrawerTypes'
import type { SecondaryConfirmedRound } from '../model/secondaryConfirmedRoundModel'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { SizeOrderConfirmQuantityRows } from './SizeOrderConfirmQuantityRows'
import { InboundSplitScheduleDialog, type InboundSplitScheduleVariant } from './InboundSplitScheduleDialog'
import { SizeOrderQuantityRows, type QuantityRow } from './SizeOrderQuantityRows'
import { SizeOrderShareChartRow } from './SizeOrderShareChartRow'
import { SizeOrderWeightControls } from './SizeOrderWeightControls'
import {
  calculateSizeOrderColumnTotals,
  buildExistingOrderInboundBalanceBreakdown,
  formatSharePct,
  getComparisonWeightPct,
  getSelfWeightPctFromComparisonInput,
  parseSelfWeightPctFromComparisonInput,
  parseSelfWeightPctInput,
} from './sizeOrderCardModel'
import { useInboundSplitScheduleController, type UseInboundSplitScheduleControllerResult } from './useInboundSplitScheduleController'

export type Props = {
  sizeOrder: {
    comparisonLabel: string
    selfCompanyLabel: string
    selfWeightPct: number
    sizeRows: SecondarySizeOrderDisplayRow[]
    helpIds: Pick<SecondaryHelpIds, 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder' | 'inboundSplitSchedule'>
    stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null
    existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize | null
    calculationReady?: boolean
    manualConfirmBySize: Readonly<Record<string, true>>
    currentOrderInboundDueDate: string
    nextOrderInboundDueDate: string
    calculationBaseDate: string
    inboundSplitSource: SecondaryInboundSplitSource | null
    inboundSplitSourceLoading: boolean
    inboundSplitSourceError: ApiUnitErrorInfo | null
    confirmedRounds: SecondaryConfirmedRound[]
  }
  actions: {
    onSelfWeightPctChange: (next: number) => void
    onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
    onConfirmedRoundsChange: (next: SecondaryConfirmedRound[]) => void
  }
  help: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
}

type SizeOrderHoverCell = {
  readonly rowKey: string
  readonly columnKey: string
} | null

type SizeOrderTableStyle = CSSProperties & {
  '--size-order-size-column-count': number
  '--size-order-size-column-divisor': number
}

interface InboundSplitScheduleVariantOption {
  value: InboundSplitScheduleVariant
  label: string
}

const INBOUND_SPLIT_SCHEDULE_VARIANT_OPTIONS: InboundSplitScheduleVariantOption[] = [
  { value: 'v0', label: 'V0' },
  { value: 'v1', label: 'V1' },
  { value: 'v2', label: 'V2' },
]

const EXISTING_ORDER_INBOUND_BREAKDOWN_LABELS: Record<ExistingOrderInboundBalanceBreakdownKey, string> = {
  beforeCurrent: KO.rowTotalOrderBalanceBeforeCurrent,
  inPeriod: KO.rowTotalOrderBalanceInPeriod,
  afterNext: KO.rowTotalOrderBalanceAfterNext,
}

function sumInboundSplitExpectationBeforeDate(
  source: SecondaryInboundSplitSource | null,
  size: string,
  startDateInclusive: string,
  endDateExclusive: string | null,
): number {
  if (source == null || endDateExclusive == null) return 0
  return (source.expectation[size] ?? []).reduce((sum: number, point: SecondaryInboundSplitSource['expectation'][string][number]): number => {
    if (point.date < startDateInclusive || point.date >= endDateExclusive) return sum
    return sum + Math.max(0, Math.round(point.inbound))
  }, 0)
}

export function SizeOrderCard({ sizeOrder, actions, help }: Props) : React.JSX.Element {
  const { comparisonLabel, selfCompanyLabel, selfWeightPct, sizeRows, helpIds, stockOrderDisplay, existingOrderInboundSupplyBySize, calculationReady = true, manualConfirmBySize, currentOrderInboundDueDate, nextOrderInboundDueDate, calculationBaseDate, inboundSplitSource, inboundSplitSourceLoading, inboundSplitSourceError, confirmedRounds }: Props['sizeOrder'] = sizeOrder
  const tableRef: React.RefObject<HTMLTableElement | null> = useRef<HTMLTableElement | null>(null)
  const [hoveredCell, setHoveredCell]: [SizeOrderHoverCell, React.Dispatch<React.SetStateAction<SizeOrderHoverCell>>] = useState<SizeOrderHoverCell>(null)
  const [inboundSplitScheduleVariant, setInboundSplitScheduleVariant]: [InboundSplitScheduleVariant, React.Dispatch<React.SetStateAction<InboundSplitScheduleVariant>>] = useState<InboundSplitScheduleVariant>('v2')
  const [totalOrderBalanceExpanded, setTotalOrderBalanceExpanded]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(false)
  const tableStyle: SizeOrderTableStyle = {
    '--size-order-size-column-count': sizeRows.length,
    '--size-order-size-column-divisor': Math.max(sizeRows.length, 1),
  }
  const comparisonWeightPct: number = getComparisonWeightPct(selfWeightPct)
  const columnTotals: SizeOrderColumnTotals = useMemo(() : SizeOrderColumnTotals => calculateSizeOrderColumnTotals(sizeRows), [sizeRows])
  const inboundSplitDebugSourcePayload: unknown = useMemo((): unknown => (
    USE_MOCK_API ? inboundSplitSource : null
  ), [inboundSplitSource])
  const inboundSplitSchedule: UseInboundSplitScheduleControllerResult = useInboundSplitScheduleController({
    sizeRows,
    stockOrderDisplay,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    calculationBaseDate,
    inboundSplitSource,
    inboundSplitSourceLoading,
    inboundSplitSourceError,
    calculationReady,
    confirmedRounds,
    onConfirmQtyChange: actions.onConfirmQtyChange,
    onConfirmedRoundsChange: actions.onConfirmedRoundsChange,
  })
  const stockOrderSizeRowBySize: Map<string, SecondaryStockOrderDisplaySizeRow> = useMemo(
    () : Map<string, SecondaryStockOrderDisplaySizeRow> => new Map((stockOrderDisplay?.sizeRows ?? []).map((row: SecondaryStockOrderDisplaySizeRow) : [string, SecondaryStockOrderDisplaySizeRow] => [row.size, row])),
    [stockOrderDisplay],
  )
  const expectedInboundOrderBalanceLabel: string = inboundSplitSchedule.displayCount > 1
    ? KO.rowLastInboundExpectedInboundOrderBalance
    : KO.rowExpectedInboundOrderBalance
  const lastSplitInboundDate: string | null = inboundSplitSchedule.splitRoundRows.length > 1
    ? inboundSplitSchedule.splitRoundRows[inboundSplitSchedule.splitRoundRows.length - 1]?.inboundDate ?? null
    : null
  const expectedInboundOrderBalanceBySize: Map<string, number> = useMemo((): Map<string, number> => {
    return new Map(sizeRows.map((row: SecondarySizeOrderDisplayRow): [string, number] => {
      const displayQty: number = Math.max(0, Math.round(stockOrderSizeRowBySize.get(row.size)?.expectedInboundOrderBalance ?? 0))
      const splitSourceQty: number = sumInboundSplitExpectationBeforeDate(inboundSplitSource, row.size, currentOrderInboundDueDate, lastSplitInboundDate)
      return [row.size, displayQty + splitSourceQty]
    }))
  }, [currentOrderInboundDueDate, inboundSplitSource, lastSplitInboundDate, sizeRows, stockOrderSizeRowBySize])
  const expectedInboundOrderBalanceTotal: number | null = stockOrderDisplay == null
    ? null
    : sizeRows.reduce((sum: number, row: SecondarySizeOrderDisplayRow): number => sum + (expectedInboundOrderBalanceBySize.get(row.size) ?? 0), 0)
  const existingOrderInboundBreakdownRows: ExistingOrderInboundBalanceBreakdownRow[] = useMemo((): ExistingOrderInboundBalanceBreakdownRow[] => buildExistingOrderInboundBalanceBreakdown(
    sizeRows,
    existingOrderInboundSupplyBySize,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
  ), [currentOrderInboundDueDate, existingOrderInboundSupplyBySize, nextOrderInboundDueDate, sizeRows])
  const handleTotalOrderBalanceToggle: () => void = useCallback((): void => {
    setTotalOrderBalanceExpanded((current: boolean): boolean => !current)
  }, [])
  const quantityRows: QuantityRow[] = [
    { label: KO.rowCurrentStockQty, totalQty: stockOrderDisplay?.currentStockQtyTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.currentStockQty },
    { keyId: 'total-order-balance', label: KO.rowTotalOrderBalance, totalQty: stockOrderDisplay?.totalOrderBalanceTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.totalOrderBalance, strongValues: true, toggle: { expanded: totalOrderBalanceExpanded, ariaLabel: KO.ariaTotalOrderBalanceBreakdownToggle, onToggle: handleTotalOrderBalanceToggle }, helpMark: { helpId: 'totalOrderBalance', labelId: helpIds.totalOrderBalance, help } },
    ...(totalOrderBalanceExpanded ? existingOrderInboundBreakdownRows.map((breakdown: ExistingOrderInboundBalanceBreakdownRow): QuantityRow => ({
      keyId: `total-order-balance:${breakdown.key}`,
      label: EXISTING_ORDER_INBOUND_BREAKDOWN_LABELS[breakdown.key],
      totalQty: breakdown.totalQty,
      valueForSize: (row: SecondarySizeOrderDisplayRow): number => breakdown.qtyBySize[row.size] ?? 0,
      indent: true,
    })) : []),
    { label: expectedInboundOrderBalanceLabel, totalQty: expectedInboundOrderBalanceTotal, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => expectedInboundOrderBalanceBySize.get(row.size), helpMark: { helpId: 'expectedInboundOrderBalance', labelId: helpIds.expectedInboundOrderBalance, help } },
    { label: KO.rowSalesForecast, totalQty: calculationReady ? columnTotals.forecast : null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | null => (calculationReady ? row.forecastQty : null), helpMark: { helpId: 'salesForecastSizeOrder', labelId: helpIds.salesForecastSizeOrder, help } },
    { label: KO.thRecQty, totalQty: calculationReady ? columnTotals.rec : null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | null => (calculationReady ? row.recommendedQty : null), helpMark: { helpId: 'sizeRecQty', labelId: helpIds.sizeRecQty, help } },
  ]
  const handleSelfWeightInputChange: (rawValue: string) => void = useCallback((rawValue: string): void => {
    const next: number | null = parseSelfWeightPctInput(rawValue)
    if (next != null) actions.onSelfWeightPctChange(next)
  }, [actions])
  const handleComparisonWeightRangeChange: (rawValue: string) => void = useCallback((rawValue: string): void => {
    actions.onSelfWeightPctChange(getSelfWeightPctFromComparisonInput(Number(rawValue)))
  }, [actions])
  const handleComparisonWeightInputChange: (rawValue: string) => void = useCallback((rawValue: string): void => {
    const next: number | null = parseSelfWeightPctFromComparisonInput(rawValue)
    if (next != null) actions.onSelfWeightPctChange(next)
  }, [actions])
  const handleSizeOrderCellMouseEnter: (rowKey: string, columnKey: string) => void = useCallback((rowKey: string, columnKey: string): void => {
    setHoveredCell((current: SizeOrderHoverCell): SizeOrderHoverCell => (
      current?.rowKey === rowKey && current.columnKey === columnKey ? current : { rowKey, columnKey }
    ))
  }, [])
  const handleSizeOrderTableMouseLeave: () => void = useCallback((): void => {
    setHoveredCell(null)
  }, [])
  const getSizeOrderCellClassName: (rowKey: string, columnKey: string, baseClassName?: string) => string = useCallback((rowKey: string, columnKey: string, baseClassName: string = ''): string => {
    const classNames: string[] = baseClassName ? [baseClassName] : []
    const rowHovered: boolean = hoveredCell?.rowKey === rowKey
    const columnHovered: boolean = hoveredCell?.columnKey === columnKey
    if (rowHovered) classNames.push(styles.sizeOrderHoverRowCell)
    if (columnHovered) classNames.push(styles.sizeOrderHoverColumnCell)
    if (rowHovered && columnHovered) classNames.push(styles.sizeOrderHoverActiveCell)
    return classNames.join(' ')
  }, [hoveredCell])

  return (
    <>
      <div className={styles.card}>
        <div className={styles.stockTitleRow}>
          <h3 className={styles.sectionTitle}>
            {KO.sectionSizeOrder}
            <ApiUnitErrorBadge error={inboundSplitSchedule.visibleError} />
          </h3>
          <div className={styles.inboundSplitControls}>
            <span className={styles.inboundSplitCountLabel} aria-label={KO.ariaInboundSplitCount}>
              <span>{KO.labelInboundSplitCount}</span>
              <strong className={styles.inboundSplitCountValue}>{inboundSplitSchedule.displayCount} {KO.unitInboundSplitCount}</strong>
            </span>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.inboundSplitButton}`} onClick={inboundSplitSchedule.openDialog} disabled={!inboundSplitSchedule.scheduleReady} title={!calculationReady ? KO.msgStockOrderCalcRequired : inboundSplitSchedule.sourceErrorTitle}>
              {KO.btnInboundSplitSchedule}
            </button>
          </div>
        </div>
        <SizeOrderWeightControls
          selfCompanyLabel={selfCompanyLabel}
          comparisonLabel={comparisonLabel}
          selfWeightPct={selfWeightPct}
          comparisonWeightPct={comparisonWeightPct}
          onSelfWeightInputChange={handleSelfWeightInputChange}
          onComparisonWeightRangeChange={handleComparisonWeightRangeChange}
          onComparisonWeightInputChange={handleComparisonWeightInputChange}
          endSlot={USE_MOCK_API ? (
            <label className={styles.inboundSplitVariantLabel}>
              <span>{KO.labelInboundSplitScheduleVariant}</span>
              <select
                className={styles.inboundSplitVariantSelect}
                value={inboundSplitScheduleVariant}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => setInboundSplitScheduleVariant(event.target.value as InboundSplitScheduleVariant)}
                aria-label={KO.ariaInboundSplitScheduleVariant}
              >
                {INBOUND_SPLIT_SCHEDULE_VARIANT_OPTIONS.map((option: InboundSplitScheduleVariantOption): React.JSX.Element => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : null}
        />
        <div className={styles.sizeOrderTableWrap}>
          <table ref={tableRef} className={`${styles.table} ${styles.sizeOrderTable} ${styles.sizeOrderLargeTable}`} style={tableStyle} onMouseLeave={handleSizeOrderTableMouseLeave}>
            <colgroup>
              <col className={styles.sizeOrderMetricCol} />
              <col className={styles.sizeOrderTotalCol} />
              {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <col key={row.size} className={styles.sizeOrderSizeCol} />)}
            </colgroup>
            <thead>
              <tr>
                <th className={getSizeOrderCellClassName('header', 'metric')} onMouseEnter={(): void => handleSizeOrderCellMouseEnter('header', 'metric')}>{KO.thMetric}</th>
                <th className={getSizeOrderCellClassName('header', 'total', styles.num)} onMouseEnter={(): void => handleSizeOrderCellMouseEnter('header', 'total')}>{KO.thTotal}</th>
                {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <th key={row.size} className={getSizeOrderCellClassName('header', `size:${row.size}`, styles.num)} onMouseEnter={(): void => handleSizeOrderCellMouseEnter('header', `size:${row.size}`)}>{row.size}</th>)}
              </tr>
            </thead>
            <tbody>
              <SizeOrderShareChartRow tableRef={tableRef} comparisonLabel={comparisonLabel} selfCompanyLabel={selfCompanyLabel} sizeRows={sizeRows} getCellClassName={getSizeOrderCellClassName} onCellMouseEnter={handleSizeOrderCellMouseEnter} />
              <tr data-chart-align-row="">
                <td className={getSizeOrderCellClassName('share-pct', 'metric')} onMouseEnter={(): void => handleSizeOrderCellMouseEnter('share-pct', 'metric')}>{KO.rowMetricAdjustReflectedSizeSharePct}</td>
                <td className={getSizeOrderCellClassName('share-pct', 'total', styles.num)} onMouseEnter={(): void => handleSizeOrderCellMouseEnter('share-pct', 'total')}>{formatSharePct(columnTotals.weightedPct)}</td>
                {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <td key={row.size} className={getSizeOrderCellClassName('share-pct', `size:${row.size}`, styles.num)} data-chart-x="" onMouseEnter={(): void => handleSizeOrderCellMouseEnter('share-pct', `size:${row.size}`)}>{formatSharePct(row.blendedSharePct)}</td>)}
              </tr>
              <SizeOrderQuantityRows rows={quantityRows} sizeRows={sizeRows} getCellClassName={getSizeOrderCellClassName} onCellMouseEnter={handleSizeOrderCellMouseEnter} />
              <SizeOrderConfirmQuantityRows
                calculationReady={calculationReady}
                splitRoundsControlDirectConfirm={inboundSplitSchedule.splitRoundsControlDirectConfirm}
                columnConfirmTotal={columnTotals.confirm}
                splitRoundConfirmTotal={inboundSplitSchedule.splitRoundConfirmTotal}
                sizeRows={sizeRows}
                manualConfirmBySize={manualConfirmBySize}
                splitRoundConfirmBySize={inboundSplitSchedule.splitRoundConfirmBySize}
                splitRoundRows={inboundSplitSchedule.splitRoundRows}
                inboundSplitColumns={inboundSplitSchedule.columns}
                getCellClassName={getSizeOrderCellClassName}
                onCellMouseEnter={handleSizeOrderCellMouseEnter}
                onClearConfirmedRounds={inboundSplitSchedule.clearConfirmedRounds}
                onConfirmQtyChange={actions.onConfirmQtyChange}
              />
            </tbody>
          </table>
        </div>
      </div>
      <InboundSplitScheduleDialog
        key={inboundSplitSchedule.dialogKey}
        open={inboundSplitSchedule.dialogOpen}
        variant={USE_MOCK_API ? inboundSplitScheduleVariant : 'v2'}
        help={{ labelId: helpIds.inboundSplitSchedule, portal: help }}
        debugSourcePayload={inboundSplitDebugSourcePayload}
        {...inboundSplitSchedule.dialogProps}
      />
    </>
  )
}
