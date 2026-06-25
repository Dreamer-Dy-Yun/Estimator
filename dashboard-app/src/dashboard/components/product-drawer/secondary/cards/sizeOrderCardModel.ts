import { formatGroupedNumber, formatRatioDecimalKo } from '../../../../../utils/format'

import type { SecondaryExistingOrderInboundSupplyBySize } from '../../../../../api/types/secondary'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'

export type SizeOrderColumnTotals = {
  weightedPct: number
  forecast: number
  rec: number
  confirm: number
}

export type ExistingOrderInboundBalanceBreakdownKey = 'beforeCurrent' | 'inPeriod' | 'afterNext'

export interface ExistingOrderInboundBalanceBreakdownRow {
  readonly key: ExistingOrderInboundBalanceBreakdownKey
  readonly totalQty: number
  readonly qtyBySize: Readonly<Record<string, number>>
}

function parseFiniteNumberInput(rawValue: string): number | null {
  const trimmed: string = rawValue.trim()
  if (trimmed === '') return null

  const next: number = Number(trimmed)
  return Number.isFinite(next) ? next : null
}

export function clampWeightPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100))
}

export function getComparisonWeightPct(selfWeightPct: number): number {
  return clampWeightPct(100 - selfWeightPct)
}

export function getSelfWeightPctFromComparisonInput(comparisonWeightPct: number): number {
  return clampWeightPct(100 - clampWeightPct(comparisonWeightPct))
}

export function parseSelfWeightPctInput(rawValue: string): number | null {
  const next: number | null = parseFiniteNumberInput(rawValue)
  return next == null ? null : clampWeightPct(next)
}

export function parseSelfWeightPctFromComparisonInput(rawValue: string): number | null {
  const next: number | null = parseFiniteNumberInput(rawValue)
  return next == null ? null : getSelfWeightPctFromComparisonInput(next)
}

export function calculateSizeOrderColumnTotals(sizeRows: readonly SecondarySizeOrderDisplayRow[]): SizeOrderColumnTotals {
  return sizeRows.reduce<SizeOrderColumnTotals>(
    (totals: SizeOrderColumnTotals, row: SecondarySizeOrderDisplayRow) : { weightedPct: number; forecast: number; rec: number; confirm: number; } => ({
      weightedPct: totals.weightedPct + row.blendedSharePct,
      forecast: totals.forecast + row.forecastQty,
      rec: totals.rec + row.recommendedQty,
      confirm: totals.confirm + row.confirmQty,
    }),
    { weightedPct: 0, forecast: 0, rec: 0, confirm: 0 },
  )
}

function sumExistingOrderInboundSupply(
  supply: SecondaryExistingOrderInboundSupplyBySize,
  size: string,
  inRange: (date: string) => boolean,
): number {
  return (supply[size] ?? []).reduce((sum: number, point: SecondaryExistingOrderInboundSupplyBySize[string][number]): number => {
    if (!inRange(point.date)) return sum
    return sum + Math.max(0, Math.round(point.qty))
  }, 0)
}

export function buildExistingOrderInboundBalanceBreakdown(
  sizeRows: readonly SecondarySizeOrderDisplayRow[],
  supply: SecondaryExistingOrderInboundSupplyBySize | null,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
): ExistingOrderInboundBalanceBreakdownRow[] {
  if (supply == null) return []

  const ranges: Array<{ key: ExistingOrderInboundBalanceBreakdownKey; inRange: (date: string) => boolean }> = [
    { key: 'beforeCurrent', inRange: (date: string): boolean => date < currentOrderInboundDueDate },
    { key: 'inPeriod', inRange: (date: string): boolean => date >= currentOrderInboundDueDate && date < nextOrderInboundDueDate },
    { key: 'afterNext', inRange: (date: string): boolean => date >= nextOrderInboundDueDate },
  ]

  return ranges.map(({ key, inRange }: { key: ExistingOrderInboundBalanceBreakdownKey; inRange: (date: string) => boolean }): ExistingOrderInboundBalanceBreakdownRow => {
    const qtyBySize: Record<string, number> = {}
    sizeRows.forEach((row: SecondarySizeOrderDisplayRow): void => {
      qtyBySize[row.size] = sumExistingOrderInboundSupply(supply, row.size, inRange)
    })
    return {
      key,
      totalQty: Object.values(qtyBySize).reduce((sum: number, qty: number): number => sum + qty, 0),
      qtyBySize,
    }
  })
}

export function parseConfirmQtyInput(rawValue: string): number | null {
  const next: number | null = parseFiniteNumberInput(rawValue)
  return next == null ? null : Math.max(0, next)
}

export function formatOptionalGroupedNumber(value: number | null | undefined): string {
  return value == null ? '-' : formatGroupedNumber(value)
}

export function formatSharePct(value: number): string {
  return formatRatioDecimalKo(value)
}
