import { formatGroupedNumber, formatRatioDecimalKo } from '../../../../../utils/format'

import type { SizeOrderRow } from './sizeOrderCardTypes'

export type SizeOrderColumnTotals = {
  weightedPct: number
  forecast: number
  rec: number
  confirm: number
}

function parseFiniteNumberInput(rawValue: string): number | null {
  const trimmed = rawValue.trim()
  if (trimmed === '') return null

  const next = Number(trimmed)
  return Number.isFinite(next) ? next : null
}

export function clampWeightPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100))
}

export function getCompetitorWeightPct(selfWeightPct: number): number {
  return clampWeightPct(100 - selfWeightPct)
}

export function getSelfWeightPctFromCompetitorInput(competitorWeightPct: number): number {
  return clampWeightPct(100 - clampWeightPct(competitorWeightPct))
}

export function parseSelfWeightPctInput(rawValue: string): number | null {
  const next = parseFiniteNumberInput(rawValue)
  return next == null ? null : clampWeightPct(next)
}

export function parseSelfWeightPctFromCompetitorInput(rawValue: string): number | null {
  const next = parseFiniteNumberInput(rawValue)
  return next == null ? null : getSelfWeightPctFromCompetitorInput(next)
}

export function calculateSizeOrderColumnTotals(sizeRows: readonly SizeOrderRow[]): SizeOrderColumnTotals {
  return sizeRows.reduce<SizeOrderColumnTotals>(
    (totals, row) => ({
      weightedPct: totals.weightedPct + row.blendedSharePct,
      forecast: totals.forecast + row.forecastQty,
      rec: totals.rec + row.recommendedQty,
      confirm: totals.confirm + row.confirmQty,
    }),
    { weightedPct: 0, forecast: 0, rec: 0, confirm: 0 },
  )
}

export function parseConfirmQtyInput(rawValue: string): number | null {
  const next = parseFiniteNumberInput(rawValue)
  return next == null ? null : Math.max(0, next)
}

export function formatOptionalGroupedNumber(value: number | null | undefined): string {
  return value == null ? '-' : formatGroupedNumber(value)
}

export function formatSharePct(value: number): string {
  return formatRatioDecimalKo(value)
}
