import type { SecondaryExistingOrderInboundPoint, SecondaryExistingOrderInboundSupplyBySize, SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'

export type InboundSplitExistingInboundSectionKey = 'beforeCurrent' | 'inPeriod' | 'afterNext'

export type InboundSplitSourceSummaryRowKind =
  | 'opening-stock'
  | 'balance-total'
  | 'balance-section'
  | 'balance-detail'

export interface InboundSplitSourceSummaryRowV1 {
  key: string
  kind: InboundSplitSourceSummaryRowKind
  qtyBySize: Record<string, number | null>
  sectionKey?: InboundSplitExistingInboundSectionKey
  date?: string
}

export type InboundSplitSourceSummaryExpandedSections = Record<InboundSplitExistingInboundSectionKey, boolean>

export const EMPTY_INBOUND_SPLIT_SOURCE_SUMMARY_EXPANDED_SECTIONS: InboundSplitSourceSummaryExpandedSections = {
  beforeCurrent: false,
  inPeriod: false,
  afterNext: false,
}

function normalizeQty(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}

function makeQtyBySize(columns: readonly InboundSplitSizeColumn[], fill: number | null = 0): Record<string, number | null> {
  const qtyBySize: Record<string, number | null> = {}
  columns.forEach((column: InboundSplitSizeColumn): void => {
    qtyBySize[column.size] = fill
  })
  return qtyBySize
}

function addQty(qtyBySize: Record<string, number | null>, size: string, qty: number): void {
  qtyBySize[size] = (qtyBySize[size] ?? 0) + qty
}

function getExistingInboundSectionKey(
  date: string,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
): InboundSplitExistingInboundSectionKey {
  if (date < currentOrderInboundDueDate) return 'beforeCurrent'
  if (date < nextOrderInboundDueDate) return 'inPeriod'
  return 'afterNext'
}

function addSupplyPoint(
  sectionRowsByKey: Record<InboundSplitExistingInboundSectionKey, Record<string, number | null>>,
  detailRowsBySectionAndDate: Record<InboundSplitExistingInboundSectionKey, Map<string, Record<string, number | null>>>,
  totalQtyBySize: Record<string, number | null>,
  size: string,
  point: SecondaryExistingOrderInboundPoint,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
): void {
  const qty: number | null = normalizeQty(point.qty)
  if (qty == null || qty <= 0) return

  const sectionKey: InboundSplitExistingInboundSectionKey = getExistingInboundSectionKey(point.date, currentOrderInboundDueDate, nextOrderInboundDueDate)
  addQty(totalQtyBySize, size, qty)
  addQty(sectionRowsByKey[sectionKey], size, qty)

  const dateRow: Record<string, number | null> = detailRowsBySectionAndDate[sectionKey].get(point.date) ?? {}
  addQty(dateRow, size, qty)
  detailRowsBySectionAndDate[sectionKey].set(point.date, dateRow)
}

function buildOpeningStockRow(
  source: SecondaryInboundSplitSource,
  columns: readonly InboundSplitSizeColumn[],
  calculationBaseDate: string,
): InboundSplitSourceSummaryRowV1 {
  const openingQtyBySize: Record<string, number | null> = {}
  columns.forEach((column: InboundSplitSizeColumn): void => {
    openingQtyBySize[column.size] = normalizeQty(source.sizeInfo[column.size]?.baseStock)
  })
  return {
    key: 'opening-stock',
    kind: 'opening-stock',
    date: calculationBaseDate,
    qtyBySize: openingQtyBySize,
  }
}

export function buildInboundSplitSourceSummaryRowsV1(
  source: SecondaryInboundSplitSource,
  columns: readonly InboundSplitSizeColumn[],
  existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize | null | undefined,
  calculationBaseDate: string,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  expandedSections: InboundSplitSourceSummaryExpandedSections,
): InboundSplitSourceSummaryRowV1[] {
  const sectionRowsByKey: Record<InboundSplitExistingInboundSectionKey, Record<string, number | null>> = {
    beforeCurrent: makeQtyBySize(columns),
    inPeriod: makeQtyBySize(columns),
    afterNext: makeQtyBySize(columns),
  }
  const detailRowsBySectionAndDate: Record<InboundSplitExistingInboundSectionKey, Map<string, Record<string, number | null>>> = {
    beforeCurrent: new Map<string, Record<string, number | null>>(),
    inPeriod: new Map<string, Record<string, number | null>>(),
    afterNext: new Map<string, Record<string, number | null>>(),
  }
  const totalQtyBySize: Record<string, number | null> = makeQtyBySize(columns)

  columns.forEach((column: InboundSplitSizeColumn): void => {
    const points: SecondaryExistingOrderInboundPoint[] = existingOrderInboundSupplyBySize?.[column.size] ?? []
    points.forEach((point: SecondaryExistingOrderInboundPoint): void => {
      addSupplyPoint(sectionRowsByKey, detailRowsBySectionAndDate, totalQtyBySize, column.size, point, currentOrderInboundDueDate, nextOrderInboundDueDate)
    })
  })

  const rows: InboundSplitSourceSummaryRowV1[] = [
    buildOpeningStockRow(source, columns, calculationBaseDate),
    { key: 'balance-total', kind: 'balance-total', qtyBySize: totalQtyBySize },
  ]

  const sectionKeys: readonly InboundSplitExistingInboundSectionKey[] = ['beforeCurrent', 'inPeriod', 'afterNext']
  sectionKeys.forEach((sectionKey: InboundSplitExistingInboundSectionKey): void => {
    rows.push({
      key: `balance-section:${sectionKey}`,
      kind: 'balance-section',
      sectionKey,
      qtyBySize: sectionRowsByKey[sectionKey],
    })
    if (!expandedSections[sectionKey]) return
    Array.from(detailRowsBySectionAndDate[sectionKey].entries())
      .sort(([leftDate]: [string, Record<string, number | null>], [rightDate]: [string, Record<string, number | null>]): number => leftDate.localeCompare(rightDate))
      .forEach(([date, qtyBySize]: [string, Record<string, number | null>]): void => {
        rows.push({
          key: `balance-detail:${sectionKey}:${date}`,
          kind: 'balance-detail',
          sectionKey,
          date,
          qtyBySize,
        })
      })
  })

  return rows
}

export function getInboundSplitSourceSummaryRowTotal(row: InboundSplitSourceSummaryRowV1, columns: readonly InboundSplitSizeColumn[]): number {
  return columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (row.qtyBySize[column.size] ?? 0), 0)
}
