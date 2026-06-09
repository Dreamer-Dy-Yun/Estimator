import { formatGroupedNumber, formatRatioDecimalKo } from '../../../../../utils/format'

import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'

export type SizeOrderColumnTotals = {
  weightedPct: number
  forecast: number
  rec: number
  confirm: number
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
