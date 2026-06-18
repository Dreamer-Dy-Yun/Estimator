import type { SecondaryInboundSplitSource, SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { SizeOrderColumnTotals } from './sizeOrderCardModel'
import { useCallback, useMemo, useRef } from 'react'
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
import { InboundSplitScheduleDialog } from './InboundSplitScheduleDialog'
import { SizeOrderQuantityRows, type QuantityRow } from './SizeOrderQuantityRows'
import { SizeOrderShareChartRow } from './SizeOrderShareChartRow'
import { SizeOrderWeightControls } from './SizeOrderWeightControls'
import {
  calculateSizeOrderColumnTotals,
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
    calculationReady?: boolean
    manualConfirmBySize: Readonly<Record<string, true>>
    currentOrderInboundDueDate: string
    nextOrderInboundDueDate: string
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

export function SizeOrderCard({ sizeOrder, actions, help }: Props) : React.JSX.Element {
  const { comparisonLabel, selfCompanyLabel, selfWeightPct, sizeRows, helpIds, stockOrderDisplay, calculationReady = true, manualConfirmBySize, currentOrderInboundDueDate, nextOrderInboundDueDate, inboundSplitSource, inboundSplitSourceLoading, inboundSplitSourceError, confirmedRounds }: Props['sizeOrder'] = sizeOrder
  const tableRef: React.RefObject<HTMLTableElement | null> = useRef<HTMLTableElement | null>(null)
  const comparisonWeightPct: number = getComparisonWeightPct(selfWeightPct)
  const columnTotals: SizeOrderColumnTotals = useMemo(() : SizeOrderColumnTotals => calculateSizeOrderColumnTotals(sizeRows), [sizeRows])
  const inboundSplitSchedule: UseInboundSplitScheduleControllerResult = useInboundSplitScheduleController({
    sizeRows,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
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
  const quantityRows: QuantityRow[] = [
    { label: KO.rowCurrentStockQty, totalQty: stockOrderDisplay?.currentStockQtyTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.currentStockQty },
    { label: KO.rowTotalOrderBalance, totalQty: stockOrderDisplay?.totalOrderBalanceTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.totalOrderBalance, helpMark: { helpId: 'totalOrderBalance', labelId: helpIds.totalOrderBalance, help } },
    { label: KO.rowExpectedInboundOrderBalance, totalQty: stockOrderDisplay?.expectedInboundOrderBalanceTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.expectedInboundOrderBalance, helpMark: { helpId: 'expectedInboundOrderBalance', labelId: helpIds.expectedInboundOrderBalance, help } },
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

  return (
    <>
    <div className={styles.card}>
      <div className={styles.stockTitleRow}>
        <h3 className={styles.sectionTitle}>{KO.sectionSizeOrder}</h3>
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
      {inboundSplitSchedule.visibleError && (
        <p className={styles.inboundSplitError} role="alert">
          {inboundSplitSchedule.visibleError.error}
          <ApiUnitErrorBadge error={inboundSplitSchedule.visibleError} />
        </p>
      )}
      {!calculationReady && (
        <p className={styles.metaFilterActionHint} role="status" aria-live="polite">
          {KO.msgStockOrderCalcRequired}
        </p>
      )}
      <SizeOrderWeightControls
        selfCompanyLabel={selfCompanyLabel}
        comparisonLabel={comparisonLabel}
        selfWeightPct={selfWeightPct}
        comparisonWeightPct={comparisonWeightPct}
        onSelfWeightInputChange={handleSelfWeightInputChange}
        onComparisonWeightRangeChange={handleComparisonWeightRangeChange}
        onComparisonWeightInputChange={handleComparisonWeightInputChange}
      />
      <div className={styles.sizeOrderTableWrap}>
        <table ref={tableRef} className={`${styles.table} ${styles.sizeOrderTable} ${styles.sizeOrderLargeTable}`}>
          <colgroup>
            <col className={styles.sizeOrderMetricCol} />
            <col className={styles.sizeOrderTotalCol} />
            {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <col key={row.size} className={styles.sizeOrderSizeCol} />)}
          </colgroup>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={styles.num}>{KO.thTotal}</th>
              {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <th key={row.size} className={styles.num}>{row.size}</th>)}
            </tr>
          </thead>
          <tbody>
            <SizeOrderShareChartRow tableRef={tableRef} comparisonLabel={comparisonLabel} selfCompanyLabel={selfCompanyLabel} sizeRows={sizeRows} />
            <tr data-chart-align-row="">
              <td>{KO.rowMetricAdjustReflectedSizeSharePct}</td>
              <td className={styles.num}>{formatSharePct(columnTotals.weightedPct)}</td>
              {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <td key={row.size} className={styles.num} data-chart-x="">{formatSharePct(row.blendedSharePct)}</td>)}
            </tr>
            <SizeOrderQuantityRows rows={quantityRows} sizeRows={sizeRows} />
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
      help={{ labelId: helpIds.inboundSplitSchedule, portal: help }}
      {...inboundSplitSchedule.dialogProps}
    />
    </>
  )
}
