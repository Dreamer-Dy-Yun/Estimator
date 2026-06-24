import type { SecondaryInboundSplitExpectationPoint, SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'

export const INBOUND_SPLIT_ZERO_SECTION_KEY = 'zero' as const

export type InboundSplitDetailRowKind = 'opening-stock' | 'period-inbound-total' | 'scheduled-inbound'

export interface InboundSplitDetailRow {
  key: string
  kind: InboundSplitDetailRowKind
  date: string | null
  startDate: string
  endDate: string
  qtyBySize: Record<string, number | null>
}

export interface InboundSplitDetailSection {
  key: string
  rows: InboundSplitDetailRow[]
}

interface BuildDetailSectionArgs {
  key: string
  source: SecondaryInboundSplitSource
  columns: readonly InboundSplitSizeColumn[]
  startDate: string
  endDate: string
  openingStockDate?: string
  includeOpeningStock: boolean
  excludeScheduledInbound: boolean
}

export function getInboundSplitRoundDetailKey(row: InboundSplitScheduleRow): string {
  return `round:${row.id}`
}

export function getInboundSplitDetailSectionKeys(rows: readonly InboundSplitScheduleRow[], nextOrderInboundDueDate: string): string[] {
  return [
    INBOUND_SPLIT_ZERO_SECTION_KEY,
    ...rows
      .filter((row: InboundSplitScheduleRow): boolean => row.inboundDate < nextOrderInboundDueDate)
      .map((row: InboundSplitScheduleRow): string => getInboundSplitRoundDetailKey(row)),
  ]
}

function normalizeQty(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}

function makeEmptyQtyBySize(columns: readonly InboundSplitSizeColumn[]): Record<string, number> {
  const qtyBySize: Record<string, number> = {}
  columns.forEach((column: InboundSplitSizeColumn): void => {
    qtyBySize[column.size] = 0
  })
  return qtyBySize
}

function addQty(target: Record<string, number>, size: string, qty: number): void {
  target[size] = (target[size] ?? 0) + qty
}

export function buildInboundSplitDetailSection({
  key,
  source,
  columns,
  startDate,
  endDate,
  openingStockDate,
  includeOpeningStock,
  excludeScheduledInbound,
}: BuildDetailSectionArgs): InboundSplitDetailSection {
  const rows: InboundSplitDetailRow[] = []
  const inboundQtyByDate: Map<string, Record<string, number>> = new Map<string, Record<string, number>>()
  const periodInboundQtyBySize: Record<string, number> = makeEmptyQtyBySize(columns)

  if (includeOpeningStock) {
    const openingQtyBySize: Record<string, number | null> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      openingQtyBySize[column.size] = normalizeQty(source.sizeInfo[column.size]?.baseStock)
    })
    rows.push({
      key: `${key}:opening-stock`,
      kind: 'opening-stock',
      date: openingStockDate ?? startDate,
      startDate,
      endDate,
      qtyBySize: openingQtyBySize,
    })
  }

  if (!excludeScheduledInbound && startDate < endDate) {
    columns.forEach((column: InboundSplitSizeColumn): void => {
      const expectationPoints: SecondaryInboundSplitExpectationPoint[] = source.expectation[column.size] ?? []
      expectationPoints.forEach((point: SecondaryInboundSplitExpectationPoint): void => {
        if (point.date < startDate || point.date >= endDate) return
        const inboundQty: number | null = normalizeQty(point.inbound)
        if (inboundQty == null || inboundQty <= 0) return
        addQty(periodInboundQtyBySize, column.size, inboundQty)
        const dateRow: Record<string, number> = inboundQtyByDate.get(point.date) ?? {}
        addQty(dateRow, column.size, inboundQty)
        inboundQtyByDate.set(point.date, dateRow)
      })
    })
  }

  rows.push({
    key: `${key}:period-total`,
    kind: 'period-inbound-total',
    date: null,
    startDate,
    endDate,
    qtyBySize: periodInboundQtyBySize,
  })

  Array.from(inboundQtyByDate.entries())
    .sort(([leftDate]: [string, Record<string, number>], [rightDate]: [string, Record<string, number>]): number => leftDate.localeCompare(rightDate))
    .forEach(([date, qtyBySize]: [string, Record<string, number>]): void => {
      rows.push({
        key: `${key}:scheduled:${date}`,
        kind: 'scheduled-inbound',
        date,
        startDate,
        endDate,
        qtyBySize,
      })
    })

  return { key, rows }
}
