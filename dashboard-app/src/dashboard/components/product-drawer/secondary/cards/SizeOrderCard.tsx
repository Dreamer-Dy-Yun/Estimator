import type { SecondaryInboundSplitSource, SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { OrderSnapshotConfirmedRound } from '../../../../../snapshot/orderSnapshotTypes'
import type { SizeOrderColumnTotals } from './sizeOrderCardModel'
import { useCallback, useMemo, useRef, useState } from 'react'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import type { SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId, SecondaryHelpIds } from '../secondaryDrawerTypes'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { SizeOrderConfirmQuantityRows } from './SizeOrderConfirmQuantityRow'
import { InboundSplitScheduleDialog, type InboundSplitDraftRequest } from './InboundSplitScheduleDialog'
import { SizeOrderQuantityRows, type QuantityRow } from './SizeOrderQuantityRows'
import { SizeOrderShareChartRow } from './SizeOrderShareChartRow'
import { SizeOrderWeightControls } from './SizeOrderWeightControls'
import {
  MIN_INBOUND_SPLIT_COUNT,
  buildInboundSplitScheduleRows,
  clampInboundSplitCount,
  cloneInboundSplitRows,
  confirmedRoundsToInboundSplitRows,
  getInboundSplitSizeColumns,
  inboundSplitRowsToConfirmedRounds,
  recalculateInboundSplitScheduleRows,
  reconcileInboundSplitScheduleRows,
  sumInboundSplitConfirmedBySize,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'
import {
  calculateSizeOrderColumnTotals,
  formatSharePct,
  getComparisonWeightPct,
  getSelfWeightPctFromComparisonInput,
  parseSelfWeightPctFromComparisonInput,
  parseSelfWeightPctInput,
} from './sizeOrderCardModel'

type SplitRowsBuildResult = {
  rows: InboundSplitScheduleRow[]
  error: ApiUnitErrorInfo | null
}

function makeInboundSplitDraftErrorInfo(request: InboundSplitDraftRequest, err: unknown): ApiUnitErrorInfo {
  return {
    checkedAt: new Date().toISOString(),
    page: 'ProductSecondaryDrawer',
    request,
    error: err instanceof Error ? err.message : String(err),
  }
}

export type Props = {
  sizeOrder: {
    comparisonLabel: string
    selfCompanyLabel: string
    selfWeightPct: number
    sizeRows: SecondarySizeOrderDisplayRow[]
    helpIds: Pick<SecondaryHelpIds, 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder'>
    stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null
    calculationReady?: boolean
    manualConfirmBySize: Readonly<Record<string, true>>
    currentOrderInboundDueDate: string
    nextOrderInboundDueDate: string
    inboundSplitSource: SecondaryInboundSplitSource | null
    inboundSplitSourceLoading: boolean
    inboundSplitSourceError: ApiUnitErrorInfo | null
    confirmedRounds: OrderSnapshotConfirmedRound[]
  }
  actions: {
    onSelfWeightPctChange: (next: number) => void
    onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
    onConfirmedRoundsChange: (next: OrderSnapshotConfirmedRound[]) => void
  }
  help: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
}

export function SizeOrderCard({ sizeOrder, actions, help }: Props) : React.JSX.Element {
  const { comparisonLabel, selfCompanyLabel, selfWeightPct, sizeRows, helpIds, stockOrderDisplay, calculationReady = true, manualConfirmBySize, currentOrderInboundDueDate, nextOrderInboundDueDate, inboundSplitSource, inboundSplitSourceLoading, inboundSplitSourceError, confirmedRounds }: { comparisonLabel: string; selfCompanyLabel: string; selfWeightPct: number; sizeRows: SecondarySizeOrderDisplayRow[]; helpIds: Pick<SecondaryHelpIds, 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder'>; stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null; calculationReady?: boolean; manualConfirmBySize: Readonly<Record<string, true>>; currentOrderInboundDueDate: string; nextOrderInboundDueDate: string; inboundSplitSource: SecondaryInboundSplitSource | null; inboundSplitSourceLoading: boolean; inboundSplitSourceError: ApiUnitErrorInfo | null; confirmedRounds: OrderSnapshotConfirmedRound[]; } = sizeOrder
  const tableRef: React.RefObject<HTMLTableElement | null> = useRef<HTMLTableElement | null>(null)
  const comparisonWeightPct: number = getComparisonWeightPct(selfWeightPct)
  const columnTotals: SizeOrderColumnTotals = useMemo(() : SizeOrderColumnTotals => calculateSizeOrderColumnTotals(sizeRows), [sizeRows])
  const splitSizeColumns: InboundSplitSizeColumn[] = useMemo(() : InboundSplitSizeColumn[] => getInboundSplitSizeColumns(sizeRows), [sizeRows])
  const inboundSplitSourceReady: boolean = inboundSplitSource != null && !inboundSplitSourceLoading && inboundSplitSourceError == null
  const [splitCount, setSplitCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(MIN_INBOUND_SPLIT_COUNT)
  const [splitDialogOpen, setSplitDialogOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(false)
  const [splitDialogSessionId, setSplitDialogSessionId]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(0)
  const [inboundSplitDraftError, setInboundSplitDraftError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const appliedSplitRows: InboundSplitScheduleRow[] = useMemo(
    (): InboundSplitScheduleRow[] => confirmedRounds.length > 1 ? confirmedRoundsToInboundSplitRows(confirmedRounds, splitSizeColumns) : [],
    [confirmedRounds, splitSizeColumns],
  )
  const splitConfirmLocked: boolean = appliedSplitRows.length > 1
  const displaySplitCount: number = splitConfirmLocked ? appliedSplitRows.length : splitCount
  const openSplitDialog: () => void = useCallback(() : void => {
    if (inboundSplitSource == null) {
      return
    }
    setInboundSplitDraftError(null)
    setSplitDialogSessionId((currentId: number): number => currentId + 1)
    setSplitDialogOpen(true)
  }, [inboundSplitSource])
  const buildSplitRowsForCount: (next: number) => InboundSplitScheduleRow[] = useCallback((next: number): InboundSplitScheduleRow[] => {
    if (inboundSplitSource == null) return []
    return buildInboundSplitScheduleRows(splitSizeColumns, clampInboundSplitCount(next), currentOrderInboundDueDate, nextOrderInboundDueDate, inboundSplitSource)
  }, [currentOrderInboundDueDate, inboundSplitSource, nextOrderInboundDueDate, splitSizeColumns])
  const recalculateSplitRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[] = useCallback((rows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
    if (inboundSplitSource == null) return rows
    return recalculateInboundSplitScheduleRows(rows, splitSizeColumns, nextOrderInboundDueDate, inboundSplitSource)
  }, [inboundSplitSource, nextOrderInboundDueDate, splitSizeColumns])
  const handleInboundSplitDraftError: (err: unknown | null, request: InboundSplitDraftRequest) => void = useCallback((err: unknown | null, request: InboundSplitDraftRequest): void => {
    setInboundSplitDraftError(err == null ? null : makeInboundSplitDraftErrorInfo(request, err))
  }, [])
  const splitDialogInitialCount: number = splitConfirmLocked ? appliedSplitRows.length : splitCount
  const splitDialogBuildResult: SplitRowsBuildResult = useMemo(() : SplitRowsBuildResult => {
    if (!splitDialogOpen || inboundSplitSource == null) return { rows: [], error: null }
    try {
      if (splitConfirmLocked) {
        return {
          rows: reconcileInboundSplitScheduleRows(appliedSplitRows, splitSizeColumns, splitDialogInitialCount, currentOrderInboundDueDate, nextOrderInboundDueDate, inboundSplitSource),
          error: null,
        }
      }
      return {
        rows: buildSplitRowsForCount(splitDialogInitialCount),
        error: null,
      }
    } catch (err: unknown) {
      return {
        rows: [],
        error: makeInboundSplitDraftErrorInfo('buildInboundSplitScheduleRows', err),
      }
    }
  }, [appliedSplitRows, buildSplitRowsForCount, currentOrderInboundDueDate, inboundSplitSource, nextOrderInboundDueDate, splitConfirmLocked, splitDialogInitialCount, splitDialogOpen, splitSizeColumns])
  const splitDialogRows: InboundSplitScheduleRow[] = splitDialogBuildResult.rows
  const splitDialogError: ApiUnitErrorInfo | null = inboundSplitDraftError ?? splitDialogBuildResult.error
  const inboundSplitVisibleError: ApiUnitErrorInfo | null = inboundSplitSourceError ?? splitDialogError
  const closeSplitDialog: () => void = useCallback(() : void => {
    setInboundSplitDraftError(null)
    setSplitDialogOpen(false)
  }, [])
  const clearConfirmedRounds: () => void = useCallback((): void => {
    actions.onConfirmedRoundsChange([])
  }, [actions])
  const applySplitDialog: (rows: InboundSplitScheduleRow[]) => void = useCallback((rows: InboundSplitScheduleRow[]): void => {
    if (rows.length === 0) {
      return
    }
    const nextRows: InboundSplitScheduleRow[] = cloneInboundSplitRows(rows)
    setSplitCount(clampInboundSplitCount(nextRows.length))
    const nextConfirmBySize: Record<string, number> = sumInboundSplitConfirmedBySize(nextRows, splitSizeColumns)
    if (nextRows.length <= 1) {
      clearConfirmedRounds()
      sizeRows.forEach((row: SecondarySizeOrderDisplayRow): void => {
        actions.onConfirmQtyChange(row.size, nextConfirmBySize[row.size] ?? row.confirmQty, row.recommendedQty)
      })
      setSplitDialogOpen(false)
      return
    }
    actions.onConfirmedRoundsChange(inboundSplitRowsToConfirmedRounds(nextRows, splitSizeColumns))
    sizeRows.forEach((row: SecondarySizeOrderDisplayRow): void => {
      actions.onConfirmQtyChange(row.size, nextConfirmBySize[row.size] ?? 0, row.recommendedQty)
    })
    setSplitDialogOpen(false)
  }, [actions, clearConfirmedRounds, sizeRows, splitSizeColumns])
  const stockOrderSizeRowBySize: Map<string, SecondaryStockOrderDisplaySizeRow> = useMemo(
    () : Map<string, SecondaryStockOrderDisplaySizeRow> => new Map((stockOrderDisplay?.sizeRows ?? []).map((row: SecondaryStockOrderDisplaySizeRow) : [string, SecondaryStockOrderDisplaySizeRow] => [row.size, row])),
    [stockOrderDisplay],
  )
  const appliedSplitConfirmBySize: Record<string, number> = useMemo(
    (): Record<string, number> => sumInboundSplitConfirmedBySize(appliedSplitRows, splitSizeColumns),
    [appliedSplitRows, splitSizeColumns],
  )
  const appliedSplitConfirmTotal: number = useMemo(
    (): number => splitSizeColumns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (appliedSplitConfirmBySize[column.size] ?? 0), 0),
    [appliedSplitConfirmBySize, splitSizeColumns],
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
            <strong className={styles.inboundSplitCountValue}>{displaySplitCount} {KO.unitInboundSplitCount}</strong>
          </span>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.inboundSplitButton}`} onClick={openSplitDialog} disabled={!inboundSplitSourceReady} title={inboundSplitSourceError?.error}>
            {KO.btnInboundSplitSchedule}
          </button>
        </div>
      </div>
      {inboundSplitVisibleError && (
        <p className={styles.inboundSplitSourceError} role="alert">
          {inboundSplitVisibleError.error}
          <ApiUnitErrorBadge error={inboundSplitVisibleError} />
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
              splitConfirmLocked={splitConfirmLocked}
              columnConfirmTotal={columnTotals.confirm}
              appliedSplitConfirmTotal={appliedSplitConfirmTotal}
              sizeRows={sizeRows}
              manualConfirmBySize={manualConfirmBySize}
              appliedSplitConfirmBySize={appliedSplitConfirmBySize}
              appliedSplitRows={appliedSplitRows}
              splitSizeColumns={splitSizeColumns}
              onClearConfirmedRounds={clearConfirmedRounds}
              onConfirmQtyChange={actions.onConfirmQtyChange}
            />
          </tbody>
        </table>
      </div>
    </div>
    <InboundSplitScheduleDialog
      key={splitDialogSessionId}
      open={splitDialogOpen && inboundSplitSourceReady}
      initialCount={splitDialogInitialCount}
      initialRows={splitDialogRows}
      columns={splitSizeColumns}
      buildRowsForCount={buildSplitRowsForCount}
      recalculateRows={recalculateSplitRows}
      draftError={splitDialogError}
      onDraftError={handleInboundSplitDraftError}
      onApply={applySplitDialog}
      onClose={closeSplitDialog}
    />
    </>
  )
}
